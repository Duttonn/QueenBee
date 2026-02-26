import type { NextApiRequest, NextApiResponse } from 'next';
import { ExperienceArchive } from '../../lib/ExperienceArchive';
import { withLogging } from '../../lib/api-utils';

/**
 * GEA-01: Experience Archive API
 * GET  /api/experience-archive?projectPath=...&limit=20&sortBy=combinedScore
 * POST /api/experience-archive  { projectPath, ...entry }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectPath = (req.query.projectPath || req.body?.projectPath) as string;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  const archive = new ExperienceArchive(projectPath);

  if (req.method === 'GET') {
    try {
      const limit  = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as any) || 'combinedScore';
      const entries = await archive.query({ limit, sortBy });
      return res.status(200).json(entries);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to query archive', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const entry = req.body;
      const saved = await archive.append(entry);
      return res.status(201).json(saved);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to append entry', details: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLogging(handler);
