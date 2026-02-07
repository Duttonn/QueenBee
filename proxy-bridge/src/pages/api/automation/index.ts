import { NextApiRequest, NextApiResponse } from 'next';
import { automationScheduler } from '../../../lib/AutomationScheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(automationScheduler.getJobs());
  }

  if (req.method === 'POST') {
    const { action, payload } = req.body;

    switch (action) {
      case 'ADD':
        const newJob = automationScheduler.addJob(payload);
        return res.status(201).json(newJob);
      case 'PAUSE':
        automationScheduler.pauseJob(payload.id);
        return res.status(200).json({ success: true });
      case 'RESUME':
        automationScheduler.resumeJob(payload.id);
        return res.status(200).json({ success: true });
      case 'DELETE':
        automationScheduler.deleteJob(payload.id);
        return res.status(200).json({ success: true });
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
