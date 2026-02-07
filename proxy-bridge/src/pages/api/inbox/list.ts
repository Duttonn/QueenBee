import { NextApiRequest, NextApiResponse } from 'next';
import { inboxManager } from '../../../lib/InboxManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const data = await inboxManager.getFindings();
      return res.status(200).json(data);
    }
    
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}