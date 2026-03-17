import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * GeminiCliProvider
 *
 * Authenticates via Google OAuth (same client as google/gemini-cli) and calls
 * the Code Assist API (cloudcode-pa.googleapis.com) — the same backend gemini-cli
 * uses. This works with cloud-platform scope and unlocks the full subscription
 * model catalog including gemini-3.1-pro-preview, gemini-3-flash-preview, etc.
 *
 * Credential file: ~/.gemini/oauth_creds.json
 */

const OAUTH_CREDS_PATH = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
const CODE_ASSIST_BASE  = 'https://cloudcode-pa.googleapis.com/v1internal';

// OAuth client from the open-source google/gemini-cli npm package (public credentials)
const GEMINI_CLIENT_ID     = process.env.GEMINI_CLI_CLIENT_ID!;
const GEMINI_CLIENT_SECRET = process.env.GEMINI_CLI_OAUTH_CLIENT_SECRET!;

export class GeminiCliProvider extends LLMProvider {
  id = 'gemini-cli';
  private cachedToken:     { token: string; expiresAt: number } | null = null;
  private cachedProjectId: string | null = null;

  hasKey(): boolean {
    return fs.existsSync(OAUTH_CREDS_PATH);
  }

  private loadCreds(): { refreshToken: string; projectId?: string } {
    try {
      const raw   = fs.readFileSync(OAUTH_CREDS_PATH, 'utf-8');
      const creds = JSON.parse(raw);
      const refreshToken =
        creds.refresh_token || creds.refreshToken ||
        creds.token?.refresh_token || creds.token?.refreshToken;
      if (!refreshToken) throw new Error('No refresh_token found in ~/.gemini/oauth_creds.json');
      return { refreshToken, projectId: creds.project_id || creds.projectId };
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
    const client = new OAuth2Client(GEMINI_CLIENT_ID, GEMINI_CLIENT_SECRET);
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) throw new Error('[GeminiCLI] Failed to refresh access token');
    this.cachedToken = { token: credentials.access_token, expiresAt: credentials.expiry_date ?? now + 3_600_000 };
    return this.cachedToken.token;
  }

  /** Discover the Google Cloud project linked to this account via Code Assist API. */
  private async getProjectId(token: string): Promise<string> {
    // Check creds file first, then memory cache
    const { projectId: storedId } = this.loadCreds();
    if (storedId) return storedId;
    if (this.cachedProjectId) return this.cachedProjectId;

    const res  = await fetch(`${CODE_ASSIST_BASE}:loadCodeAssist`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ metadata: { ideType: 'GEMINI_CLI', pluginType: 'GEMINI' } }),
    });
    if (!res.ok) throw new Error(`[GeminiCLI] loadCodeAssist failed: ${res.status}`);
    const data = await res.json() as any;
    const p    = data.cloudaicompanionProject;
    const id   = typeof p === 'string' ? p : (p?.id as string | undefined);
    if (!id) throw new Error('[GeminiCLI] No project ID returned from loadCodeAssist');
    this.cachedProjectId = id;
    return id;
  }

  private toContents(messages: LLMMessage[]): any[] {
    const contents: any[] = [];
    for (const m of messages) {
      if (m.role === 'system') continue;

      if (m.role === 'tool') {
        let responseObj: any;
        try { responseObj = JSON.parse(m.content as string); } catch { responseObj = { output: m.content }; }
        const part = { functionResponse: { name: (m as any).name || 'tool', response: responseObj } };
        const last = contents[contents.length - 1];
        if (last && last.role === 'user') { last.parts.push(part); }
        else { contents.push({ role: 'user', parts: [part] }); }
        continue;
      }

      if (m.role === 'assistant') {
        const parts: any[] = [];
        const text = typeof m.content === 'string' ? m.content.trim() : '';
        if (text) parts.push({ text });
        if (m.tool_calls?.length) {
          for (const tc of m.tool_calls) {
            let args: any = {};
            try { args = JSON.parse(tc.function.arguments); } catch {}
            parts.push({ functionCall: { name: tc.function.name, args } });
          }
        }
        if (parts.length === 0) continue;
        contents.push({ role: 'model', parts });
        continue;
      }

      const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      if (!text.trim()) continue;
      const last = contents[contents.length - 1];
      if (last && last.role === 'user') { last.parts.push({ text }); }
      else { contents.push({ role: 'user', parts: [{ text }] }); }
    }
    return contents;
  }

  private extractSystemInstruction(messages: LLMMessage[]): string | undefined {
    const sys = messages.find(m => m.role === 'system');
    if (!sys) return undefined;
    return typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content);
  }

  private buildRequest(messages: LLMMessage[], options?: LLMProviderOptions): any {
    const req: any = {
      contents:         this.toContents(messages),
      generationConfig: {
        ...(options?.maxTokens    ? { maxOutputTokens: options.maxTokens }    : {}),
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      },
    };
    const sys = this.extractSystemInstruction(messages);
    if (sys) req.systemInstruction = { parts: [{ text: sys }] };
    return req;
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const token     = await this.getAccessToken();
    const project   = await this.getProjectId(token);
    const model     = options?.model || 'gemini-2.5-pro';

    const res = await fetch(`${CODE_ASSIST_BASE}:generateContent`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, project, request: this.buildRequest(messages, options) }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[GeminiCLI] API error ${res.status}: ${errText}`);
    }

    const data    = await res.json() as any;
    const inner   = data.response ?? data; // response is nested inside { response: ... }
    const content = inner.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      ?.map((p: any) => p.text as string)
      .join('') ?? '';
    const usage = inner.usageMetadata;

    return {
      id:    `gemini-cli-${Date.now()}`,
      model,
      content,
      usage: usage ? {
        prompt_tokens:     usage.promptTokenCount     ?? 0,
        completion_tokens: usage.candidatesTokenCount ?? 0,
        total_tokens:      usage.totalTokenCount      ?? 0,
      } : undefined,
    };
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const token   = await this.getAccessToken();
    const project = await this.getProjectId(token);
    const model   = options?.model || 'gemini-2.5-pro';

    const res = await fetch(`${CODE_ASSIST_BASE}:streamGenerateContent`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, project, request: this.buildRequest(messages, options) }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`[GeminiCLI] Stream error ${res.status}: ${errText}`);
    }

    // Response is a JSON array streamed line-by-line: [{...},\n{...},\n]
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line === '[' || line === ']') continue;
        const json = line.endsWith(',') ? line.slice(0, -1) : line;
        try {
          const chunk = JSON.parse(json) as any;
          if (chunk.error) throw new Error(`[GeminiCLI] Stream error: ${JSON.stringify(chunk.error)}`);
          const inner = chunk.response ?? chunk;
          const text  = inner.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.text)
            ?.map((p: any) => p.text as string)
            .join('') ?? '';
          if (text) yield { id: `gemini-cli-stream-${Date.now()}`, model, content: text };
        } catch (e: any) {
          if (e.message.startsWith('[GeminiCLI]')) throw e;
        }
      }
    }
  }
}
