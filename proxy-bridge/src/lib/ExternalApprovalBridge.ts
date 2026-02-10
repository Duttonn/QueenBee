/**
 * ExternalApprovalBridge (OP-02)
 *
 * Forwards tool approval requests to external webhooks (Discord/Slack).
 * If the user closes the browser, agents can still get approval via external channels.
 * Falls back to UI-only if webhook is not configured or fails.
 */
import { PolicyStore } from './PolicyStore';

export interface ApprovalWebhookConfig {
  url: string;
  timeout: number;  // ms to wait for webhook response before auto-rejecting
  format: 'discord' | 'slack' | 'generic';
}

interface PendingApproval {
  toolCallId: string;
  command: string;
  threadId?: string;
  resolve: (approved: boolean) => void;
  timer: NodeJS.Timeout;
}

export class ExternalApprovalBridge {
  private pendingApprovals = new Map<string, PendingApproval>();
  private webhookConfig: ApprovalWebhookConfig | null = null;
  private callbackBaseUrl: string;

  constructor(callbackBaseUrl: string = 'http://localhost:3000') {
    this.callbackBaseUrl = callbackBaseUrl;
  }

  /**
   * Load webhook config from PolicyStore.
   */
  async loadConfig(policyStore: PolicyStore): Promise<void> {
    const config = await policyStore.get('approvalWebhook');
    if (config && typeof config === 'object' && config.url) {
      this.webhookConfig = {
        url: config.url,
        timeout: config.timeout || 300000, // 5 min default
        format: config.format || 'discord',
      };
      console.log(`[ApprovalBridge] Webhook configured: ${this.webhookConfig.format} (timeout: ${this.webhookConfig.timeout}ms)`);
    }
  }

  /**
   * Check if external webhook is configured.
   */
  isConfigured(): boolean {
    return this.webhookConfig !== null;
  }

  /**
   * Request approval via external webhook.
   * Returns a promise that resolves to true (approved) or false (rejected/timeout).
   */
  async requestApproval(toolCallId: string, command: string, threadId?: string): Promise<boolean> {
    if (!this.webhookConfig) return false; // No webhook, caller should use UI

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.resolveApproval(toolCallId, false);
      }, this.webhookConfig!.timeout);

      this.pendingApprovals.set(toolCallId, { toolCallId, command, threadId, resolve, timer });

      // Fire and forget — send to webhook
      this.sendWebhookRequest(toolCallId, command, threadId).catch(err => {
        console.error(`[ApprovalBridge] Failed to send webhook: ${err.message}`);
        // Don't auto-reject — UI might still approve
      });
    });
  }

  /**
   * Resolve a pending approval (called from webhook callback endpoint).
   */
  resolveApproval(toolCallId: string, approved: boolean): boolean {
    const pending = this.pendingApprovals.get(toolCallId);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pendingApprovals.delete(toolCallId);
    pending.resolve(approved);
    console.log(`[ApprovalBridge] Approval ${approved ? 'GRANTED' : 'DENIED'} for ${toolCallId}`);
    return true;
  }

  /**
   * Send formatted webhook request to Discord/Slack/generic endpoint.
   */
  private async sendWebhookRequest(toolCallId: string, command: string, threadId?: string): Promise<void> {
    if (!this.webhookConfig) return;

    const callbackUrl = `${this.callbackBaseUrl}/api/tools/webhook-confirm`;
    const payload = this.formatPayload(toolCallId, command, threadId, callbackUrl);

    const response = await fetch(this.webhookConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }

    console.log(`[ApprovalBridge] Webhook sent for ${toolCallId} (${this.webhookConfig.format})`);
  }

  /**
   * Format the webhook payload based on configured format.
   */
  private formatPayload(toolCallId: string, command: string, threadId: string | undefined, callbackUrl: string): any {
    const truncatedCmd = command.length > 200 ? command.slice(0, 200) + '...' : command;

    switch (this.webhookConfig!.format) {
      case 'discord':
        return {
          embeds: [{
            title: 'Queen Bee — Command Approval Required',
            description: `\`\`\`\n${truncatedCmd}\n\`\`\``,
            color: 0xff9900,
            fields: [
              { name: 'Thread', value: threadId || 'N/A', inline: true },
              { name: 'Tool Call ID', value: toolCallId, inline: true },
              { name: 'Approve', value: `\`curl -X POST "${callbackUrl}?id=${toolCallId}&action=approve"\``, inline: false },
              { name: 'Reject', value: `\`curl -X POST "${callbackUrl}?id=${toolCallId}&action=reject"\``, inline: false },
            ],
            timestamp: new Date().toISOString(),
          }],
        };

      case 'slack':
        return {
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: 'Queen Bee — Command Approval Required' },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `\`\`\`${truncatedCmd}\`\`\`` },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `*Thread:* ${threadId || 'N/A'} | *ID:* ${toolCallId}` },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Approve' },
                  style: 'primary',
                  url: `${callbackUrl}?id=${toolCallId}&action=approve`,
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Reject' },
                  style: 'danger',
                  url: `${callbackUrl}?id=${toolCallId}&action=reject`,
                },
              ],
            },
          ],
        };

      default: // generic
        return {
          type: 'approval_request',
          toolCallId,
          command: truncatedCmd,
          threadId,
          approveUrl: `${callbackUrl}?id=${toolCallId}&action=approve`,
          rejectUrl: `${callbackUrl}?id=${toolCallId}&action=reject`,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Get count of pending approvals (for diagnostics).
   */
  getPendingCount(): number {
    return this.pendingApprovals.size;
  }
}

// Singleton instance
export const approvalBridge = new ExternalApprovalBridge();
