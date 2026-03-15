import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import { withLogging } from '../../lib/api-utils';

/**
 * GEA-08: Evolution Config API
 * Serves directives, evolved-config, and MCTS state to the dashboard.
 *
 * GET /api/evolution-config?projectPath=...&type=directives|config|mcts
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const projectPath = req.query.projectPath as string;
  const type = req.query.type as string;

  if (!projectPath || !type) {
    return res.status(400).json({ error: 'projectPath and type are required' });
  }

  const dir = path.join(projectPath, '.queenbee');
  const fileMap: Record<string, string> = {
    directives: path.join(dir, 'evolution-directives.json'),
    config:     path.join(dir, 'evolved-config.json'),
    mcts:       path.join(dir, 'workflow-mcts.json'),
  };

  const filePath = fileMap[type];
  if (!filePath) {
    return res.status(400).json({ error: `Unknown type: ${type}. Use directives, config, or mcts.` });
  }

  try {
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: `No ${type} found for this project yet.` });
    }
    try {
      const data = await fs.readJson(filePath);
      return res.status(200).json(data);
    } catch {
      // Malformed / empty JSON — treat as if not generated yet
      return res.status(404).json({ error: `No ${type} found for this project yet.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: `Failed to read ${type}`, details: error.message });
  }
}

export default withLogging(handler);
