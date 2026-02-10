import type { NextApiRequest, NextApiResponse } from 'next';
import { CostTracker } from '../../lib/CostTracker';

/**
 * GET /api/costs?range=7d&groupBy=model|tool|daily&projectPath=/path
 *
 * Returns cost analytics for a project.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const projectPath = (req.query.projectPath as string) || process.cwd();
  const groupBy = (req.query.groupBy as string) || 'summary';
  const range = req.query.range as string;

  const tracker = new CostTracker(projectPath);

  // Parse range (e.g., "7d" = last 7 days, "30d" = last 30 days)
  let dateRange: { startDate?: string; endDate?: string } | undefined;
  if (range) {
    const match = range.match(/^(\d+)d$/);
    if (match) {
      const days = parseInt(match[1], 10);
      const start = new Date();
      start.setDate(start.getDate() - days);
      dateRange = { startDate: start.toISOString() };
    }
  }

  try {
    switch (groupBy) {
      case 'daily':
        return res.status(200).json(await tracker.getDailySummary(dateRange));
      case 'tool':
        return res.status(200).json(await tracker.getToolBreakdown(dateRange));
      case 'latency':
        return res.status(200).json(await tracker.getLatencyStats(dateRange));
      case 'summary':
      default:
        return res.status(200).json(await tracker.getSummary());
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
