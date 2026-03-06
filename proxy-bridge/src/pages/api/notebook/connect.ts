import type { NextApiRequest, NextApiResponse } from 'next';
import { notebookSessionManager } from '../../../lib/agents/NotebookSessionManager';
import { NotebookSession } from '../../../lib/agents/NotebookSession';

/**
 * POST /api/notebook/connect
 * Body: { sessionId: string, projectPath: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId, projectPath } = req.body;
  if (!sessionId || !projectPath) return res.status(400).json({ error: 'Missing sessionId or projectPath' });

  // Initialize context (this would typically come from existing session manager)
  // For now, we stub an empty context.
  const context = {
    messages: [],
    projectPath,
    maxSteps: 10,
    threadId: sessionId,
    providerId: 'auto',
    apiKey: null,
    mode: 'local',
    sessionFiles: new Set<string>(),
    contextCompressor: new (require('../../../lib/agents/ContextCompressor').ContextCompressor)(6, projectPath),
    toolExecutor: new (require('../../../lib/tools/ToolExecutor').ToolExecutor)(undefined, undefined)
  };

  const session = new NotebookSession(sessionId, context as any);
  notebookSessionManager.register(sessionId, session);

  return res.status(200).json({ success: true, notebookId: sessionId });
}
