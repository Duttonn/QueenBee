import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const inboxPath = path.join(process.cwd(), 'data', 'inbox.json');
  
  try {
    if (req.method === 'GET') {
      if (!await fs.pathExists(inboxPath)) {
        return res.status(200).json([]);
      }
      const data = await fs.readJson(inboxPath);
      return res.status(200).json(data);
    }
    
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
