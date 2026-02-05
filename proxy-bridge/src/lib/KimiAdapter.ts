import axios from 'axios';

export class KimiAdapter {
  private apiKey = process.env.KIMI_API_KEY;

  async chat(messages: any[]) {
    const response = await axios.post('https://api.moonshot.cn/v1/chat/completions', {
      model: 'moonshot-v1-8k',
      messages,
      temperature: 0.3
    }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }
}
