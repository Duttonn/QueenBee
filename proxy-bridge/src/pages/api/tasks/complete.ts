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
    const success = await TaskManager.completeTask(taskId, agent);
    if (success) {
      res.status(200).json({ status: 'COMPLETED', taskId, agentId: agent });
    } else {
      res.status(404).json({ status: 'FAILED', message: 'Task not found or not in progress by this agent' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
