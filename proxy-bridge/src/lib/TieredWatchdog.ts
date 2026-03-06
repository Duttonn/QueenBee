/**
 * P21-04: Tiered Watchdog Escalation System
 *
 * Three-tier health monitoring inspired by Overstory:
 *   Tier 0 (Mechanical): heartbeat checks, stuck detection, resource limits
 *   Tier 1 (AI-Assisted): LLM-based triage of stuck/looping agents
 *   Tier 2 (Human): escalation to user via notification + pause
 *
 * Each tier activates only when the previous tier can't resolve the issue.
 *
 * Integration:
 *   - HeartbeatService.ts: feed heartbeat data into watchdog
 *   - DiagnosticCollector.ts: supply session health data
 *   - TriggerEngine.ts: emit escalation events
 *   - socket-instance.ts: emits WATCHDOG_TIER_0/1/2 events
 */

import { broadcast } from './infrastructure/socket-instance';
import { unifiedLLMService } from './UnifiedLLMService';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type WatchdogTier = 0 | 1 | 2;

export interface WatchdogAlert {
  id: string;
  tier: WatchdogTier;
  agentId: string;
  issue: string;
  detectedAt: number;
  resolvedAt?: number;
  resolution?: string;
  escalatedFrom?: WatchdogTier;
}

export interface AgentHealth {
  agentId: string;
  lastHeartbeat: number;
  stepCount: number;
  /** Consecutive identical outputs (loop detection) */
  repeatCount: number;
  lastOutput?: string;
  /** Token spend for this agent */
  tokenSpend: number;
  /** Budget limit for this agent */
  tokenBudget: number;
}

export interface WatchdogConfig {
  /** How often to check (ms). Default: 15s */
  checkIntervalMs: number;
  /** Tier 0: seconds without heartbeat before flagging. Default: 120s */
  stuckThresholdMs: number;
  /** Tier 0: max identical consecutive outputs. Default: 3 */
  loopThreshold: number;
  /** Tier 0: budget usage % to warn. Default: 80 */
  budgetWarnPercent: number;
  /** Tier 1: max AI triage attempts before escalating to Tier 2. Default: 2 */
  maxTriageAttempts: number;
  /** Whether to enable AI triage (Tier 1). Default: true */
  enableAiTriage: boolean;
}

const DEFAULT_CONFIG: WatchdogConfig = {
  checkIntervalMs: 15_000,
  stuckThresholdMs: 120_000,
  loopThreshold: 3,
  budgetWarnPercent: 80,
  maxTriageAttempts: 2,
  enableAiTriage: true,
};

/* ─── TieredWatchdog ────────────────────────────────────────────────── */

export class TieredWatchdog {
  private config: WatchdogConfig;
  private agents = new Map<string, AgentHealth>();
  private alerts: WatchdogAlert[] = [];
  private interval: NodeJS.Timeout | null = null;
  private triageAttempts = new Map<string, number>();

  constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Start the watchdog loop. */
  start(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.check(), this.config.checkIntervalMs);
    console.log(`[Watchdog] Started with ${this.config.checkIntervalMs}ms interval`);
  }

  /** Stop the watchdog loop. */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** Register/update an agent's health data. */
  updateHealth(agentId: string, data: Partial<AgentHealth>): void {
    const existing = this.agents.get(agentId) || {
      agentId,
      lastHeartbeat: Date.now(),
      stepCount: 0,
      repeatCount: 0,
      tokenSpend: 0,
      tokenBudget: Infinity,
    };
    Object.assign(existing, data, { lastHeartbeat: Date.now() });
    this.agents.set(agentId, existing);
  }

  /** Record an agent's output for loop detection. */
  recordOutput(agentId: string, output: string): void {
    const health = this.agents.get(agentId);
    if (!health) return;

    // Simple loop detection: hash the first 200 chars
    const truncated = output.slice(0, 200);
    if (health.lastOutput === truncated) {
      health.repeatCount++;
    } else {
      health.repeatCount = 0;
      health.lastOutput = truncated;
    }
    health.stepCount++;
  }

  /** Remove an agent (on completion). */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.triageAttempts.delete(agentId);
  }

  /** Get all active alerts. */
  getAlerts(): WatchdogAlert[] {
    return this.alerts.filter(a => !a.resolvedAt);
  }

  /** Get all agent health statuses. */
  getHealthMap(): AgentHealth[] {
    return Array.from(this.agents.values());
  }

  /* ─── Check Loop ──────────────────────────────────────────────── */

  private async check(): Promise<void> {
    const now = Date.now();

    for (const [agentId, health] of this.agents) {
      // Tier 0: Mechanical checks
      const issues = this.tier0Check(agentId, health, now);

      for (const issue of issues) {
        const alertId = `${agentId}-${issue.type}`;

        // Check if already alerted
        if (this.alerts.some(a => a.id === alertId && !a.resolvedAt)) continue;

        const alert: WatchdogAlert = {
          id: alertId,
          tier: 0,
          agentId,
          issue: issue.message,
          detectedAt: now,
        };

        this.alerts.push(alert);
        console.warn(`[Watchdog:T0] ${agentId}: ${issue.message}`);
        broadcast('WATCHDOG_ALERT', { tier: 0, agentId, issue: issue.message });

        // Attempt Tier 1 if enabled
        if (this.config.enableAiTriage && issue.type !== 'budget') {
          await this.tier1Triage(alert, health);
        } else {
          // Skip to Tier 2
          await this.tier2Escalate(alert);
        }
      }
    }

    // Prune old resolved alerts
    if (this.alerts.length > 200) {
      this.alerts = this.alerts.filter(a => !a.resolvedAt || now - a.resolvedAt < 300_000);
    }
  }

  private tier0Check(agentId: string, health: AgentHealth, now: number): Array<{ type: string; message: string }> {
    const issues: Array<{ type: string; message: string }> = [];

    // Stuck detection
    const silentMs = now - health.lastHeartbeat;
    if (silentMs > this.config.stuckThresholdMs) {
      issues.push({
        type: 'stuck',
        message: `Agent stuck — no activity for ${Math.round(silentMs / 1000)}s`,
      });
    }

    // Loop detection
    if (health.repeatCount >= this.config.loopThreshold) {
      issues.push({
        type: 'loop',
        message: `Agent looping — ${health.repeatCount} identical consecutive outputs`,
      });
    }

    // Budget warning
    if (health.tokenBudget < Infinity) {
      const usage = (health.tokenSpend / health.tokenBudget) * 100;
      if (usage >= this.config.budgetWarnPercent) {
        issues.push({
          type: 'budget',
          message: `Budget warning — ${usage.toFixed(0)}% of token budget used (${health.tokenSpend}/${health.tokenBudget})`,
        });
      }
    }

    return issues;
  }

  /* ─── Tier 1: AI-Assisted Triage ──────────────────────────────── */

  private async tier1Triage(alert: WatchdogAlert, health: AgentHealth): Promise<void> {
    const attempts = this.triageAttempts.get(alert.agentId) || 0;
    if (attempts >= this.config.maxTriageAttempts) {
      await this.tier2Escalate(alert);
      return;
    }

    this.triageAttempts.set(alert.agentId, attempts + 1);
    alert.tier = 1;

    console.log(`[Watchdog:T1] AI triage for ${alert.agentId} (attempt ${attempts + 1})`);
    broadcast('WATCHDOG_ALERT', { tier: 1, agentId: alert.agentId, issue: alert.issue, triageAttempt: attempts + 1 });

    try {
      const response = await unifiedLLMService.chat('auto', [
        {
          role: 'system',
          content: `You are a watchdog AI triaging a stuck or looping coding agent. Analyze the issue and suggest a recovery action.
Respond in this format:
ACTION: <restart|nudge|kill|escalate>
REASON: <brief explanation>`,
        },
        {
          role: 'user',
          content: `Agent: ${alert.agentId}
Issue: ${alert.issue}
Steps completed: ${health.stepCount}
Repeat count: ${health.repeatCount}
Last output snippet: ${health.lastOutput?.slice(0, 100) || 'N/A'}
Time since last heartbeat: ${Math.round((Date.now() - health.lastHeartbeat) / 1000)}s`,
        },
      ], { maxTokens: 200, temperature: 0.1 });

      const text = typeof response === 'string'
        ? response
        : (response as any)?.content || (response as any)?.choices?.[0]?.message?.content || '';

      const actionMatch = text.match(/ACTION:\s*(restart|nudge|kill|escalate)/i);
      const action = actionMatch ? actionMatch[1].toLowerCase() : 'escalate';

      if (action === 'escalate') {
        await this.tier2Escalate(alert);
      } else {
        alert.resolution = `AI triage: ${action}`;
        alert.resolvedAt = Date.now();
        console.log(`[Watchdog:T1] Resolved ${alert.agentId}: ${action}`);

        broadcast('WATCHDOG_TRIAGE_RESULT', {
          agentId: alert.agentId,
          action,
          reason: text,
        });
      }
    } catch (err: any) {
      console.warn(`[Watchdog:T1] AI triage failed: ${err.message}. Escalating to Tier 2.`);
      await this.tier2Escalate(alert);
    }
  }

  /* ─── Tier 2: Human Escalation ────────────────────────────────── */

  private async tier2Escalate(alert: WatchdogAlert): Promise<void> {
    alert.tier = 2;
    alert.escalatedFrom = alert.tier === 2 ? 1 : 0;

    console.error(`[Watchdog:T2] HUMAN ESCALATION for ${alert.agentId}: ${alert.issue}`);

    broadcast('WATCHDOG_ESCALATION', {
      agentId: alert.agentId,
      issue: alert.issue,
      tier: 2,
      message: `Agent ${alert.agentId} requires human intervention: ${alert.issue}`,
      suggestedActions: ['pause', 'restart', 'kill'],
    });

    // Also emit as a notification for the dashboard
    broadcast('NOTIFICATION', {
      source: 'Watchdog',
      level: 'critical',
      message: `Agent ${alert.agentId} escalated to human: ${alert.issue}`,
    });
  }
}

/** Singleton watchdog instance. */
export const tieredWatchdog = new TieredWatchdog();
