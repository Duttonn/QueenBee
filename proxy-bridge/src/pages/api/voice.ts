import type { NextApiRequest, NextApiResponse } from 'next';
import { unifiedLLMService } from '../../lib/UnifiedLLMService';
import { logger } from '../../lib/logger';

export const config = {
  api: {
    bodyParser: false, // Disable default bodyParser to handle binary audio data
  },
};

/**
 * Voice API for Whisper transcription
 * Receives raw audio data and returns transcribed text
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const providerId = (req.headers['x-codex-provider'] as string) || 'auto';
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || null;

  try {
    // Read raw body buffer
    const chunks: any[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Audio data is empty' });
    }

    logger.info(`[Voice] Transcription request received. Provider: ${providerId}, Buffer Size: ${audioBuffer.length} bytes`);

    // Call UnifiedLLMService for transcription
    const result = await unifiedLLMService.transcribe(providerId, audioBuffer, { apiKey });

    return res.status(200).json(result);

  } catch (error: any) {
    logger.error(`[Voice] Transcription Error: ${error.message}`);
    return res.status(500).json({ error: error.message || 'Transcription failed' });
  }
}
