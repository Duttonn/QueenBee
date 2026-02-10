import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import axios from 'axios';
import FormData from 'form-data';

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

  hasKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const model = options?.model || 'gpt-4';
    
    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = response.data;
      return {
        id: data.id,
        model: data.model,
        content: data.choices[0].message.content,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens,
          completion_tokens: data.usage?.completion_tokens,
          total_tokens: data.usage?.total_tokens
        }
      };
    } catch (error: any) {
      console.error(`[OpenAIProvider:${this.id}] Chat Error:`, error.response?.data || error.message);
      throw new Error(`[${this.id}] Chat failed (${this.baseUrl}): ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const model = options?.model || 'gpt-4';
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI stream failed: ${response.status} ${errorText}`);
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
        if (cleanedLine === 'data: [DONE]') break;
        
        try {
          const json = JSON.parse(cleanedLine.substring(6));
          const content = json.choices[0]?.delta?.content;
          if (content) {
            yield {
              id: json.id,
              model: json.model,
              content
            };
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  async transcribe(audioData: any): Promise<string> {
    try {
      const formData = new FormData();
      
      // In Node.js, we receive a Buffer. FormData requires a filename/options for Buffers.
      if (Buffer.isBuffer(audioData)) {
        formData.append('file', audioData, { filename: 'audio.webm', contentType: 'audio/webm' });
      } else {
        // Fallback for other types (streams etc)
        formData.append('file', audioData, 'audio.webm');
      }

      formData.append('model', 'whisper-1');

      // Check if this provider actually supports transcription (OpenAI base URL)
      // If it's a proxy or incompatible model, this might fail, but we assume OpenAI-compatible endpoint.
      const transcribeUrl = this.baseUrl.replace('/v1', '/v1/audio/transcriptions'); // Adjust if needed
      // Actually standard OpenAI is https://api.openai.com/v1/audio/transcriptions
      // this.baseUrl is usually https://api.openai.com/v1.
      
      const endpoint = `${this.baseUrl}/audio/transcriptions`;

      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data.text;
    } catch (error: any) {
      console.error('OpenAI Transcribe Error:', error.response?.data || error.message);
      throw new Error(`Transcription failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
