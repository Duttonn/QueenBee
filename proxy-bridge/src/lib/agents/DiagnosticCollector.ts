/**
 * DiagnosticCollector (OP-03)
 *
 * Centralized system health monitoring. Tracks sessions, detects stuck agents,
 * monitors queue pressure, and exposes a health snapshot via API.
 */
import { sessionManager } from './SessionManager';
import { getLaneStats } from '../infrastructure/CommandQueue';
import { unifiedLLMService } from '../UnifiedLLMService';
import { approvalBridge } from '../infrastructure/ExternalApprovalBridge';
import { AGENT_TOOLS } from '../tools/ToolDefinitions';

export interface SessionHeartbeat {
  threadId: string;
  lastActivityAt: number;
  startedAt: number;
  stepCount: number;
}

export interface DiagnosticEvent {
  type: 'session_start' | 'session_end' | 'session_step' | 'stuck_detected' | 'queue_pressure' | 'provider_unhealthy' | 'tool_count_warning';
  threadId?: string;
  timestamp: number;
  data: any;
}

export interface HealthSnapshot {
  timestamp: string;
  activeSessions: number;
  sessions: SessionHeartbeat[];
  stuckSessions: string[];
  queueStats: Record<string, { queued: number; active: number; maxConcurrent: number }>;
  providerHealth: Record<string, any>;
  pendingApprovals: number;
  recentEvents: DiagnosticEvent[];
  toolCount: number;
  toolCountStatus: 'ok' | 'warning' | 'critical';
}

const STUCK_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes without activity
const QUEUE_PRESSURE_THRESHOLD = 3;

/**
 * P18-C4: Removed 200-event in-memory ring buffer. DiagnosticCollector now
 * only tracks live session heartbeats (unique value) and delegates historical
 * event queries to the EventLog JSONL store. recentEvents in getSnapshot()
 * returns an empty array — callers should query EventLog directly if needed.
 */
class DiagnosticCollectorImpl {
  private sessions = new Map<string, SessionHeartbeat>();
  private summaryInterval: NodeJS.Timeout | null = null;

  /**
   * Record a session starting.
   */
  sessionStart(threadId: string): void {
    const now = Date.now();
    this.sessions.set(threadId, {
      threadId,
      lastActivityAt: now,
      startedAt: now,
      stepCount: 0,
    });
  }

  /**
   * Record a session step (heartbeat).
   */
  sessionStep(threadId: string): void {
    const session = this.sessions.get(threadId);
    if (session) {
      session.lastActivityAt = Date.now();
      session.stepCount++;
    }
  }

  /**
   * Record a session ending.
   */
  sessionEnd(threadId: string): void {
    this.sessions.delete(threadId);
  }

  /**
   * Get the current tool count and its health status.
   */
  getToolCount(): { count: number; status: 'ok' | 'warning' | 'critical' } {
    const count = AGENT_TOOLS.length;
    const status = count > 80 ? 'critical' : count > 60 ? 'warning' : 'ok';
    return { count, status };
  }

  /**
   * Check for stuck sessions and queue pressure.
   * Called periodically (e.g., from HeartbeatService or setInterval).
   */
  checkHealth(): DiagnosticEvent[] {
    const now = Date.now();
    const newEvents: DiagnosticEvent[] = [];

    // Stuck session detection (unique value — not replaceable by store queries)
    for (const [threadId, session] of this.sessions) {
      const idleMs = now - session.lastActivityAt;
      if (idleMs > STUCK_THRESHOLD_MS) {
        const event: DiagnosticEvent = {
          type: 'stuck_detected',
          threadId,
          timestamp: now,
          data: { idleMs, lastActivityAt: new Date(session.lastActivityAt).toISOString(), stepCount: session.stepCount },
        };
        newEvents.push(event);
        console.warn(`[Diagnostics] STUCK SESSION detected: ${threadId} (idle ${Math.round(idleMs / 1000)}s)`);
      }
    }

    // Queue pressure detection
    const queueStats = getLaneStats();
    for (const [lane, stats] of Object.entries(queueStats)) {
      if (stats.queued > QUEUE_PRESSURE_THRESHOLD) {
        const event: DiagnosticEvent = {
          type: 'queue_pressure',
          timestamp: now,
          data: { lane, queued: stats.queued, active: stats.active },
        };
        newEvents.push(event);
        console.warn(`[Diagnostics] QUEUE PRESSURE: lane '${lane}' has ${stats.queued} queued items`);
      }
    }

    // Tool count monitoring
    const { count: toolCount, status: toolCountStatus } = this.getToolCount();
    if (toolCountStatus !== 'ok') {
      newEvents.push({
        type: 'tool_count_warning',
        timestamp: now,
        data: { toolCount, status: toolCountStatus, threshold: toolCount > 80 ? 80 : 60 },
      });
      console.warn(`[Diagnostics] TOOL COUNT ${toolCountStatus.toUpperCase()}: ${toolCount} tools active (threshold: ${toolCount > 80 ? 80 : 60})`);
    }

    return newEvents;
  }

  /**
   * Get a full system health snapshot.
   */
  getSnapshot(): HealthSnapshot {
    const now = Date.now();
    const activeThreads = sessionManager.getActiveThreads();
    const stuckSessions: string[] = [];

    for (const [threadId, session] of this.sessions) {
      if (now - session.lastActivityAt > STUCK_THRESHOLD_MS) {
        stuckSessions.push(threadId);
      }
    }

    const { count: toolCount, status: toolCountStatus } = this.getToolCount();
    return {
      timestamp: new Date().toISOString(),
      activeSessions: activeThreads.length,
      sessions: Array.from(this.sessions.values()),
      stuckSessions,
      queueStats: getLaneStats(),
      providerHealth: unifiedLLMService.authProfileManager.getAllStats(),
      pendingApprovals: approvalBridge.getPendingCount(),
      recentEvents: [], // P18-C4: historical events now delegated to EventLog JSONL
      toolCount,
      toolCountStatus,
    };
  }

  /**
   * Start periodic health check (every 60s).
   */
  startPeriodicCheck(intervalMs: number = 60000): void {
    if (this.summaryInterval) return;
    this.summaryInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
    console.log(`[Diagnostics] Periodic health check started (${intervalMs}ms interval)`);
  }

  /**
   * Stop periodic health check.
   */
  stopPeriodicCheck(): void {
    if (this.summaryInterval) {
      clearInterval(this.summaryInterval);
      this.summaryInterval = null;
    }
  }

}

export const diagnosticCollector = new DiagnosticCollectorImpl();
