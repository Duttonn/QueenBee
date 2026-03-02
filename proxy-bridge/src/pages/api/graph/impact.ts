import type { NextApiRequest, NextApiResponse } from 'next';
import { GraphEngine } from '../../../lib/tools/GraphEngine';

/**
 * GET /api/graph/impact?projectPath=...&filePath=...
 *
 * Returns the blast radius for a single file:
 *   directDependents, transitiveDependents, directDependencies, totalImpact
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { projectPath, filePath } = req.query as Record<string, string>;
  if (!projectPath || !filePath) {
    return res.status(400).json({ error: 'Missing projectPath or filePath' });
  }

  try {
    const result = await GraphEngine.scoutImpact(projectPath, filePath);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
