import type { NextApiRequest, NextApiResponse } from 'next';
import { browserControlService } from '../../../lib/BrowserControlService';

/**
 * POST /api/browser/grab
 * Injects react-grab (via CDN) into the currently-connected Puppeteer page
 * so users can inspect React component trees of their app.
 *
 * GET /api/browser/react-context?x=N&y=N
 * Walks the React Fiber tree at page coordinate (x, y) and returns
 * the nearest user-land component name + source file.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!browserControlService.isConnected) {
      return res.status(400).json({ error: 'No browser connected. Connect first via /api/browser/connect.' });
    }

    if (req.method === 'POST') {
      await browserControlService.injectReactGrab();
      return res.status(200).json({ injected: true });
    }

    if (req.method === 'GET') {
      const x = Number(req.query.x);
      const y = Number(req.query.y);
      if (isNaN(x) || isNaN(y)) {
        return res.status(400).json({ error: 'Missing required query params: x, y' });
      }
      const context = await browserControlService.getReactContext(x, y);
      return res.status(200).json(context ?? { componentName: null, fileName: null, lineNumber: null });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
