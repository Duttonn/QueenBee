import { NextApiRequest, NextApiResponse } from 'next';
import { accountPersistenceService } from '../../../../lib/AccountPersistenceService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (req.method === 'GET') {
    if (userId) {
      const state = await accountPersistenceService.loadState(userId as string);
      return res.status(200).json(state);
    }
    const users = await accountPersistenceService.listUsers();
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const { userId, state } = req.body;
    if (!userId || !state) return res.status(400).json({ error: 'userId and state required' });
    
    await accountPersistenceService.saveState(userId, state);
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
