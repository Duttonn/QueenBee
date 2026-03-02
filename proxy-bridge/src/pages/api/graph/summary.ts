import type { NextApiRequest, NextApiResponse } from 'next';
import { GraphEngine } from '../../../lib/tools/GraphEngine';

/**
 * GET /api/graph/summary?projectPath=...
 *
 * Returns a lightweight summary:
 *   totalFiles, orphanFiles, circularDeps, topDependents, topImporters
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { projectPath } = req.query as Record<string, string>;
  if (!projectPath) {
    return res.status(400).json({ error: 'Missing projectPath' });
  }

  try {
    const summary = await GraphEngine.getGraphSummary(projectPath);
    return res.status(200).json(summary);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
