import type { NextApiRequest, NextApiResponse } from 'next';
import { browserControlService } from '../../../lib/BrowserControlService';

/**
 * GET /api/browser/element-at-point?x=100&y=200
 *
 * Returns element info at the given page coordinates.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const x = parseInt(req.query.x as string, 10);
  const y = parseInt(req.query.y as string, 10);

  if (isNaN(x) || isNaN(y)) {
    return res.status(400).json({ error: 'x and y query parameters are required (integers)' });
  }

  try {
    const element = await browserControlService.getElementAtPoint(x, y);
    return res.status(200).json(element);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
