import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { agentSyncService } from '../../lib/AgentSyncService';

/**
 * POST /api/sync-agents — Sync QueenBee worker definitions to ~/.claude/agents/
 * GET  /api/sync-agents — List currently synced agent files
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const workerPromptsDir = path.join(process.cwd(), 'src/lib/prompts/workers');
    try {
      const result = await agentSyncService.syncAll(workerPromptsDir);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const files = await agentSyncService.listSynced();
      return res.status(200).json({ files });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
