/**
 * P21-06: FIFO Merge Queue with Tiered Conflict Resolution
 *
 * When multiple agents work in parallel worktrees, their branches need
 * to be merged back in order. This queue ensures:
 *   1. FIFO ordering (first-completed, first-merged)
 *   2. Conflict detection before merge
 *   3. Tiered resolution: auto-merge → LLM-assisted merge → human review
 *   4. Rollback on merge failure
 *
 * Inspired by Overstory's FIFO merge queue with 4-tier conflict resolution.
 *
 * Integration:
 *   - WorkTreeManager.ts: enqueue merge when worktree work completes
 *   - ToolExecutor.ts: enqueue after worker completes in worktree mode
 *   - socket-instance.ts: emits MERGE_QUEUE_* events
 */

import { execSync } from 'child_process';
import { broadcast } from './socket-instance';
import { unifiedLLMService } from './UnifiedLLMService';
import fs from 'fs-extra';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type MergeStatus = 'queued' | 'in_progress' | 'merged' | 'conflict' | 'failed' | 'rollback';
export type ConflictResolutionTier = 'auto' | 'llm' | 'human';

export interface MergeRequest {
  id: string;
  agentId: string;
  branch: string;
  targetBranch: string;
  worktreePath: string;
  projectPath: string;
  status: MergeStatus;
  enqueuedAt: number;
  startedAt?: number;
  completedAt?: number;
  conflictFiles?: string[];
  resolutionTier?: ConflictResolutionTier;
  error?: string;
}

export interface MergeQueueStats {
  queued: number;
  inProgress: number;
  merged: number;
  failed: number;
  totalProcessed: number;
}

/* ─── MergeQueue ────────────────────────────────────────────────────── */

class MergeQueueImpl {
  private queue: MergeRequest[] = [];
  private processing = false;
  private history: MergeRequest[] = [];

