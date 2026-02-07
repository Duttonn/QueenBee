import { NextApiRequest, NextApiResponse } from 'next';
import { inboxManager } from '../../../lib/InboxManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { id, action } = req.body;
      
      if (!id || !action) {
        return res.status(400).json({ error: 'id and action are required' });
      }

      if (action === 'archive') {
        await inboxManager.updateStatus(id, 'archived');
      } else if (action === 'fix') {
        // Logic to trigger a fix can be added here
        // For now, we just acknowledge the action
      }

      return res.status(200).json({ success: true });
    }
    
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}