import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse, LLMToolCall } from '../types/llm';

export class GeminiProvider extends LLMProvider {
  id: string = 'gemini';
  private apiKey: string;
  private discoveredModel: string | null = null;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  private async getOrDiscoverModel(requestedModel?: string): Promise<string> {
    if (requestedModel) return requestedModel;
    if (this.discoveredModel) return this.discoveredModel;

    console.log('[GeminiProvider] Discovering available models...');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = await response.json();
      // Filter for models that support generateContent
      const models = data.models || [];
      const chatModels = models.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
      
      if (chatModels.length > 0) {
        // Use the first available chat model
        const firstModel = chatModels[0].name.replace('models/', '');
        console.log(`[GeminiProvider] Discovered default model: ${firstModel}`);
        this.discoveredModel = firstModel;
        return firstModel;
      }
    } catch (error) {
      console.error('[GeminiProvider] Model discovery failed:', error);
    }

    throw new Error('No valid Gemini models found and no model specified.');
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const finalModel = await this.getOrDiscoverModel(options?.model);

    // Map messages to Gemini format
    const geminiMessages = messages.map((m) => {
      const parts: any[] = [];

      if (m.content) {
        parts.push({ text: m.content });
      }

      if (m.tool_calls) {
        m.tool_calls.forEach(tc => {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments)
            }
          });
        });
      }

      if (m.role === 'tool') {
        const contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        let contentObj;
        try {
          contentObj = JSON.parse(contentStr);
        } catch {
          contentObj = { result: contentStr };
        }

        return {
          role: 'function',
          parts: [{
            functionResponse: {
              name: m.name,
              response: { result: contentObj }
            }
          }]
        };
      }

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    // Map tools to Gemini format
    const geminiTools = options?.tools ? [
      {
        functionDeclarations: options.tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters
        }))
      }
    ] : undefined;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        tools: geminiTools,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 4096,
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errBody}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content;

    let text = '';
    const toolCalls: LLMToolCall[] = [];

    if (content?.parts) {
      for (const part of content.parts) {
        if (part.text) {
          text += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Math.random().toString(36).substring(7)}`,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args)
            }
          });
        }
      }
    }

    return {
      id: `gemini-${Date.now()}`,
      model: finalModel,
      content: text || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const finalModel = await this.getOrDiscoverModel(options?.model);

    const geminiMessages = messages.map((m) => {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.tool_calls) {
        m.tool_calls.forEach(tc => {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments)
            }
          });
        });
      }
      if (m.role === 'tool') {
        const contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        let contentObj;
        try {
          contentObj = JSON.parse(contentStr);
        } catch {
          contentObj = { result: contentStr };
        }
        return {
          role: 'function',
          parts: [{
            functionResponse: {
              name: m.name,
              response: { result: contentObj }
            }
          }]
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    // Map tools to Gemini format
    const geminiTools = options?.tools ? [
      {
        functionDeclarations: options.tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters
        }))
      }
    ] : undefined;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:streamGenerateContent?alt=sse&key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        tools: geminiTools,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 4096,
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini streaming error: ${response.status} ${errBody}`);
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
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            yield {
              id: `gemini-${Date.now()}`,
              model: finalModel,
              content: text
            };
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}
