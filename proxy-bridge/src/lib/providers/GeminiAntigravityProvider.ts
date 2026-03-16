import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * GeminiAntigravityProvider
 *
 * Free-tier Gemini access via Google account OAuth — no API key or CLI install required.
 * Uses the "antigravity" project provisioning flow (same as the gemini-cli free tier).
 *
 * Credentials are stored by the /api/auth/cli-login endpoint at:
 *   ~/.gemini/queenbee_antigravity_creds.json
 *
 * This provider uses the standard Gemini REST API with the provisioned project attached
 * via the X-Goog-User-Project header.
 */

const CREDS_PATH = path.join(os.homedir(), '.gemini', 'queenbee_antigravity_creds.json');

// Known client ID for the google/gemini-cli OAuth client
const CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';

export class GeminiAntigravityProvider extends LLMProvider {
  id = 'gemini-antigravity';
  private cachedToken: { token: string; expiresAt: number } | null = null;

  hasKey(): boolean {
    return fs.existsSync(CREDS_PATH);
  }

  private loadCreds(): { refreshToken: string; projectId?: string } {
    try {
      const raw   = fs.readFileSync(CREDS_PATH, 'utf-8');
      const creds = JSON.parse(raw);
      const refreshToken =
        creds.refresh_token || creds.refreshToken ||
        creds.token?.refresh_token || creds.token?.refreshToken;
      if (!refreshToken) throw new Error('No refresh_token in antigravity credentials');
      return { refreshToken, projectId: creds.project_id || creds.projectId };
    } catch (err: any) {
      throw new Error(`[GeminiAntigravity] Failed to read credentials: ${err.message}`);
    }
  }

  private async getAccessToken(): Promise<{ token: string; projectId?: string }> {
    const now = Date.now();
    const { refreshToken, projectId } = this.loadCreds();

    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return { token: this.cachedToken.token, projectId };
    }

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(CLIENT_ID);
    client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error('[GeminiAntigravity] Failed to refresh access token');
    }

    this.cachedToken = {
      token:     credentials.access_token,
      expiresAt: credentials.expiry_date ?? now + 3_600_000,
    };
    return { token: this.cachedToken.token, projectId };
  }

  private toGeminiContents(messages: LLMMessage[]): any[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      }));
  }

  private extractSystemInstruction(messages: LLMMessage[]): string | undefined {
    const sys = messages.find(m => m.role === 'system');
    if (!sys) return undefined;
    return typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content);
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const { token, projectId } = await this.getAccessToken();
    const model = options?.model || 'gemini-2.5-flash';
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const headers: Record<string, string> = {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (projectId) headers['X-Goog-User-Project'] = projectId;

    const body: any = {
      contents: this.toGeminiContents(messages),
      generationConfig: {
        ...(options?.maxTokens    ? { maxOutputTokens: options.maxTokens }    : {}),
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      },
    };

    const systemInstruction = this.extractSystemInstruction(messages);
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[GeminiAntigravity] API error ${res.status}: ${errText}`);
    }

    const data    = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    const usage   = data.usageMetadata;

    return {
      id:    `gemini-antigravity-${Date.now()}`,
      model,
      content,
      usage: usage
        ? {
            prompt_tokens:     usage.promptTokenCount     ?? 0,
            completion_tokens: usage.candidatesTokenCount ?? 0,
            total_tokens:      usage.totalTokenCount      ?? 0,
          }
        : undefined,
    };
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const { token, projectId } = await this.getAccessToken();
    const model = options?.model || 'gemini-2.5-flash';
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

    const headers: Record<string, string> = {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (projectId) headers['X-Goog-User-Project'] = projectId;

    const body: any = {
      contents: this.toGeminiContents(messages),
      generationConfig: {
        ...(options?.maxTokens    ? { maxOutputTokens: options.maxTokens }    : {}),
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      },
    };

    const systemInstruction = this.extractSystemInstruction(messages);
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`[GeminiAntigravity] Stream error ${res.status}: ${errText}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

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
          if (text) yield { id: `gemini-antigravity-${Date.now()}`, model, content: text };
        } catch {}
      }
    }
  }
}
