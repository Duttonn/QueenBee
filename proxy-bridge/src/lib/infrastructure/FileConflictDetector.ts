/**
 * P21-02: Real-Time File Conflict Detection
 *
 * Tracks which agents are working on which files. When two agents attempt
 * to write to the same file, emits a conflict warning and optionally blocks
 * the second write until the first agent releases the lock.
 *
 * Inspired by claude-swarm's file conflict detection and Overstory's merge queue.
 *
 * Integration:
 *   - ToolExecutor.ts: call acquireLock() before write_file, releaseLock() after
 *   - Roundtable.ts: emit warnings when conflicts detected
 *   - socket-instance.ts: emits FILE_CONFLICT_DETECTED events
 */

import { broadcast } from './socket-instance';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface FileLock {
  filePath: string;
  agentId: string;
  acquiredAt: number;
  /** The operation type (write, edit, delete) */
  operation: 'write' | 'edit' | 'delete';
}

export interface FileConflict {
  filePath: string;
  holdingAgent: string;
  requestingAgent: string;
  holdingSince: number;
  operation: string;
  timestamp: number;
}

export interface ConflictDetectorConfig {
  /** Whether to block conflicting writes (true) or just warn (false). Default: false */
  blockOnConflict: boolean;
  /** Lock timeout in ms — auto-release stale locks. Default: 60s */
  lockTimeoutMs: number;
  /** Max wait time for acquiring a lock in ms. Default: 10s */
  maxWaitMs: number;
}

const DEFAULT_CONFIG: ConflictDetectorConfig = {
  blockOnConflict: false,
  lockTimeoutMs: 60_000,
  maxWaitMs: 10_000,
};

/* ─── FileConflictDetector ──────────────────────────────────────────── */

class FileConflictDetectorImpl {
  private locks = new Map<string, FileLock>();
  private conflicts: FileConflict[] = [];
  private config: ConflictDetectorConfig;
  /** Track per-agent file access history for conflict analysis */
  private agentFileHistory = new Map<string, Set<string>>();

