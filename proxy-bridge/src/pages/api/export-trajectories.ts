import type { NextApiRequest, NextApiResponse } from 'next';
import { ExportService } from '../../lib/ExportService';
import { withLogging } from '../../lib/api-utils';

/**
 * P18-16: Export agent trajectories in ShareGPT format for fine-tuning.
 * GET  /api/export-trajectories?projectPath=...&format=sharegpt&minScore=0.7
 * GET  /api/export-trajectories/stats?projectPath=...
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const projectPath = req.query.projectPath as string;
  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  const exportService = new ExportService(projectPath);

  // Stats endpoint
  if (req.query.action === 'stats') {
    try {
      const stats = await exportService.getExportStats();
      return res.status(200).json(stats);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to get export stats', details: error.message });
    }
  }

  // Export endpoint
  const format = (req.query.format as 'sharegpt' | 'jsonl') || 'sharegpt';
  const minScore = parseFloat(req.query.minScore as string) || 0.7;
  const maxSessions = parseInt(req.query.maxSessions as string) || 100;

  try {
    const content = await exportService.exportTrajectories({
      format,
      minPerformanceScore: minScore,
      maxSessions,
      excludeErrors: true,
    });

    const ext = format === 'jsonl' ? 'jsonl' : 'xml';
    const contentType = format === 'jsonl' ? 'application/json' : 'application/xml';

    res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="trajectories.${ext}"`);
    return res.status(200).send(content);
  } catch (error: any) {
    return res.status(500).json({ error: 'Export failed', details: error.message });
  }
}

export default withLogging(handler);
