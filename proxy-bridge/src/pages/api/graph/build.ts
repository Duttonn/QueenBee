import type { NextApiRequest, NextApiResponse } from 'next';
import { GraphEngine } from '../../../lib/tools/GraphEngine';

/**
 * GET  /api/graph/build?projectPath=...  → build (or return cached) full project graph
 * POST /api/graph/build { projectPath }  → force-rebuild (invalidates cache first)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const projectPath = (req.method === 'POST' ? req.body?.projectPath : req.query.projectPath) as string;
    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Missing projectPath' });
    }

    if (req.method === 'POST') {
      GraphEngine.invalidate(projectPath);
    }

    const graph = await GraphEngine.buildGraph(projectPath);
    return res.status(200).json(graph);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
