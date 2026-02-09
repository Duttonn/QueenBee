import { NextApiRequest, NextApiResponse } from 'next';
import { WhisperTranscriber } from '../../../lib/WhisperTranscriber';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false, // We want to handle the stream manually
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const transcriber = new WhisperTranscriber();
  const tempDir = path.join(process.cwd(), 'data', 'temp_audio');
  await fs.ensureDir(tempDir);
  
  const tempFilePath = path.join(tempDir, `${uuidv4()}.webm`);
  
  try {
    // Write request body (raw audio data) to temp file
    const writeStream = fs.createWriteStream(tempFilePath);
    
    await new Promise((resolve, reject) => {
      req.pipe(writeStream);
      req.on('end', resolve);
      req.on('error', reject);
    });

    const text = await transcriber.transcribe(tempFilePath);
    
    // Clean up
    await fs.remove(tempFilePath);
    
    if (!text) {
      return res.status(400).json({ error: 'Transcription resulted in empty text. Check your API key and audio quality.' });
    }
    
    res.status(200).json({ text });
  } catch (error: any) {
    console.error('[Transcribe API] Error:', error);
    // Cleanup on error if file exists
    if (await fs.pathExists(tempFilePath)) {
      await fs.remove(tempFilePath);
    }
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
}
