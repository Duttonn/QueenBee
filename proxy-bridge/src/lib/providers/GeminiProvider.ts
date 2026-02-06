import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';

export class GeminiProvider extends LLMProvider {
  id: string = 'gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const geminiModel = options?.model || 'gemini-1.5-flash';
    
    // Antigravity fallback (special case for borrowed IDs if no specific model selected)
    let finalModel = geminiModel;
    if (finalModel === 'antigravity-1') {
      finalModel = 'gemini-1.5-pro';
    }
    
    // Map messages to Gemini format
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errBody}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      id: `gemini-${Date.now()}`,
      model: finalModel,
      content: text,
      usage: {
        prompt_tokens: 0, // Gemini returns usage but it needs mapping if we care
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const geminiModel = options?.model || 'gemini-1.5-flash';
    let finalModel = geminiModel;
    if (finalModel === 'antigravity-1') {
      finalModel = 'gemini-1.5-pro';
    }
    
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:streamGenerateContent?alt=sse&key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
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
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        try {
          const json = JSON.parse(trimmed.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            yield {
              id: `gemini-${Date.now()}`,
              model: finalModel,
              content: text
            };
          }
        } catch (e) {
          console.error('Error parsing Gemini streaming chunk:', e);
        }
      }
    }
  }
}
