import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const inboxPath = path.join(process.cwd(), 'data', 'inbox.json');
  
  try {
    if (req.method === 'POST') {
      const { id, action } = req.body;
      
      if (!id || !action) {
        return res.status(400).json({ error: 'id and action are required' });
      }

      if (!await fs.pathExists(inboxPath)) {
        return res.status(404).json({ error: 'Inbox empty' });
      }

      const inbox = await fs.readJson(inboxPath);
      const itemIndex = inbox.findIndex((item: any) => item.id === id);

      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
      }

      if (action === 'archive') {
        inbox.splice(itemIndex, 1);
      } else if (action === 'fix') {
        // In a real implementation, this might trigger a new agent thread
        // For now, we mark it as "fixing" or similar
        inbox[itemIndex].status = 'fixing';
      }

      await fs.writeJson(inboxPath, inbox, { spaces: 2 });
      return res.status(200).json({ success: true, inbox });
    }
    
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
