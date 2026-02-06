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

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const model = options?.model || 'claude-3-opus-20240229';
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
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic streaming failed: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        try {
          const json = JSON.parse(trimmed.slice(6));
          if (json.type === 'content_block_delta' && json.delta?.text) {
            yield {
              id: 'anthropic-stream', // Anthropic gives message_start with ID, but we can simplify
              model: model,
              content: json.delta.text
            };
          }
        } catch (e) {
          console.error('Error parsing Anthropic streaming chunk:', e);
        }
      }
    }
  }
}
