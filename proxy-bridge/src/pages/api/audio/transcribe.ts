import type { NextApiRequest, NextApiResponse } from 'next';
import { WhisperTranscriber } from '../../../lib/WhisperTranscriber';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `transcribe-${uuidv4()}.webm`);

  try {
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(tempFilePath);
      req.pipe(stream);
      req.on('end', resolve);
      req.on('error', reject);
    });

    const transcriber = new WhisperTranscriber();
    const text = await transcriber.transcribe(tempFilePath);

    await fs.remove(tempFilePath);

    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('[Transcribe API] Error:', error.message);
    if (fs.existsSync(tempFilePath)) {
      await fs.remove(tempFilePath);
    }
    return res.status(500).json({ error: error.message });
  }
}
