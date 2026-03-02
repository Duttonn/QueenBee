import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * GeminiCliProvider
 *
 * Uses the Google OAuth credentials stored by `gemini auth` (Gemini CLI).
 * Lets you power QueenBee with a Google One / Google AI Pro subscription —
 * no separate API key needed.
 *
 * Credential file: ~/.gemini/oauth_creds.json
 * API: https://generativelanguage.googleapis.com/v1beta  (standard Gemini REST)
 *
 * Compatible models: gemini-2.5-pro, gemini-2.0-flash, gemini-1.5-pro, etc.
 *
 * Note: Uses the Gemini CLI OAuth client (the same one google/gemini-cli uses).
 * This is the same pattern used by opencode-gemini-auth and similar open-source tools.
 */

const OAUTH_CREDS_PATH = path.join(os.homedir(), '.gemini', 'oauth_creds.json');

// Gemini CLI OAuth client ID (same as google/gemini-cli open-source project)
const GEMINI_CLI_CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';

export class GeminiCliProvider extends LLMProvider {
  id = 'gemini-cli';
  private cachedToken: { token: string; expiresAt: number } | null = null;

  hasKey(): boolean {
    return fs.existsSync(OAUTH_CREDS_PATH);
  }

  private loadCreds(): { refreshToken: string } {
    try {
      const raw = fs.readFileSync(OAUTH_CREDS_PATH, 'utf-8');
      const creds = JSON.parse(raw);
      // oauth_creds.json can have different shapes depending on gemini-cli version
      const refreshToken =
        creds.refresh_token ||
        creds.refreshToken ||
        creds.token?.refresh_token ||
        creds.token?.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh_token found in ~/.gemini/oauth_creds.json');
      }
      return { refreshToken };
    } catch (err: any) {
      throw new Error(`[GeminiCLI] Failed to read credentials: ${err.message}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.token;
    }

    const { OAuth2Client } = await import('google-auth-library');
    const { refreshToken } = this.loadCreds();

    const client = new OAuth2Client(GEMINI_CLI_CLIENT_ID);
    client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error('[GeminiCLI] Failed to refresh access token');
    }

    this.cachedToken = {
      token: credentials.access_token,
      expiresAt: credentials.expiry_date ?? now + 3_600_000,
    };
    return this.cachedToken.token;
  }

  private toGeminiContents(messages: LLMMessage[]): any[] {
    // Gemini uses "user" / "model" roles, no "system" in contents
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      }));
  }

  private extractSystemInstruction(messages: LLMMessage[]): string | undefined {
    const sys = messages.find(m => m.role === 'system');
    if (!sys) return undefined;
    return typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content);
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const token = await this.getAccessToken();
    const model = options?.model || 'gemini-2.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body: any = {
      contents: this.toGeminiContents(messages),
      generationConfig: {
        ...(options?.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      },
    };

    const systemInstruction = this.extractSystemInstruction(messages);
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[GeminiCLI] API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    const usage = data.usageMetadata;

    return {
      id: `gemini-cli-${Date.now()}`,
      model,
      content,
      usage: usage
        ? {
            prompt_tokens: usage.promptTokenCount ?? 0,
            completion_tokens: usage.candidatesTokenCount ?? 0,
            total_tokens: usage.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const token = await this.getAccessToken();
    const model = options?.model || 'gemini-2.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

    const body: any = {
      contents: this.toGeminiContents(messages),
      generationConfig: {
        ...(options?.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      },
    };

    const systemInstruction = this.extractSystemInstruction(messages);
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`[GeminiCLI] Stream error ${res.status}: ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
          if (text) {
            yield { id: `gemini-cli-${Date.now()}`, model, content: text };
          }
        } catch {}
      }
    }
  }
}
