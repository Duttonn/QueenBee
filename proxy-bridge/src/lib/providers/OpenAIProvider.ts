import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';

export class OpenAIProvider extends LLMProvider {
  id: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(id: string, apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    super();
    this.id = id;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    // Determine the best model to use
    let model = options?.model;
    
    // Safety: If model is missing or looks like it belongs to another provider (e.g. gemini), use a safe default
    const isNvidia = this.baseUrl.includes('nvidia');
    const isOllama = this.baseUrl.includes('11434');
    
    if (!model || model.includes('gemini') || model.includes('claude')) {
      if (isNvidia) model = 'moonshotai/kimi-k2.5';
      else if (isOllama) model = 'llama3';
      else model = 'gpt-4o';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        stream: options?.stream,
        stop: options?.stop,
        response_format: options?.response_format,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Provider (${this.id}) failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      model: data.model,
      content: data.choices[0].message.content,
      tool_calls: data.choices[0].message.tool_calls,
      usage: data.usage,
      finish_reason: data.choices[0].finish_reason,
    };
  }
}
