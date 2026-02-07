import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';

export class AnthropicProvider extends LLMProvider {
  id: string = 'anthropic';
  private apiKey: string;
  private apiBase: string;
  private discoveredModel: string | null = null;

  constructor(apiKey: string, apiBase: string = 'https://api.anthropic.com/v1') {
    super();
    this.apiKey = apiKey;
    this.apiBase = apiBase;
  }

  private async getOrDiscoverModel(requestedModel?: string): Promise<string> {
    if (requestedModel && !requestedModel.includes('gpt') && !requestedModel.includes('gemini')) {
      return requestedModel;
    }
    
    if (this.discoveredModel) return this.discoveredModel;

    // Anthropic Model Discovery (Experimental / Fallback)
    // As of now, Anthropic's /v1/models requires specific headers.
    // If it fails, we use a prioritized list.
    const priorities = [
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    try {
        const response = await fetch(`${this.apiBase}/models`, {
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                const firstModel = data.data[0].id;
                this.discoveredModel = firstModel;
                return firstModel;
            }
        }
    } catch (e) {
        // Fallback to priority list
    }

    this.discoveredModel = priorities[0];
    return priorities[0];
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const model = await this.getOrDiscoverModel(options?.model);
    
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
    const model = await this.getOrDiscoverModel(options?.model);
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
        const cleanedLine = line.trim();
        if (!cleanedLine.startsWith('data: ')) continue;
        
        try {
          const json = JSON.parse(cleanedLine.substring(6));
          if (json.type === 'content_block_delta' && json.delta?.text) {
            yield {
              id: 'stream',
              model,
              content: json.delta.text
            };
          }
        } catch (e) {
          // Ignore parse errors for non-JSON lines
        }
      }
    }
  }
}