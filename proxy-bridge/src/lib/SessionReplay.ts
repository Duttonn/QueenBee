/**
 * P21-03: Session Replay System
 *
 * Records structured execution events during a swarm session for later
 * playback and analysis. Each event has a relative timestamp so the session
 * can be replayed at real-time or accelerated speed.
 *
 * Inspired by claude-swarm's session replay functionality.
 *
 * Integration:
 *   - ToolExecutor.ts: call recordEvent() for tool calls and results
 *   - AutonomousRunner.ts: start/stop recording around executeLoop
 *   - /api/replay.ts: serve replay data for the dashboard
 */

import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { broadcast } from './socket-instance';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type ReplayEventType =
  | 'session_start'
  | 'session_end'
  | 'worker_spawn'
  | 'worker_complete'
  | 'worker_fail'
  | 'tool_call'
  | 'tool_result'
  | 'llm_request'
  | 'llm_response'
  | 'message_sent'
  | 'message_received'
  | 'gate_check'
  | 'conflict_detected'
  | 'custom';

export interface ReplayEvent {
  /** Monotonic event index */
  seq: number;
  /** Event type */
  type: ReplayEventType;
  /** Relative timestamp from session start (ms) */
  relativeMs: number;
  /** Absolute timestamp */
  timestamp: string;
  /** Agent that produced this event */
  agentId: string;
  /** Summary for timeline display */
  summary: string;
  /** Full event data */
  data: any;
}

export interface ReplaySession {
  sessionId: string;
  swarmId?: string;
  projectPath: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  eventCount: number;
  agents: string[];
}

/* ─── SessionReplayRecorder ─────────────────────────────────────────── */

export class SessionReplayRecorder {
  private sessionId: string;
  private swarmId?: string;
  private projectPath: string;
  private filePath: string;
  private startTime: number;
  private seq = 0;
  private agents = new Set<string>();
  private active = false;

  constructor(projectPath: string, sessionId: string, swarmId?: string) {
    this.projectPath = projectPath;
    this.sessionId = sessionId;
    this.swarmId = swarmId;
    this.startTime = Date.now();

    const replayDir = path.join(Paths.getProjectConfigDir(projectPath), 'replays');
    this.filePath = path.join(replayDir, `${sessionId}.jsonl`);
  }

  /** Start recording. */
  async start(): Promise<void> {
    await fs.ensureDir(path.dirname(this.filePath));
    this.active = true;
    this.startTime = Date.now();

    await this.record('session_start', 'system', 'Session started', {
      sessionId: this.sessionId,
      swarmId: this.swarmId,
      projectPath: this.projectPath,
    });
  }

  /** Record an event. */
  async record(
    type: ReplayEventType,
    agentId: string,
    summary: string,
    data: any = {}
  ): Promise<void> {
    if (!this.active) return;

    this.agents.add(agentId);
    const event: ReplayEvent = {
      seq: this.seq++,
      type,
      relativeMs: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      agentId,
      summary,
      data,
    };

    await fs.appendFile(this.filePath, JSON.stringify(event) + '\n');
  }

  /** Stop recording. */
  async stop(): Promise<void> {
    if (!this.active) return;

    await this.record('session_end', 'system', 'Session ended', {
      durationMs: Date.now() - this.startTime,
      eventCount: this.seq,
      agents: Array.from(this.agents),
    });

    this.active = false;

    broadcast('SESSION_REPLAY_SAVED', {
      sessionId: this.sessionId,
      eventCount: this.seq,
      durationMs: Date.now() - this.startTime,
    });
  }

  /** Check if recording is active. */
  isActive(): boolean {
    return this.active;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

/* ─── SessionReplayPlayer ───────────────────────────────────────────── */

export class SessionReplayPlayer {
  /**
   * Load a replay session's metadata.
   */
  static async getSession(projectPath: string, sessionId: string): Promise<ReplaySession | null> {
    const filePath = path.join(Paths.getProjectConfigDir(projectPath), 'replays', `${sessionId}.jsonl`);
    if (!(await fs.pathExists(filePath))) return null;

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;

    const firstEvent: ReplayEvent = JSON.parse(lines[0]);
    const lastEvent: ReplayEvent = JSON.parse(lines[lines.length - 1]);
    const agents = new Set<string>();

    for (const line of lines) {
      try {
        const evt: ReplayEvent = JSON.parse(line);
        agents.add(evt.agentId);
      } catch { /* skip malformed */ }
    }

    return {
      sessionId,
      swarmId: firstEvent.data?.swarmId,
      projectPath,
      startedAt: firstEvent.timestamp,
      endedAt: lastEvent.type === 'session_end' ? lastEvent.timestamp : undefined,
      durationMs: lastEvent.relativeMs,
      eventCount: lines.length,
      agents: Array.from(agents).filter(a => a !== 'system'),
    };
  }

  /**
   * Load replay events with optional filtering and pagination.
   */
  static async getEvents(
    projectPath: string,
    sessionId: string,
    options: { offset?: number; limit?: number; agentId?: string; type?: ReplayEventType } = {}
  ): Promise<ReplayEvent[]> {
    const filePath = path.join(Paths.getProjectConfigDir(projectPath), 'replays', `${sessionId}.jsonl`);
    if (!(await fs.pathExists(filePath))) return [];

    const content = await fs.readFile(filePath, 'utf-8');
    let events: ReplayEvent[] = content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);

    // Apply filters
    if (options.agentId) events = events.filter(e => e.agentId === options.agentId);
    if (options.type) events = events.filter(e => e.type === options.type);

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 1000;
    return events.slice(offset, offset + limit);
  }

  /**
   * List all available replay sessions for a project.
   */
  static async listSessions(projectPath: string): Promise<ReplaySession[]> {
    const replayDir = path.join(Paths.getProjectConfigDir(projectPath), 'replays');
    if (!(await fs.pathExists(replayDir))) return [];

    const files = await fs.readdir(replayDir);
    const sessions: ReplaySession[] = [];

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const sessionId = file.replace('.jsonl', '');
      const session = await SessionReplayPlayer.getSession(projectPath, sessionId);
      if (session) sessions.push(session);
    }

    return sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
}

/* ─── Global recorder registry ──────────────────────────────────────── */

const activeRecorders = new Map<string, SessionReplayRecorder>();

/** Get or create a recorder for a session. */
export function getSessionRecorder(projectPath: string, sessionId: string, swarmId?: string): SessionReplayRecorder {
  if (!activeRecorders.has(sessionId)) {
    activeRecorders.set(sessionId, new SessionReplayRecorder(projectPath, sessionId, swarmId));
  }
  return activeRecorders.get(sessionId)!;
}

/** Remove a recorder from the registry (after stop). */
export function removeSessionRecorder(sessionId: string): void {
  activeRecorders.delete(sessionId);
}
