import type { NextApiRequest, NextApiResponse } from 'next';
import { PortfolioGovernance } from '../../lib/PortfolioGovernance';

/**
 * P19-12: Portfolio Governance API
 * GET /api/portfolio
 * Returns aggregated portfolio summary across all projects
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const summary = await PortfolioGovernance.getPortfolioSummary();
    return res.status(200).json(summary);
  } catch (error: any) {
    console.error('[Portfolio API] Error:', error);
    return res.status(500).json({ error: 'Failed to get portfolio summary', details: error.message });
  }
}

export default handler;
