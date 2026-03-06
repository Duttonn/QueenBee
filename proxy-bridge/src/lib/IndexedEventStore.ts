/**
 * P22-01: Indexed Event Store
 *
 * Replaces raw JSONL scanning with an in-memory indexed store.
 * Events are persisted to JSONL (append-only, WAL-like) but queried
 * through in-memory indexes for O(1) lookups by type, agentId, and time range.
 *
 * No native dependencies (no better-sqlite3). Pure TypeScript.
 *
 * Inspired by disler/claude-code-hooks SQLite event store.
 *
 * Integration:
 *   - EventLog.ts: delegates to IndexedEventStore for fast queries
 *   - DiagnosticCollector.ts: use for event history queries
 *   - /api/events.ts: expose indexed query endpoint
 */

import fs from 'fs-extra';
import path from 'path';
import { Paths } from './infrastructure/Paths';
import { v4 as uuidv4 } from 'uuid';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface IndexedEvent {
  id: string;
  timestamp: string;
  /** Epoch ms for fast range queries */
  epochMs: number;
  type: string;
  agentId: string;
  data: any;
}

export interface EventQuery {
  type?: string;
  types?: string[];
  agentId?: string;
  agentIds?: string[];
  startTime?: string | number;
  endTime?: string | number;
  limit?: number;
  offset?: number;
  /** Sort direction. Default: desc (newest first) */
  order?: 'asc' | 'desc';
}

export interface EventAggregation {
  /** Count of events by type */
  byType: Record<string, number>;
  /** Count of events by agent */
  byAgent: Record<string, number>;
  /** Events per minute (last hour) */
  ratePerMinute: number;
  /** Total events */
  total: number;
}

/* ─── IndexedEventStore ─────────────────────────────────────────────── */

export class IndexedEventStore {
  private filePath: string;
  private events: IndexedEvent[] = [];
  /** Index: type → event indices */
  private typeIndex = new Map<string, number[]>();
  /** Index: agentId → event indices */
  private agentIndex = new Map<string, number[]>();
  private loaded = false;
  private writeQueue: IndexedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(projectPath: string) {
    this.filePath = path.join(Paths.getProjectConfigDir(projectPath), 'events_indexed.jsonl');
  }

  /* ─── Write ───────────────────────────────────────────────────── */

  /**
   * Emit a new event. Indexed immediately, flushed to disk in batches.
   */
  async emit(type: string, agentId: string, data: any): Promise<IndexedEvent> {
    await this.ensureLoaded();

    const event: IndexedEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      epochMs: Date.now(),
      type,
      agentId,
      data,
    };

    // Add to in-memory store and indexes
    const idx = this.events.length;
    this.events.push(event);
    this.addToIndex(this.typeIndex, type, idx);
    this.addToIndex(this.agentIndex, agentId, idx);

    // Batch writes for performance
    this.writeQueue.push(event);
    this.scheduleFlush();

