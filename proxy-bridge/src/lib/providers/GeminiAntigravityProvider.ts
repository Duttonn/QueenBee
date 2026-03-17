import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * GeminiAntigravityProvider
 *
 * Free-tier Gemini access via Google account OAuth — no API key or CLI install required.
 * Uses the Code Assist API (cloudcode-pa.googleapis.com) which works with cloud-platform
 * scope and provides access to the full Gemini model catalog.
 *
 * Credentials stored at: ~/.gemini/queenbee_antigravity_creds.json
 */

const CREDS_PATH       = path.join(os.homedir(), '.gemini', 'queenbee_antigravity_creds.json');
const CODE_ASSIST_BASE = 'https://cloudcode-pa.googleapis.com/v1internal';

// OAuth client from the open-source google/gemini-cli npm package (public credentials)
const GEMINI_CLIENT_ID     = process.env.GEMINI_CLI_CLIENT_ID!;
const GEMINI_CLIENT_SECRET = process.env.GEMINI_CLI_OAUTH_CLIENT_SECRET!;

export class GeminiAntigravityProvider extends LLMProvider {
  id = 'gemini-antigravity';
  private cachedToken:     { token: string; expiresAt: number } | null = null;
  private cachedProjectId: string | null = null;

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
    if (!credentials.access_token) throw new Error('[GeminiAntigravity] Failed to refresh access token');
    this.cachedToken = { token: credentials.access_token, expiresAt: credentials.expiry_date ?? now + 3_600_000 };
    return this.cachedToken.token;
  }

  /** Discover the provisioned Google Cloud project via Code Assist API. */
  private async getProjectId(token: string): Promise<string> {
    const { projectId: storedId } = this.loadCreds();
    if (storedId) return storedId;
    if (this.cachedProjectId) return this.cachedProjectId;

    const res  = await fetch(`${CODE_ASSIST_BASE}:loadCodeAssist`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ metadata: { ideType: 'ANTIGRAVITY', pluginType: 'GEMINI' } }),
    });
    if (!res.ok) throw new Error(`[GeminiAntigravity] loadCodeAssist failed: ${res.status}`);
    const data = await res.json() as any;
    const p    = data.cloudaicompanionProject;
    const id   = typeof p === 'string' ? p : (p?.id as string | undefined);
    if (!id) throw new Error('[GeminiAntigravity] No project ID returned from loadCodeAssist');
    this.cachedProjectId = id;
    return id;
  }

  private toContents(messages: LLMMessage[]): any[] {
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
    const token   = await this.getAccessToken();
    const project = await this.getProjectId(token);
    const model   = options?.model || 'gemini-2.5-flash';

    console.log(`[GeminiAntigravity] chat model=${model} project=${project}`);
    const res = await fetch(`${CODE_ASSIST_BASE}:generateContent`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, project, request: this.buildRequest(messages, options) }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[GeminiAntigravity] API error ${res.status} (model=${model} project=${project}): ${errText}`);
    }

    const data    = await res.json() as any;
    const inner   = data.response ?? data;
    const content = inner.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      ?.map((p: any) => p.text as string)
      .join('') ?? '';
    const usage = inner.usageMetadata;

    return {
      id:    `gemini-antigravity-${Date.now()}`,
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
    const model   = options?.model || 'gemini-2.5-flash';

    const res = await fetch(`${CODE_ASSIST_BASE}:streamGenerateContent`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, project, request: this.buildRequest(messages, options) }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`[GeminiAntigravity] Stream error ${res.status}: ${errText}`);
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
          if (chunk.error) throw new Error(`[GeminiAntigravity] Stream error: ${JSON.stringify(chunk.error)}`);
          const inner = chunk.response ?? chunk;
          const text  = inner.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.text)
            ?.map((p: any) => p.text as string)
            .join('') ?? '';
          if (text) yield { id: `gemini-antigravity-stream-${Date.now()}`, model, content: text };
        } catch (e: any) {
          if (e.message.startsWith('[GeminiAntigravity]')) throw e;
        }
      }
    }
  }
}
