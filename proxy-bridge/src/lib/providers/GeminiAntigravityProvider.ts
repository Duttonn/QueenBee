import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * GeminiAntigravityProvider
 *
 * Accesses Gemini AND Claude models via Google's Code Assist API using dedicated
 * Antigravity OAuth credentials (different from Gemini CLI). Mirrors the exact
 * approach of @mariozechner/pi-ai's google-antigravity provider.
 *
 * All models (Gemini + Claude) use the same endpoint: v1internal:streamGenerateContent
 * The difference vs gemini-cli: different OAuth creds, different headers, sandbox fallback.
 *
 * Credentials stored at: ~/.gemini/queenbee_antigravity_creds.json
 */

const CREDS_PATH = path.join(os.homedir(), '.gemini', 'queenbee_antigravity_creds.json');

// Antigravity has its OWN OAuth credentials, distinct from Gemini CLI.
// These are from the @mariozechner/pi-ai package (publicly distributed).
const ANTIGRAVITY_CLIENT_ID     = process.env.ANTIGRAVITY_CLIENT_ID!;
const ANTIGRAVITY_CLIENT_SECRET = process.env.ANTIGRAVITY_CLIENT_SECRET!;

// Endpoint fallback order: prod first (most reliable), sandbox as fallbacks
const ANTIGRAVITY_ENDPOINTS = [
  'https://cloudcode-pa.googleapis.com',
  'https://daily-cloudcode-pa.sandbox.googleapis.com',
  'https://autopush-cloudcode-pa.sandbox.googleapis.com',
];

// Antigravity-specific headers (different from Gemini CLI)
const ANTIGRAVITY_VERSION = '1.18.4';
const ANTIGRAVITY_HEADERS = {
  'User-Agent': `antigravity/${ANTIGRAVITY_VERSION} darwin/arm64`,
};

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
    const { refreshToken } = this.loadCreds();
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[GeminiAntigravity] Token refresh failed: ${err}`);
    }
    const data = await res.json() as any;
    if (!data.access_token) throw new Error('[GeminiAntigravity] No access_token in refresh response');
    this.cachedToken = {
      token:     data.access_token,
      expiresAt: data.expires_in ? now + data.expires_in * 1000 - 300_000 : now + 3_600_000,
    };
    return this.cachedToken.token;
  }

  private async getProjectId(token: string): Promise<string> {
    const { projectId: storedId } = this.loadCreds();
    if (storedId) return storedId;
    if (this.cachedProjectId) return this.cachedProjectId;

    // Try each endpoint to discover project
    for (const endpoint of ANTIGRAVITY_ENDPOINTS) {
      try {
        const res = await fetch(`${endpoint}/v1internal:loadCodeAssist`, {
          method:  'POST',
          headers: {
            'Authorization':  `Bearer ${token}`,
            'Content-Type':   'application/json',
            'User-Agent':     'google-api-nodejs-client/9.15.1',
            'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
            'Client-Metadata': JSON.stringify({ ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' }),
          },
          body: JSON.stringify({ metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' } }),
        });
        if (res.ok) {
          const data = await res.json() as any;
          const p = data.cloudaicompanionProject;
          const id = typeof p === 'string' ? p : (p?.id as string | undefined);
          if (id) { this.cachedProjectId = id; return id; }
        }
      } catch { /* try next */ }
    }
    // Fallback project ID (from pi-ai package)
    const fallback = 'rising-fact-p41fc';
    this.cachedProjectId = fallback;
    return fallback;
  }

  private toContents(messages: LLMMessage[]): any[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      }));
  }

  private buildAntigravityRequest(messages: LLMMessage[], model: string, projectId: string, options?: LLMProviderOptions): any {
    const contents = this.toContents(messages);
    const request: any = { contents };

    const sys = messages.find(m => m.role === 'system');
    const sysText = sys ? (typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content)) : undefined;

    const generationConfig: any = {};
    if (options?.maxTokens)        generationConfig.maxOutputTokens = options.maxTokens;
    if (options?.temperature != null) generationConfig.temperature = options.temperature;
    if (Object.keys(generationConfig).length > 0) request.generationConfig = generationConfig;

    // Antigravity prepends its own system instruction
    const ANTIGRAVITY_SYS = 'You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.';
    request.systemInstruction = {
      role:  'user',
      parts: [
        { text: ANTIGRAVITY_SYS },
        { text: `Please ignore following [ignore]${ANTIGRAVITY_SYS}[/ignore]` },
        ...(sysText ? [{ text: sysText }] : []),
      ],
    };

    return {
      project:     projectId,
      model,
      request,
      requestType: 'agent',
      userAgent:   'antigravity',
      requestId:   `agent-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    };
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const model   = options?.model || 'gemini-2.5-flash';
    const token   = await this.getAccessToken();
    const project = await this.getProjectId(token);

    console.log(`[GeminiAntigravity] chat model=${model} project=${project}`);

    const body    = this.buildAntigravityRequest(messages, model, project, options);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      ...ANTIGRAVITY_HEADERS,
    };

    // Try endpoints in fallback order
    let lastErr: Error = new Error('All endpoints failed');
    for (const endpoint of ANTIGRAVITY_ENDPOINTS) {
      try {
        const res = await fetch(`${endpoint}/v1internal:generateContent`, {
          method: 'POST', headers, body: JSON.stringify(body),
        });
        if (res.status === 403 || res.status === 404) continue; // try next
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`[GeminiAntigravity] API error ${res.status} (model=${model}): ${errText}`);
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
      } catch (e: any) {
        if (e.message?.startsWith('[GeminiAntigravity]')) throw e;
        lastErr = e;
      }
    }
    throw lastErr;
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const model   = options?.model || 'gemini-2.5-flash';
    const token   = await this.getAccessToken();
    const project = await this.getProjectId(token);

    const body    = this.buildAntigravityRequest(messages, model, project, options);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Accept':        'text/event-stream',
      ...ANTIGRAVITY_HEADERS,
    };

    let res: Response | null = null;
    for (const endpoint of ANTIGRAVITY_ENDPOINTS) {
      const r = await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (r.status === 403 || r.status === 404) continue;
      res = r;
      break;
    }

    if (!res || !res.ok || !res.body) {
      const errText = res ? await res.text() : 'All endpoints failed';
      throw new Error(`[GeminiAntigravity] Stream error: ${errText}`);
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

      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr) as any;
          const inner = chunk.response ?? chunk;
          const text  = inner.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.text)
            ?.map((p: any) => p.text as string)
            .join('') ?? '';
          if (text) yield { id: `gemini-antigravity-stream-${Date.now()}`, model, content: text };
        } catch { /* skip malformed */ }
      }
    }
  }
}
