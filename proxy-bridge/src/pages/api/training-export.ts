/**
 * P20-04: Training Data Export API
 *
 * GET /api/training-export?projectPath=...&format=jsonl|json&minMargin=0.2&maxPairs=500
 *   → Returns DPO fine-tuning dataset as file download
 *
 * POST /api/training-export { projectPath, format?, minMargin?, maxPairs?, minChosenScore?, maxRejectedScore? }
 *   → Returns stats + inline data (no download)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { DPOExporter, DPOExportOptions } from '../../lib/DPOExporter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { projectPath, format, minMargin, maxPairs, minChosenScore, maxRejectedScore } = req.query as Record<string, string>;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const options: DPOExportOptions = {
      format: (format as 'jsonl' | 'json') || 'jsonl',
      minMargin: minMargin ? parseFloat(minMargin) : undefined,
      maxPairs: maxPairs ? parseInt(maxPairs, 10) : undefined,
      minChosenScore: minChosenScore ? parseFloat(minChosenScore) : undefined,
      maxRejectedScore: maxRejectedScore ? parseFloat(maxRejectedScore) : undefined,
    };

    try {
      const exporter = new DPOExporter(projectPath);
      const stats = await exporter.getStats(options);
      const output = await exporter.export(options);

      const isJsonl = options.format === 'jsonl';
      const filename = `queenbee-dpo-training.${isJsonl ? 'jsonl' : 'json'}`;
      const contentType = isJsonl ? 'application/x-ndjson' : 'application/json';

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-DPO-Stats', JSON.stringify(stats));

      return res.status(200).send(output);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    const { projectPath, format, minMargin, maxPairs, minChosenScore, maxRejectedScore } = req.body || {};

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const options: DPOExportOptions = {
      format: format || 'jsonl',
      minMargin,
      maxPairs,
      minChosenScore,
      maxRejectedScore,
    };

    try {
      const exporter = new DPOExporter(projectPath);
      const samples = await exporter.generatePairs(options);
      const stats = await exporter.getStats(options);
      return res.status(200).json({ samples, stats });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
