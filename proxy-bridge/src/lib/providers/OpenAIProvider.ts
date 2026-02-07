import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';

export class OpenAIProvider extends LLMProvider {
  id: string;
  private apiKey: string;
  private baseUrl: string;
  private discoveredModel: string | null = null;

  constructor(id: string, apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    super();
    this.id = id;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async getOrDiscoverModel(requestedModel?: string): Promise<string> {
    if (requestedModel) {
      // Safety: check if model belongs to another provider
      if (requestedModel.includes('gemini') || requestedModel.includes('claude')) {
         // Fallthrough to discovery
      } else {
        return requestedModel;
      }
    }
    
    if (this.discoveredModel) return this.discoveredModel;

    console.log(`[OpenAIProvider:${this.id}] Discovering available models at ${this.baseUrl}...`);
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];
        
        if (models.length > 0) {
          // Sort or filter models to find a good default
          // For OpenAI: prefer gpt-4o, gpt-4-turbo, gpt-3.5-turbo
          // For Others: just take the first one
          let bestModel = models[0].id;
          
          if (this.baseUrl.includes('openai.com')) {
            const priorities = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
            for (const p of priorities) {
              if (models.find((m: any) => m.id === p)) {
                bestModel = p;
                break;
              }
            }
          } else if (this.baseUrl.includes('11434')) { // Ollama
            const priorities = ['llama3', 'mistral', 'codellama'];
             for (const p of priorities) {
              if (models.find((m: any) => m.id.startsWith(p))) {
                bestModel = models.find((m: any) => m.id.startsWith(p)).id;
                break;
              }
            }
          }

          console.log(`[OpenAIProvider:${this.id}] Discovered default model: ${bestModel}`);
          this.discoveredModel = bestModel;
          return bestModel;
        }
      }
    } catch (error) {
      console.error(`[OpenAIProvider:${this.id}] Model discovery failed:`, error);
    }

    // Ultimate fallbacks if discovery fails
    if (this.baseUrl.includes('nvidia')) return 'moonshotai/kimi-k2.5';
    if (this.baseUrl.includes('11434')) return 'llama3';
    return 'gpt-4o';
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const model = await this.getOrDiscoverModel(options?.model);

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
        tools: options?.tools,
        tool_choice: options?.tools ? 'auto' : undefined,
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

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const model = await this.getOrDiscoverModel(options?.model);

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
        stream: true,
        stop: options?.stop,
        response_format: options?.response_format,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Provider (${this.id}) streaming failed: ${response.status} ${errorText}`);
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
        if (!cleanedLine || cleanedLine === 'data: [DONE]') continue;
        if (cleanedLine.startsWith('data: ')) {
          try {
            const json = JSON.parse(cleanedLine.substring(6));
            if (json.choices?.[0]?.delta) {
              yield {
                id: json.id,
                model: json.model,
                content: json.choices[0].delta.content || '',
                tool_calls: json.choices[0].delta.tool_calls,
                finish_reason: json.choices[0].finish_reason,
              };
            }
          } catch (e) {
            console.error('Error parsing streaming chunk:', e);
          }
        }
      }
    }
  }
}