/**
 * P19-09: Overture Visual Approval Integration
 * 
 * Overture is a locally-run visual approval gateway for human-in-the-loop AI decisions.
 * This bridge integrates with Overture's HTTP API for local visual decision UI.
 * 
 * Reference: SixHq/Overture - locally-run visual approval gateway
 */

import { broadcast } from './infrastructure/socket-instance';

export interface OvertureDecision {
  id: string;
  decision: 'approve' | 'reject';
  reason?: string;
  timestamp: number;
}

export interface OvertureConfig {
  host: string;
  port: number;
}

const DEFAULT_OVERTURE_CONFIG: OvertureConfig = {
  host: 'localhost',
  port: 3456,
};

export class OvertureBridge {
  private config: OvertureConfig;
  private pendingDecisions = new Map<string, (decision: OvertureDecision) => void>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = false;

  constructor(config: Partial<OvertureConfig> = {}) {
    this.config = { ...DEFAULT_OVERTURE_CONFIG, ...config };
  }

  /**
   * Check if Overture is running and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.isHealthy = response.ok;
      return response.ok;
    } catch (error) {
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Check if Overture is currently available
   */
  isAvailable(): boolean {
    return this.isHealthy;
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck(intervalMs: number = 30000): void {
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, intervalMs);
    
    // Initial check
    this.healthCheck();
  }

  /**
   * Stop periodic health checks
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Submit a decision request to Overture
   * Returns a promise that resolves when user makes a decision
   */
  async requestDecision(approvalId: string, details: {
    title: string;
    description: string;
    tool?: string;
    args?: any;
  }): Promise<OvertureDecision> {
    if (!this.isHealthy) {
      throw new Error('Overture is not available');
    }

    return new Promise((resolve) => {
      // Store callback for when decision comes back
      this.pendingDecisions.set(approvalId, resolve);

      // Send to Overture
      fetch(`http://${this.config.host}:${this.config.port}/api/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: approvalId,
          title: details.title,
          description: details.description,
          tool: details.tool,
          args: details.args,
          timeout: 300000, // 5 minute timeout
        }),
      }).catch((error) => {
        console.error('[OvertureBridge] Failed to submit decision request:', error);
        this.pendingDecisions.delete(approvalId);
        resolve({
          id: approvalId,
          decision: 'reject',
          reason: 'Failed to connect to Overture',
          timestamp: Date.now(),
        });
      });

      // Emit socket event for UI visibility
      broadcast('APPROVAL_PENDING', {
        channel: 'overture',
        approvalId,
        title: details.title,
        description: details.description,
      });
    });
  }

  /**
   * Handle incoming decision from Overture callback
   */
  handleDecision(decision: OvertureDecision): void {
    const resolver = this.pendingDecisions.get(decision.id);
    if (resolver) {
      resolver(decision);
      this.pendingDecisions.delete(decision.id);
    }
  }

  /**
   * Cancel a pending decision request
   */
  cancelDecision(approvalId: string): void {
    this.pendingDecisions.delete(approvalId);
    
    fetch(`http://${this.config.host}:${this.config.port}/api/decisions/${approvalId}`, {
      method: 'DELETE',
    }).catch(() => {/* ignore */});
  }
}

// Singleton instance
export const overtureBridge = new OvertureBridge();
