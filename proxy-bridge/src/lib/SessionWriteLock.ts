/**
 * SessionWriteLock — Filesystem-based write lock for session state (OC-04)
 *
 * Inspired by OpenClaw's session-write-lock.ts.
 * Uses exclusive file creation (fs.open("wx")) for cross-process safety.
 * Features: re-entrant (same process), stale lock detection, auto-cleanup on exit.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

interface LockPayload {
  pid: number;
  createdAt: string;
}

interface HeldLock {
  count: number;
  handle: fs.FileHandle;
  lockPath: string;
}

const HELD_LOCKS = new Map<string, HeldLock>();

function isAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function releaseAllLocksSync(): void {
  for (const [key, held] of HELD_LOCKS) {
    try {
      void held.handle.close().catch(() => {});
    } catch { /* best effort */ }
    try {
      fsSync.rmSync(held.lockPath, { force: true });
    } catch { /* best effort */ }
    HELD_LOCKS.delete(key);
  }
}

let cleanupRegistered = false;

function registerCleanupHandlers(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  process.on('exit', () => releaseAllLocksSync());

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const) {
    try {
      process.on(signal, () => {
        releaseAllLocksSync();
      });
    } catch { /* unsupported signal */ }
  }
}

async function readLockPayload(lockPath: string): Promise<LockPayload | null> {
  try {
    const raw = await fs.readFile(lockPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.pid !== 'number' || typeof parsed.createdAt !== 'string') return null;
    return { pid: parsed.pid, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

/**
 * Acquire a write lock for a file path.
 * Re-entrant: same process can acquire multiple times (tracked by count).
 * Stale detection: auto-removes locks from dead PIDs or older than staleMs.
 */
export async function acquireWriteLock(params: {
  filePath: string;
  timeoutMs?: number;
  staleMs?: number;
}): Promise<{ release: () => Promise<void> }> {
  registerCleanupHandlers();

  const timeoutMs = params.timeoutMs ?? 10_000;
  const staleMs = params.staleMs ?? 30 * 60 * 1000; // 30 minutes
  const filePath = path.resolve(params.filePath);
  const lockPath = `${filePath}.lock`;

  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Re-entrant check
  const held = HELD_LOCKS.get(filePath);
  if (held) {
    held.count += 1;
    return {
      release: async () => {
        const current = HELD_LOCKS.get(filePath);
        if (!current) return;
        current.count -= 1;
        if (current.count > 0) return;
        HELD_LOCKS.delete(filePath);
        await current.handle.close();
        await fs.rm(current.lockPath, { force: true });
      },
    };
  }

  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;
    try {
      // Exclusive create — fails if lock file already exists
      const handle = await fs.open(lockPath, 'wx');
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }, null, 2),
        'utf8'
      );
      HELD_LOCKS.set(filePath, { count: 1, handle, lockPath });

      return {
        release: async () => {
          const current = HELD_LOCKS.get(filePath);
          if (!current) return;
          current.count -= 1;
          if (current.count > 0) return;
          HELD_LOCKS.delete(filePath);
          await current.handle.close();
          await fs.rm(current.lockPath, { force: true });
        },
      };
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;

      // Lock exists — check if stale or owner is dead
      const payload = await readLockPayload(lockPath);
      const createdAt = payload?.createdAt ? Date.parse(payload.createdAt) : NaN;
      const stale = !Number.isFinite(createdAt) || Date.now() - createdAt > staleMs;
      const alive = payload?.pid ? isAlive(payload.pid) : false;

      if (stale || !alive) {
        await fs.rm(lockPath, { force: true });
        continue;
      }

      // Exponential backoff: 50ms * attempt, max 1s
      const delay = Math.min(1000, 50 * attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  const payload = await readLockPayload(lockPath);
  const owner = payload?.pid ? `pid=${payload.pid}` : 'unknown';
  throw new Error(`Write lock timeout (${timeoutMs}ms): held by ${owner} on ${lockPath}`);
}
