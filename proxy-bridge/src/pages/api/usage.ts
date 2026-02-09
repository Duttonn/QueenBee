import { NextApiRequest, NextApiResponse } from 'next';
import { unifiedLLMService } from '../../../lib/UnifiedLLMService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const usage = unifiedLLMService.getUsage();
    
    // Aggregated stats for the UI
    const totalTokens = usage.reduce((acc, curr) => acc + curr.totalTokens, 0);
    const totalCost = usage.reduce((acc, curr) => acc + curr.cost, 0);
    
    const byProvider = usage.reduce((acc: any, curr) => {
        acc[curr.providerId] = (acc[curr.providerId] || 0) + curr.totalTokens;
        return acc;
    }, {});

    const byModel = usage.reduce((acc: any, curr) => {
        acc[curr.model] = (acc[curr.model] || 0) + curr.totalTokens;
        return acc;
    }, {});

    return res.status(200).json({
      history: usage,
      summary: {
        totalTokens,
        totalCost,
        count: usage.length
      },
      byProvider,
      byModel
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
