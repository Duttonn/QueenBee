import type { NextApiRequest, NextApiResponse } from 'next';
import { mcpBrowserBridge } from '../../../lib/MCPBrowserBridge';

/**
 * GET /api/browser/screenshot?url=X
 *
 * Takes a screenshot of the current browser page.
 * Optionally navigates to `url` first.
 * Returns: { screenshot: base64string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = req.query.url as string | undefined;

  try {
    const { base64 } = await mcpBrowserBridge.screenshot(url);
    return res.status(200).json({ screenshot: base64 });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
