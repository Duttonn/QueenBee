import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';

/**
 * OllamaProvider
 *
 * Runs 100% locally — no API key, no data leaves your machine.
 * Supports: llama3.3, mistral, codellama, qwen2.5-coder, deepseek-coder,
 *           phi3, gemma3, nomic-embed-text, and anything else pulled via `ollama pull`.
 *
 * Prerequisites: install Ollama from https://ollama.com, then `ollama pull <model>`.
 *
 * Default endpoint: http://localhost:11434 (OpenAI-compatible /v1 API since Ollama 0.1.14)
 */
export class OllamaProvider extends LLMProvider {
  id = 'ollama';
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /** hasKey() is true when Ollama is reachable (checked lazily by sending a request). */
  hasKey(): boolean {
    return true; // no key needed; availability checked at call-time
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const model = options?.model || 'llama3.3';
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 404) {
        throw new Error(`[Ollama] Model '${model}' not found. Run: ollama pull ${model}`);
      }
      throw new Error(`[Ollama] ${res.status}: ${err}`);
    }

    const data = await res.json();
    return {
      id: data.id ?? `ollama-${Date.now()}`,
      model: data.model ?? model,
      content: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const model = options?.model || 'llama3.3';
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`[Ollama] Stream ${res.status}: ${err}`);
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
        const clean = line.trim();
        if (!clean.startsWith('data: ') || clean === 'data: [DONE]') continue;
        try {
          const json = JSON.parse(clean.slice(6));
          const text = json.choices?.[0]?.delta?.content;
          if (text) yield { id: json.id ?? '', model, content: text };
        } catch {}
      }
    }
  }

  /** List models available locally via `ollama list`. */
  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models ?? []).map((m: any) => m.name as string);
    } catch {
      return [];
    }
  }
}
