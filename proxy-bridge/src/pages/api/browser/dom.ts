import type { NextApiRequest, NextApiResponse } from 'next';
import { mcpBrowserBridge } from '../../../lib/MCPBrowserBridge';

/**
 * GET /api/browser/dom?selector=X
 *
 * Returns the outer HTML of the matched element (or full body if no selector).
 * Returns: { html: string, selector: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const selector = req.query.selector as string | undefined;

  try {
    const result = await mcpBrowserBridge.getDom(selector);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