  constructor(config: Partial<ConflictDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Update config at runtime. */
  configure(config: Partial<ConflictDetectorConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Attempt to acquire a lock on a file for an agent.
   * Returns true if lock acquired. Returns false if conflict detected and blockOnConflict is false.
   * Throws if blockOnConflict is true and lock can't be acquired within maxWaitMs.
   */
  async acquireLock(filePath: string, agentId: string, operation: 'write' | 'edit' | 'delete' = 'write'): Promise<boolean> {
    const normalized = this.normalizePath(filePath);
    this.pruneStale();

    // Track file access history
    if (!this.agentFileHistory.has(agentId)) {
      this.agentFileHistory.set(agentId, new Set());
    }
    this.agentFileHistory.get(agentId)!.add(normalized);

    const existing = this.locks.get(normalized);

    // No existing lock — acquire immediately
    if (!existing) {
      this.locks.set(normalized, { filePath: normalized, agentId, acquiredAt: Date.now(), operation });
      return true;
    }

    // Same agent re-acquiring — update operation
    if (existing.agentId === agentId) {
      existing.operation = operation;
      existing.acquiredAt = Date.now();
      return true;
    }

    // Conflict! Different agent holds the lock
    const conflict: FileConflict = {
      filePath: normalized,
      holdingAgent: existing.agentId,
      requestingAgent: agentId,
      holdingSince: existing.acquiredAt,
      operation,
      timestamp: Date.now(),
    };
    this.conflicts.push(conflict);
    if (this.conflicts.length > 500) this.conflicts = this.conflicts.slice(-200);

    console.warn(`[FileConflict] ${agentId} wants to ${operation} '${normalized}' but ${existing.agentId} holds the lock since ${new Date(existing.acquiredAt).toISOString()}`);

    broadcast('FILE_CONFLICT_DETECTED', {
      filePath: normalized,
      holdingAgent: existing.agentId,
      requestingAgent: agentId,
      holdingSince: existing.acquiredAt,
      operation,
    });

    if (!this.config.blockOnConflict) {
      // Warn-only mode: allow the write but record the conflict
      return true;
    }

    // Block mode: wait for lock release
    const startWait = Date.now();
    while (Date.now() - startWait < this.config.maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.pruneStale();
      const current = this.locks.get(normalized);
      if (!current || current.agentId === agentId) {
        this.locks.set(normalized, { filePath: normalized, agentId, acquiredAt: Date.now(), operation });
        return true;
      }
    }

    // Timeout — force acquire (safety net)
    console.warn(`[FileConflict] Lock wait timeout for '${normalized}'. Force-acquiring for ${agentId}.`);
    this.locks.set(normalized, { filePath: normalized, agentId, acquiredAt: Date.now(), operation });
    return true;
  }

  /**
   * Release a lock on a file.
   */
  releaseLock(filePath: string, agentId: string): void {
    const normalized = this.normalizePath(filePath);
    const existing = this.locks.get(normalized);
    if (existing && existing.agentId === agentId) {
      this.locks.delete(normalized);
    }
  }

  /**
   * Release ALL locks held by an agent (call on agent completion/failure).
   */
  releaseAllForAgent(agentId: string): number {
    let released = 0;
    for (const [path, lock] of this.locks) {
      if (lock.agentId === agentId) {
        this.locks.delete(path);
        released++;
      }
    }
    return released;
  }

  /**
   * Check if a file is currently locked by another agent.
   */
  isLocked(filePath: string, byAgentId?: string): boolean {
    const normalized = this.normalizePath(filePath);
    this.pruneStale();
    const lock = this.locks.get(normalized);
    if (!lock) return false;
    if (byAgentId) return lock.agentId !== byAgentId;
    return true;
  }

  /**
   * Get all files an agent is working on (from lock + history).
   */
  getAgentFiles(agentId: string): string[] {
    const locked: string[] = [];
    for (const [path, lock] of this.locks) {
      if (lock.agentId === agentId) locked.push(path);
    }
    return locked;
  }

  /**
   * Get overlap analysis: which agents are touching the same files?
   */
  getOverlapAnalysis(): Array<{ file: string; agents: string[] }> {
    const fileAgents = new Map<string, Set<string>>();
    for (const [agentId, files] of this.agentFileHistory) {
      for (const file of files) {
        if (!fileAgents.has(file)) fileAgents.set(file, new Set());
        fileAgents.get(file)!.add(agentId);
      }
    }

    return Array.from(fileAgents.entries())
      .filter(([, agents]) => agents.size > 1)
      .map(([file, agents]) => ({ file, agents: Array.from(agents) }));
  }

  /** Get recent conflicts. */
  getRecentConflicts(limit = 20): FileConflict[] {
    return this.conflicts.slice(-limit);
  }

  /** Get active locks. */
  getActiveLocks(): FileLock[] {
    this.pruneStale();
    return Array.from(this.locks.values());
  }

  /** Get stats for diagnostics. */
  getStats(): { activeLocks: number; totalConflicts: number; overlappingFiles: number } {
    return {
      activeLocks: this.locks.size,
      totalConflicts: this.conflicts.length,
      overlappingFiles: this.getOverlapAnalysis().length,
    };
  }

  /* ─── Internal ────────────────────────────────────────────────── */

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
  }

  private pruneStale(): void {
    const cutoff = Date.now() - this.config.lockTimeoutMs;
    for (const [path, lock] of this.locks) {
      if (lock.acquiredAt < cutoff) {
        console.log(`[FileConflict] Auto-releasing stale lock: ${path} (held by ${lock.agentId})`);
        this.locks.delete(path);
      }
    }
  }
}

/** Singleton instance */
export const fileConflictDetector = new FileConflictDetectorImpl();
