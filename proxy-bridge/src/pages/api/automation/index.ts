import { NextApiRequest, NextApiResponse } from 'next';
import { cronManager } from '../../../lib/CronManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(cronManager.getJobs());
  }

  if (req.method === 'POST') {
    const { action, payload } = req.body;

    switch (action) {
      case 'ADD':
        const newJob = cronManager.addJob(payload);
        return res.status(201).json(newJob);
      case 'PAUSE':
        cronManager.pauseJob(payload.id);
        return res.status(200).json({ success: true });
      case 'RESUME':
        cronManager.resumeJob(payload.id);
        return res.status(200).json({ success: true });
      case 'DELETE':
        cronManager.deleteJob(payload.id);
        return res.status(200).json({ success: true });
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
