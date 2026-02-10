import type { NextApiRequest, NextApiResponse } from 'next';
import { approvalBridge } from '../../../lib/ExternalApprovalBridge';
import { ToolExecutor } from '../../../lib/ToolExecutor';

/**
 * POST /api/tools/webhook-confirm?id=<toolCallId>&action=approve|reject
 *
 * Callback endpoint for external approval webhooks (Discord/Slack).
 * Resolves the pending approval in both ExternalApprovalBridge AND ToolExecutor.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const toolCallId = (req.query.id as string) || req.body?.id;
  const action = (req.query.action as string) || req.body?.action;

  if (!toolCallId || !action) {
    return res.status(400).json({ error: 'Missing id or action parameter' });
  }

  const approved = action === 'approve';

  // Resolve in both systems (bridge + direct ToolExecutor)
  const bridgeResolved = approvalBridge.resolveApproval(toolCallId, approved);
  ToolExecutor.confirm(toolCallId, approved);

  console.log(`[WebhookConfirm] ${action} for ${toolCallId} (bridge: ${bridgeResolved})`);

  return res.status(200).json({
    status: 'ok',
    toolCallId,
    action,
    resolved: bridgeResolved,
  });
}
