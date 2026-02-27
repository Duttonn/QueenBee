import type { NextApiRequest, NextApiResponse } from 'next';
import { ExperienceSnapshotService } from '../../../lib/ExperienceSnapshotService';
import { withLogging } from '../../../lib/api-utils';

/**
 * P19-13: Experience Snapshot Import
 * POST /api/experience-archive/import
 * Body: { data: "<base64-encoded .qbx buffer>", projectPath: "<path>" }
 *
 * Accepts a base64-encoded .qbx bundle, deduplicates entries by sessionId,
 * and merges new high-quality experience entries into the project archive.
 * Returns { imported: number, skipped: number }.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { data, projectPath } = req.body as { data?: string; projectPath?: string };

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!data) {
    return res.status(400).json({ error: 'data (base64-encoded .qbx bundle) is required' });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(data, 'base64');
  } catch (decodeError: any) {
    return res.status(400).json({ error: 'Failed to decode base64 data', details: decodeError.message });
  }

  try {
    const result = await ExperienceSnapshotService.importSnapshot(buffer, projectPath);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[experience-archive/import] Import failed:', error);
    return res.status(500).json({ error: 'Import failed', details: error.message });
  }
}

// Increase body size limit to handle large .qbx bundles (up to 50 MB encoded)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default withLogging(handler);
