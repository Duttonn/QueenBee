import type { NextApiRequest, NextApiResponse } from 'next';
import { unifiedLLMService } from '../../../lib/UnifiedLLMService';

/**
 * GET /api/providers/health
 * Returns cooldown/usage stats for all providers.
 *
 * POST /api/providers/health
 * Body: { action: 'reset', providerId: string }
 * Clears cooldown for a specific provider.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const stats = unifiedLLMService.authProfileManager.getAllStats();
    const now = Date.now();

    const enriched: Record<string, any> = {};
    for (const [id, s] of Object.entries(stats)) {
      enriched[id] = {
        ...s,
        inCooldown: unifiedLLMService.authProfileManager.isInCooldown(id),
        cooldownRemainingMs: s.cooldownUntil && s.cooldownUntil > now ? s.cooldownUntil - now : 0,
        disabledRemainingMs: s.disabledUntil && s.disabledUntil > now ? s.disabledUntil - now : 0,
      };
    }

    return res.json({ ok: true, providers: enriched });
  }

  if (req.method === 'POST') {
    const { action, providerId } = req.body;
    if (action === 'reset' && typeof providerId === 'string') {
      unifiedLLMService.authProfileManager.resetProfile(providerId);
      return res.json({ ok: true, message: `Cooldown cleared for '${providerId}'` });
    }
    return res.status(400).json({ ok: false, error: 'Invalid action. Use { action: "reset", providerId: "..." }' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
