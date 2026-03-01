import type { NextApiRequest, NextApiResponse } from 'next';
import { DPOExporter } from '../../lib/DPOExporter';

/**
 * P20-04: Export DPO training data from ExperienceArchive.
 *
 * GET /api/export-dpo?projectPath=...&format=jsonl&minMargin=0.2&maxPairs=500
 * GET /api/export-dpo?projectPath=...&action=stats
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const projectPath = req.query.projectPath as string;
  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  const exporter = new DPOExporter(projectPath);
  const options = {
    minMargin: parseFloat(req.query.minMargin as string) || 0.2,
    maxPairs: parseInt(req.query.maxPairs as string) || 500,
    minChosenScore: parseFloat(req.query.minChosenScore as string) || 0.7,
    maxRejectedScore: parseFloat(req.query.maxRejectedScore as string) || 0.4,
    format: (req.query.format as 'jsonl' | 'json') || 'jsonl',
  };

  // Stats endpoint
  if (req.query.action === 'stats') {
    try {
      const stats = await exporter.getStats(options);
      return res.status(200).json(stats);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to get DPO stats', details: error.message });
    }
  }

  // Export endpoint
  try {
    const content = await exporter.export(options);
    const ext = options.format === 'json' ? 'json' : 'jsonl';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dpo-training-data.${ext}"`);
    return res.status(200).send(content);
  } catch (error: any) {
    return res.status(500).json({ error: 'DPO export failed', details: error.message });
  }
}