  /**
   * Enqueue a merge request. Processing happens FIFO.
   */
  enqueue(request: Omit<MergeRequest, 'id' | 'status' | 'enqueuedAt'>): string {
    const id = `merge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const mergeReq: MergeRequest = {
      ...request,
      id,
      status: 'queued',
      enqueuedAt: Date.now(),
    };

    this.queue.push(mergeReq);

    broadcast('MERGE_QUEUE_ENQUEUED', {
      id,
      agentId: request.agentId,
      branch: request.branch,
      position: this.queue.length,
    });

    console.log(`[MergeQueue] Enqueued: ${request.branch} from ${request.agentId} (position ${this.queue.length})`);

    // Auto-process if not already processing
    if (!this.processing) {
      this.processNext();
    }

    return id;
  }

  /**
   * Get current queue state.
   */
  getQueue(): MergeRequest[] {
    return [...this.queue];
  }

  /**
   * Get merge statistics.
   */
  getStats(): MergeQueueStats {
    return {
      queued: this.queue.filter(r => r.status === 'queued').length,
      inProgress: this.queue.filter(r => r.status === 'in_progress').length,
      merged: this.history.filter(r => r.status === 'merged').length,
      failed: this.history.filter(r => r.status === 'failed').length,
      totalProcessed: this.history.length,
    };
  }

  /* ─── Processing ──────────────────────────────────────────────── */

  private async processNext(): Promise<void> {
    const next = this.queue.find(r => r.status === 'queued');
    if (!next) {
      this.processing = false;
      return;
    }

    this.processing = true;
    next.status = 'in_progress';
    next.startedAt = Date.now();

    broadcast('MERGE_QUEUE_PROCESSING', { id: next.id, branch: next.branch });

    try {
      // Tier 1: Attempt auto-merge (git merge with no conflicts)
      const autoResult = this.attemptAutoMerge(next);

      if (autoResult.success) {
        next.status = 'merged';
        next.resolutionTier = 'auto';
        next.completedAt = Date.now();
        console.log(`[MergeQueue] Auto-merged: ${next.branch}`);
      } else if (autoResult.conflictFiles && autoResult.conflictFiles.length > 0) {
        next.conflictFiles = autoResult.conflictFiles;

        // Tier 2: Attempt LLM-assisted merge
        const llmResult = await this.attemptLLMMerge(next);

        if (llmResult) {
          next.status = 'merged';
          next.resolutionTier = 'llm';
          next.completedAt = Date.now();
          console.log(`[MergeQueue] LLM-merged: ${next.branch} (resolved ${next.conflictFiles.length} conflicts)`);
        } else {
          // Tier 3: Escalate to human
          next.status = 'conflict';
          next.resolutionTier = 'human';
          console.warn(`[MergeQueue] Conflicts in ${next.branch} require human resolution`);

          broadcast('MERGE_QUEUE_CONFLICT', {
            id: next.id,
            branch: next.branch,
            agentId: next.agentId,
            conflictFiles: next.conflictFiles,
          });
        }
      } else {
        next.status = 'failed';
        next.error = autoResult.error || 'Unknown merge error';
        next.completedAt = Date.now();
      }
    } catch (error: any) {
      next.status = 'failed';
      next.error = error.message;
      next.completedAt = Date.now();
      console.error(`[MergeQueue] Merge failed for ${next.branch}: ${error.message}`);
    }

    // Move to history
    this.queue = this.queue.filter(r => r.id !== next.id);
    this.history.push(next);
    if (this.history.length > 100) this.history = this.history.slice(-50);

    broadcast('MERGE_QUEUE_RESULT', {
      id: next.id,
      branch: next.branch,
      status: next.status,
      resolutionTier: next.resolutionTier,
      durationMs: (next.completedAt || Date.now()) - (next.startedAt || next.enqueuedAt),
    });

    // Process next in queue
    await this.processNext();
  }

  /* ─── Tier 1: Auto Merge ──────────────────────────────────────── */

  private attemptAutoMerge(request: MergeRequest): { success: boolean; conflictFiles?: string[]; error?: string } {
    try {
      // Ensure we're on the target branch
      execSync(`git checkout ${request.targetBranch}`, { cwd: request.projectPath, stdio: 'pipe' });

      // Attempt merge
      execSync(`git merge ${request.branch} --no-edit`, { cwd: request.projectPath, stdio: 'pipe' });

      return { success: true };
    } catch (error: any) {
      const output = error.stderr?.toString() || error.stdout?.toString() || error.message;

      // Check for merge conflicts
      if (output.includes('CONFLICT') || output.includes('Merge conflict')) {
        // Get conflicting files
        try {
          const conflictOutput = execSync('git diff --name-only --diff-filter=U', {
            cwd: request.projectPath,
            encoding: 'utf-8',
          });
          const conflictFiles = conflictOutput.trim().split('\n').filter(Boolean);

          // Abort the merge for now
          try { execSync('git merge --abort', { cwd: request.projectPath, stdio: 'pipe' }); } catch { /* already aborted */ }

          return { success: false, conflictFiles };
        } catch {
          try { execSync('git merge --abort', { cwd: request.projectPath, stdio: 'pipe' }); } catch { /* ok */ }
          return { success: false, conflictFiles: [], error: 'Could not determine conflict files' };
        }
      }

      return { success: false, error: output.slice(0, 500) };
    }
  }

  /* ─── Tier 2: LLM-Assisted Merge ─────────────────────────────── */

  private async attemptLLMMerge(request: MergeRequest): Promise<boolean> {
    if (!request.conflictFiles || request.conflictFiles.length === 0) return false;

    // Only attempt LLM merge for small conflicts (< 5 files)
    if (request.conflictFiles.length > 5) return false;

    try {
      // Re-attempt merge to get conflict markers
      execSync(`git checkout ${request.targetBranch}`, { cwd: request.projectPath, stdio: 'pipe' });
      try { execSync(`git merge ${request.branch}`, { cwd: request.projectPath, stdio: 'pipe' }); } catch { /* expected */ }

      let allResolved = true;

      for (const conflictFile of request.conflictFiles) {
        const filePath = `${request.projectPath}/${conflictFile}`;
        if (!(await fs.pathExists(filePath))) continue;

        const content = await fs.readFile(filePath, 'utf-8');
        if (!content.includes('<<<<<<<')) continue;

        // Ask LLM to resolve
        const response = await unifiedLLMService.chat('auto', [
          {
            role: 'system',
            content: `You are a merge conflict resolver. Given a file with git merge conflict markers, resolve the conflicts by producing the correct merged output. Output ONLY the resolved file content, no explanation.`,
          },
          {
            role: 'user',
            content: `Resolve the merge conflicts in this file:\n\n${content.slice(0, 4000)}`,
          },
        ], { maxTokens: 4096, temperature: 0 });

        const resolved = typeof response === 'string'
          ? response
          : (response as any)?.content || (response as any)?.choices?.[0]?.message?.content || '';

        if (resolved && !resolved.includes('<<<<<<<')) {
          await fs.writeFile(filePath, resolved);
          execSync(`git add ${conflictFile}`, { cwd: request.projectPath, stdio: 'pipe' });
        } else {
          allResolved = false;
          break;
        }
      }

      if (allResolved) {
        execSync(`git commit --no-edit`, { cwd: request.projectPath, stdio: 'pipe' });
        return true;
      } else {
        try { execSync('git merge --abort', { cwd: request.projectPath, stdio: 'pipe' }); } catch { /* ok */ }
        return false;
      }
    } catch (error: any) {
      console.warn(`[MergeQueue] LLM merge failed: ${error.message}`);
      try { execSync('git merge --abort', { cwd: request.projectPath, stdio: 'pipe' }); } catch { /* ok */ }
      return false;
    }
  }
}

/** Singleton merge queue. */
export const mergeQueue = new MergeQueueImpl();
