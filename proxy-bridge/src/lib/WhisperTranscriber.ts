import axios from 'axios';
import fs from 'fs-extra';
import FormData from 'form-data';

/**
 * WhisperTranscriber: Handles audio-to-text for Queen Bee voice prompts.
 */
export class WhisperTranscriber {
  private apiKey = process.env.OPENAI_API_KEY;

  async transcribe(audioPath: string): Promise<string> {
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file not found');
    }

    console.log(`[Whisper] Transcribing: ${audioPath}`);
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    form.append('model', 'whisper-1');

    try {
      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.data.text;
    } catch (error: any) {
      console.error('[Whisper] API Error:', error.response?.data || error.message);
      return '';
    }
  }
}
