import type { NextApiRequest, NextApiResponse } from 'next';
import { ExperienceSnapshotService } from '../../../lib/ExperienceSnapshotService';
import { withLogging } from '../../../lib/api-utils';

/**
 * P19-13: Experience Snapshot Export
 * GET /api/experience-archive/export?projectPath=X&domain=react
 *
 * Returns a .qbx ZIP bundle of the project's high-quality experience archive
 * (only entries with performanceScore > 0.7) together with the evolved config
 * and evolution directives.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const projectPath = req.query.projectPath as string;
  const domain      = (req.query.domain as string) || 'general';

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  try {
    const buffer = await ExperienceSnapshotService.exportSnapshot(projectPath, domain);

    const safeDomain  = domain.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename    = `queenbee-experience-${safeDomain}.qbx`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error('[experience-archive/export] Export failed:', error);
    return res.status(500).json({ error: 'Export failed', details: error.message });
  }
}

export default withLogging(handler);
