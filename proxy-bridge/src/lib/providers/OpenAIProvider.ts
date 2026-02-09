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
// ... existing chat and chatStream methods ...
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
