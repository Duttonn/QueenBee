import type { NextApiRequest, NextApiResponse } from 'next';
import { diagnosticCollector } from '../../lib/DiagnosticCollector';

/**
 * GET /api/diagnostics — System health snapshot.
 * POST /api/diagnostics/check — Force a health check now.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const snapshot = diagnosticCollector.getSnapshot();
    return res.status(200).json(snapshot);
  }

  if (req.method === 'POST') {
    const events = diagnosticCollector.checkHealth();
    return res.status(200).json({ checked: true, newEvents: events.length, events });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
