import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';

export class AnthropicProvider extends LLMProvider {
  id: string = 'anthropic';
  private apiKey: string;
  private apiBase: string;

  constructor(apiKey: string, apiBase: string = 'https://api.anthropic.com/v1') {
    super();
    this.apiKey = apiKey;
    this.apiBase = apiBase;
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const model = options?.model || 'claude-3-opus-20240229';
    
    // Separate system message from others for Anthropic
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || ''
    }));

    const response = await fetch(`${this.apiBase}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: systemMessage?.content,
        messages: otherMessages,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        stream: options?.stream
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic Provider failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      model: data.model,
      content: data.content[0].text,
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      }
    };
  }
}