    return event;
  }

  /* ─── Query ───────────────────────────────────────────────────── */

  /**
   * Query events with filtering, pagination, and sorting.
   * Uses indexes for O(1) type/agent lookups.
   */
  async query(q: EventQuery = {}): Promise<IndexedEvent[]> {
    await this.ensureLoaded();

    let candidates: IndexedEvent[];

    // Use index if filtering by single type or agent
    if (q.type && !q.agentId) {
      const indices = this.typeIndex.get(q.type) || [];
      candidates = indices.map(i => this.events[i]);
    } else if (q.agentId && !q.type) {
      const indices = this.agentIndex.get(q.agentId) || [];
      candidates = indices.map(i => this.events[i]);
    } else if (q.type && q.agentId) {
      // Intersect both indexes
      const typeSet = new Set(this.typeIndex.get(q.type) || []);
      const agentIndices = this.agentIndex.get(q.agentId) || [];
      candidates = agentIndices.filter(i => typeSet.has(i)).map(i => this.events[i]);
    } else {
      candidates = [...this.events];
    }

    // Multi-type filter
    if (q.types && q.types.length > 0) {
      const typeSet = new Set(q.types);
      candidates = candidates.filter(e => typeSet.has(e.type));
    }

    // Multi-agent filter
    if (q.agentIds && q.agentIds.length > 0) {
      const agentSet = new Set(q.agentIds);
      candidates = candidates.filter(e => agentSet.has(e.agentId));
    }

    // Time range filters
    if (q.startTime) {
      const start = typeof q.startTime === 'number' ? q.startTime : new Date(q.startTime).getTime();
      candidates = candidates.filter(e => e.epochMs >= start);
    }
    if (q.endTime) {
      const end = typeof q.endTime === 'number' ? q.endTime : new Date(q.endTime).getTime();
      candidates = candidates.filter(e => e.epochMs <= end);
    }

    // Sort
    const order = q.order || 'desc';
    candidates.sort((a, b) => order === 'desc' ? b.epochMs - a.epochMs : a.epochMs - b.epochMs);

    // Pagination
    const offset = q.offset || 0;
    const limit = q.limit || 100;
    return candidates.slice(offset, offset + limit);
  }

  /**
   * Get event count matching a query (without loading full events).
   */
  async count(q: EventQuery = {}): Promise<number> {
    const results = await this.query({ ...q, limit: Infinity });
    return results.length;
  }

  /**
   * Aggregate events for dashboard statistics.
   */
  async aggregate(timeWindowMs = 3600_000): Promise<EventAggregation> {
    await this.ensureLoaded();

    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    for (const [type, indices] of this.typeIndex) {
      byType[type] = indices.length;
    }
    for (const [agent, indices] of this.agentIndex) {
      byAgent[agent] = indices.length;
    }

    // Calculate rate for time window
    const cutoff = Date.now() - timeWindowMs;
    const recentCount = this.events.filter(e => e.epochMs >= cutoff).length;
    const minutes = timeWindowMs / 60_000;

    return {
      byType,
      byAgent,
      ratePerMinute: recentCount / minutes,
      total: this.events.length,
    };
  }

  /**
   * Get distinct values for a field (useful for filter dropdowns).
   */
  async distinct(field: 'type' | 'agentId'): Promise<string[]> {
    await this.ensureLoaded();
    if (field === 'type') return Array.from(this.typeIndex.keys());
    if (field === 'agentId') return Array.from(this.agentIndex.keys());
    return [];
  }

  /* ─── Internal ────────────────────────────────────────────────── */

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    await fs.ensureDir(path.dirname(this.filePath));
    if (!(await fs.pathExists(this.filePath))) return;

    const content = await fs.readFile(this.filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      try {
        const event = JSON.parse(lines[i]) as IndexedEvent;
        // Ensure epochMs exists (for events written before this field)
        if (!event.epochMs) event.epochMs = new Date(event.timestamp).getTime();

        const idx = this.events.length;
        this.events.push(event);
        this.addToIndex(this.typeIndex, event.type, idx);
        this.addToIndex(this.agentIndex, event.agentId, idx);
      } catch { /* skip malformed lines */ }
    }

    // Cap at 50k events to avoid memory bloat
    if (this.events.length > 50_000) {
      this.compact();
    }
  }

  private addToIndex(index: Map<string, number[]>, key: string, eventIdx: number): void {
    const arr = index.get(key);
    if (arr) arr.push(eventIdx);
    else index.set(key, [eventIdx]);
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null;
      await this.flush();
    }, 100); // 100ms batch window
  }

  private async flush(): Promise<void> {
    if (this.writeQueue.length === 0) return;
    const batch = this.writeQueue.splice(0);
    const lines = batch.map(e => JSON.stringify(e)).join('\n') + '\n';
    await fs.appendFile(this.filePath, lines);
  }

  /** Compact: keep only the last 30k events. */
  private compact(): void {
    const keep = this.events.slice(-30_000);
    this.events = keep;
    this.typeIndex.clear();
    this.agentIndex.clear();
    for (let i = 0; i < keep.length; i++) {
      this.addToIndex(this.typeIndex, keep[i].type, i);
      this.addToIndex(this.agentIndex, keep[i].agentId, i);
    }
  }
}
