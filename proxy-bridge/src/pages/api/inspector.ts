import type { NextApiRequest, NextApiResponse } from 'next';
import { InspectorService } from '../../lib/InspectorService';

/**
 * GET /api/inspector?projectPath=X
 *
 * Returns a full project health snapshot: file tree, active sessions,
 * cost breakdown, memory usage, and git worktrees.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const projectPath = (req.query.projectPath as string) || process.cwd();

  try {
    const data = await InspectorService.getProjectInspector(projectPath);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
