import type { NextApiRequest, NextApiResponse } from 'next';
import { GraphEngine } from '../../../lib/tools/GraphEngine';

/**
 * GET /api/graph/callers?projectPath=...&functionName=...
 *
 * Returns all call sites of a named function across the project.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { projectPath, functionName } = req.query as Record<string, string>;
  if (!projectPath || !functionName) {
    return res.status(400).json({ error: 'Missing projectPath or functionName' });
  }

  try {
    const callers = await GraphEngine.getFunctionCallers(projectPath, functionName);
    return res.status(200).json({ functionName, callers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
