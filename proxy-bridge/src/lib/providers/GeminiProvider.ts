import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse, LLMToolCall } from '../types/llm';

export class GeminiProvider extends LLMProvider {
  id: string = 'gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

    async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
      const geminiModel = options?.model || 'gemini-1.5-flash';
  
      // Antigravity fallback (special case for borrowed IDs if no specific model selected)    let finalModel = geminiModel;
    if (finalModel === 'antigravity-1') {
      finalModel = 'gemini-1.5-pro';
    }
    
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
        return {
          role: 'function',
          parts: [{
            functionResponse: {
              name: m.name,
              response: { result: m.content }
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
        function_declarations: options.tools.map(t => ({
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
    const geminiModel = options?.model || 'gemini-1.5-flash';
    let finalModel = geminiModel;
    if (finalModel === 'antigravity-1') finalModel = 'gemini-1.5-pro';

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
        return {
          role: 'function',
          parts: [{
            functionResponse: {
              name: m.name,
              response: { result: m.content }
            }
          }]
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:streamGenerateContent?alt=sse&key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
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