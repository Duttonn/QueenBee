import type { NextApiRequest, NextApiResponse } from 'next';
import { browserControlService } from '../../../lib/BrowserControlService';

/**
 * POST /api/browser/connect  — { url } → launch browser + navigate
 * POST /api/browser/disconnect — close browser connection
 * GET  /api/browser/connect   — check connection status
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const connected = browserControlService.isConnected;
      if (!connected) return res.status(200).json({ connected: false });
      const info = await browserControlService.getPageInfo();
      return res.status(200).json({ connected: true, ...info });
    }

    if (req.method === 'POST') {
      const { url, action } = req.body || {};

      if (action === 'disconnect') {
        await browserControlService.disconnect();
        return res.status(200).json({ connected: false });
      }

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing required field: url' });
      }

      const info = await browserControlService.launch(url);
      return res.status(200).json({ connected: true, pageUrl: info.url, pageTitle: info.title });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
