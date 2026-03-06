/**
 * P18-C3: ApprovalService — consolidated human-in-the-loop approval routing
 *
 * Three approval pathways previously operated independently:
 *  1. ExternalApprovalBridge  — Discord/Slack webhook delivery
 *  2. ProposalService          — inter-agent voting (remains separate; not human approval)
 *  3. UI confirmation          — frontend socket broadcast
 *
 * ApprovalService is the single entry point for human approval requests.
 * It routes to the webhook channel if configured, otherwise falls back
 * to the UI broadcast channel.
 */

import { approvalBridge } from './infrastructure/ExternalApprovalBridge';
import { broadcast } from './infrastructure/socket-instance';
import { PolicyStore } from './infrastructure/PolicyStore';

export interface ApprovalRequest {
  toolCallId: string;
  command: string;
  threadId?: string;
  projectPath?: string;
}

export interface ApprovalResult {
  approved: boolean;
  channel: 'webhook' | 'ui' | 'timeout';
}

const UI_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

class ApprovalServiceImpl {
  private uiPendingApprovals = new Map<string, (approved: boolean) => void>();

  /**
   * Request human approval for a tool call.
   *
   * Routing logic:
   *  1. If webhook is configured → ExternalApprovalBridge (Discord/Slack)
   *  2. Otherwise → UI broadcast (APPROVAL_REQUIRED socket event)
   *
   * Returns a promise that resolves when the human responds or the timeout elapses.
   */
  async requestApproval(req: ApprovalRequest): Promise<ApprovalResult> {
    // Channel 1: webhook
    if (approvalBridge.isConfigured()) {
      const approved = await approvalBridge.requestApproval(req.toolCallId, req.command, req.threadId);
      return { approved, channel: 'webhook' };
    }

    // Channel 2: UI broadcast
    return new Promise<ApprovalResult>((resolve) => {
      const timer = setTimeout(() => {
        this.uiPendingApprovals.delete(req.toolCallId);
        resolve({ approved: false, channel: 'timeout' });
      }, UI_APPROVAL_TIMEOUT_MS);

      this.uiPendingApprovals.set(req.toolCallId, (approved) => {
        clearTimeout(timer);
        resolve({ approved, channel: 'ui' });
      });

      broadcast('APPROVAL_REQUIRED', {
        toolCallId: req.toolCallId,
        command: req.command,
        threadId: req.threadId,
        projectPath: req.projectPath,
      });
    });
  }

  /**
   * Resolve a pending UI approval (called from the socket/API handler).
   * Returns true if a pending approval was found and resolved.
   */
  resolveUiApproval(toolCallId: string, approved: boolean): boolean {
    const resolver = this.uiPendingApprovals.get(toolCallId);
    if (!resolver) return false;
    this.uiPendingApprovals.delete(toolCallId);
    resolver(approved);
    return true;
  }

  /** Initialize webhook config from PolicyStore. */
  async init(policyStore: PolicyStore): Promise<void> {
    await approvalBridge.loadConfig(policyStore);
  }

  /** Count of pending approvals across all channels. */
  getPendingCount(): number {
    return this.uiPendingApprovals.size + approvalBridge.getPendingCount();
  }
}

export const approvalService = new ApprovalServiceImpl();
