import { NextApiRequest, NextApiResponse } from 'next';
import { cronManager } from '../../../lib/CronManager';

/**
 * POST /api/automations/run
 * Immediately trigger an automation job without waiting for its schedule.
 * Body: { id: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const result = await cronManager.triggerNow(id);

  if (!result.success) {
    return res.status(result.error?.includes('not found') ? 404 : 500).json({ error: result.error });
  }

  return res.status(200).json({ success: true, result: result.result });
}
