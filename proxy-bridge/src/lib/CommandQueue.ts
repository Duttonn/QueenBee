/**
 * CommandQueue — Lane-based command serialization (OC-03)
 *
 * Inspired by OpenClaw's command-queue.ts + lanes.ts.
 * Prevents concurrent operations on the same thread from corrupting shared state.
 * Each lane serializes execution (concurrency=1 by default).
 */

export enum CommandLane {
  Main = 'main',
  Session = 'session',
  Automation = 'automation',
  Subagent = 'subagent',
}

interface QueueEntry {
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  enqueuedAt: number;
  warnAfterMs: number;
  onWait?: (waitMs: number, queuedAhead: number) => void;
}

interface LaneState {
  lane: string;
  queue: QueueEntry[];
  active: number;
  maxConcurrent: number;
  draining: boolean;
}

const lanes = new Map<string, LaneState>();

function getLaneState(lane: string): LaneState {
  const existing = lanes.get(lane);
  if (existing) return existing;

  const created: LaneState = {
    lane,
    queue: [],
    active: 0,
    maxConcurrent: 1,
    draining: false,
  };
  lanes.set(lane, created);
  return created;
}

function drainLane(lane: string) {
  const state = getLaneState(lane);
  if (state.draining) return;
  state.draining = true;

  const pump = () => {
    while (state.active < state.maxConcurrent && state.queue.length > 0) {
      const entry = state.queue.shift()!;
      const waitedMs = Date.now() - entry.enqueuedAt;

      if (waitedMs >= entry.warnAfterMs) {
        entry.onWait?.(waitedMs, state.queue.length);
        console.warn(
          `[CommandQueue] Lane wait exceeded: lane=${lane} waitedMs=${waitedMs} queueAhead=${state.queue.length}`
        );
      }

      state.active += 1;
      void (async () => {
        try {
          const result = await entry.task();
          state.active -= 1;
          pump();
          entry.resolve(result);
        } catch (err) {
          state.active -= 1;
          console.error(`[CommandQueue] Lane task error: lane=${lane} error="${String(err)}"`);
          pump();
          entry.reject(err);
        }
      })();
    }
    state.draining = false;
  };

  pump();
}

/**
 * Set max concurrency for a lane. Default is 1 (fully serialized).
 */
export function setLaneConcurrency(lane: string, maxConcurrent: number) {
  const state = getLaneState(lane.trim() || CommandLane.Main);
  state.maxConcurrent = Math.max(1, Math.floor(maxConcurrent));
  drainLane(state.lane);
}

/**
 * Enqueue a task in a specific lane. Returns a promise that resolves when the task completes.
 * Tasks in the same lane are serialized. Different lanes run in parallel.
 */
export function enqueueInLane<T>(
  lane: string,
  task: () => Promise<T>,
  opts?: {
    warnAfterMs?: number;
    onWait?: (waitMs: number, queuedAhead: number) => void;
  }
): Promise<T> {
  const cleaned = lane.trim() || CommandLane.Main;
  const warnAfterMs = opts?.warnAfterMs ?? 2_000;
  const state = getLaneState(cleaned);

  return new Promise<T>((resolve, reject) => {
    state.queue.push({
      task: () => task(),
      resolve: (value) => resolve(value as T),
      reject,
      enqueuedAt: Date.now(),
      warnAfterMs,
      onWait: opts?.onWait,
    });
    drainLane(cleaned);
  });
}

/**
 * Enqueue in a session-specific lane. Serializes all operations for a given thread.
 */
export function enqueueForSession<T>(
  threadId: string,
  task: () => Promise<T>,
  opts?: { warnAfterMs?: number }
): Promise<T> {
  return enqueueInLane(`session:${threadId}`, task, opts);
}

/**
 * Get queue depth for a lane (waiting + active).
 */
export function getQueueSize(lane: string = CommandLane.Main): number {
  const state = lanes.get(lane.trim() || CommandLane.Main);
  if (!state) return 0;
  return state.queue.length + state.active;
}

/**
 * Get total queue depth across all lanes.
 */
export function getTotalQueueSize(): number {
  let total = 0;
  for (const s of lanes.values()) {
    total += s.queue.length + s.active;
  }
  return total;
}

/**
 * Clear all pending tasks in a lane (does not cancel active tasks).
 */
export function clearLane(lane: string = CommandLane.Main): number {
  const state = lanes.get(lane.trim() || CommandLane.Main);
  if (!state) return 0;
  const removed = state.queue.length;
  state.queue.length = 0;
  return removed;
}

/**
 * Get stats for all active lanes (for diagnostics/UI).
 */
export function getLaneStats(): Record<string, { queued: number; active: number; maxConcurrent: number }> {
  const result: Record<string, { queued: number; active: number; maxConcurrent: number }> = {};
  for (const [id, state] of lanes) {
    if (state.queue.length > 0 || state.active > 0) {
      result[id] = {
        queued: state.queue.length,
        active: state.active,
        maxConcurrent: state.maxConcurrent,
      };
    }
  }
  return result;
}
