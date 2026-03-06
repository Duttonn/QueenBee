import type { NextApiRequest, NextApiResponse } from 'next';
import { codemapService } from '../../lib/infrastructure/CodemapService';

/**
 * GET /api/codemap?action=rebuild&root=/path  → rebuild codemap
 * GET /api/codemap?action=current             → return current codemap
 * POST /api/codemap { projectPath: string }   → rebuild for project
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const action = req.query.action as string;

      if (action === 'rebuild') {
        const root = (req.query.root as string) || process.cwd();
        const map = await codemapService.buildCodemap(root);
        return res.status(200).json({ ok: true, entries: Object.keys(map.entries).length });
      }

      if (action === 'current') {
        const map = await codemapService.getCodemap();
        return res.status(200).json(map || { entries: {} });
      }

      return res.status(400).json({ error: 'Missing or invalid action parameter. Use action=rebuild or action=current' });
    }

    if (req.method === 'POST') {
      const { projectPath } = req.body || {};
      const root = projectPath || process.cwd();
      const map = await codemapService.buildCodemap(root);
      return res.status(200).json({ ok: true, entries: Object.keys(map.entries).length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
