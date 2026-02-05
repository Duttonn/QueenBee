import { NextApiRequest, NextApiResponse } from 'next';
import { TaskManager } from '../../../lib/TaskManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { taskId, agentId } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  const agent = agentId || 'UNKNOWN_AGENT';

  try {
    const success = await TaskManager.claimTask(taskId, agent);
    if (success) {
      res.status(200).json({ status: 'GRANTED', taskId, agentId: agent });
    } else {
      res.status(409).json({ status: 'DENIED', message: 'Task not found or already claimed' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
