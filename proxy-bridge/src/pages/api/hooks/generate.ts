import type { NextApiRequest, NextApiResponse } from 'next';
import { HookConfigBuilder } from '../../../lib/HookConfigBuilder';
import type { HookSpec } from '../../../lib/HookConfigBuilder';

/**
 * GET  /api/hooks/generate — List available hook presets
 * POST /api/hooks/generate — Generate hooks JSON config, optionally apply to settings
 *   Body: { specs: HookSpec[], settingsPath?: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ presets: HookConfigBuilder.getPresets() });
  }

  if (req.method === 'POST') {
    const { specs, settingsPath } = req.body as { specs?: HookSpec[]; settingsPath?: string };

    if (!specs || !Array.isArray(specs) || specs.length === 0) {
      return res.status(400).json({ error: 'specs array is required and must not be empty' });
    }

    const builder = new HookConfigBuilder();
    for (const spec of specs) {
      builder.addHook(spec);
    }

    const hooksJson = builder.toHooksJson();
    let applied = false;

    if (settingsPath) {
      try {
        await builder.mergeIntoSettings(settingsPath);
        applied = true;
      } catch (error: any) {
        return res.status(500).json({ error: `Failed to write settings: ${error.message}`, hooksJson });
      }
    }

    return res.status(200).json({ hooksJson, applied });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
