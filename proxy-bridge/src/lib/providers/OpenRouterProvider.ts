import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';

/**
 * OpenRouterProvider
 *
 * Single API key → access to 200+ models:
 *   Claude (Anthropic), GPT-4o / o3 (OpenAI), Gemini 2.5 (Google),
 *   Llama 3.3 (Meta), Mistral, DeepSeek-V3, Qwen, Grok, Command R+ (Cohere),
 *   and many free/open-weight models.
 *
 * Pricing: pay-per-use at cost, no markup for most models.
 * Free models available (e.g. meta-llama/llama-3.3-70b-instruct:free).
 *
 * OpenRouter is OpenAI-compatible, but we send the required HTTP-Referer
 * and X-Title headers for attribution tracking.
 */
export class OpenRouterProvider extends LLMProvider {
  id = 'openrouter';
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  hasKey(): boolean {
    return !!this.apiKey;
  }

  private buildHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://queenbee.dev',
      'X-Title': 'QueenBee',
    };
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const model = options?.model || 'openai/gpt-4o';
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
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
      throw new Error(`[OpenRouter] ${res.status}: ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      id: data.id,
      model: data.model ?? model,
      content: choice?.message?.content ?? '',
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
    const model = options?.model || 'openai/gpt-4o';
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
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
      throw new Error(`[OpenRouter] Stream ${res.status}: ${err}`);
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
          if (text) yield { id: json.id ?? '', model: json.model ?? model, content: text };
        } catch {}
      }
    }
  }
}
