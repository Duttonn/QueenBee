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
    let model = options?.model;
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

  async transcribe(audioData: any): Promise<string> {
    const formData = new FormData();
    
    // In Node.js, we might receive a Buffer. Convert it to a Blob for FormData.
    let fileItem: any = audioData;
    if (Buffer.isBuffer(audioData)) {
      fileItem = new Blob([audioData], { type: 'audio/webm' });
    }

    formData.append('file', fileItem, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Transcription failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.text;
  }
}
