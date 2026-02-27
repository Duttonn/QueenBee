import type { NextApiRequest, NextApiResponse } from 'next';
import { exportSession } from '../../lib/SessionExporter';

/**
 * P19-08: Session Continuity Export API
 * GET /api/export-session?sessionId=...&projectPath=...&format=claude-code|cursor|generic
 * Returns exported session in the requested format
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const sessionId = req.query.sessionId as string;
  const projectPath = req.query.projectPath as string;
  const format = (req.query.format as 'claude-code' | 'cursor' | 'generic') || 'generic';

  if (!sessionId || !projectPath) {
    return res.status(400).json({ error: 'sessionId and projectPath are required' });
  }

  try {
    const content = await exportSession(projectPath, sessionId, format);
    
    // Set appropriate content-type and headers for download
    if (format === 'claude-code') {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="CONTINUATION.md"`);
    } else if (format === 'cursor') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="context.json"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.json"`);
    }
    
    return res.status(200).send(content);
  } catch (error: any) {
    console.error('[ExportSession API] Error:', error);
    return res.status(500).json({ error: 'Failed to export session', details: error.message });
  }
}

export default handler;
