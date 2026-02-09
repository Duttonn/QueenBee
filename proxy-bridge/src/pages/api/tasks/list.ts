import { NextApiRequest, NextApiResponse } from 'next';
import { TaskManager } from '../../../lib/TaskManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const tasks = await TaskManager.getParsedTasks();
    return res.status(200).json(tasks);
  } catch (error: any) {
    console.error('Failed to list tasks:', error);
    return res.status(500).json({ error: error.message });
  }
}
