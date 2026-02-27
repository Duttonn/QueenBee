import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { CostTracker } from './CostTracker';
import { MemoryStore, MemoryEntry } from './MemoryStore';
import { diagnosticCollector } from './DiagnosticCollector';

/**
 * InspectorService (P19-06)
 *
 * Aggregates project health data from existing services into a single snapshot.
 * Consumed by GET /api/inspector.
 */

export interface InspectorData {
  projectPath: string;
  fileTree: {
    totalFiles: number;
    byExtension: Record<string, number>;
    largestFiles: Array<{ path: string; size: number }>;
  };
  agentSessions: Array<{
    sessionId: string;
    status: string;
    startedAt: string;
    cost: number;
    toolsUsed: number;
  }>;
  costBreakdown: {
    total: number;
    byModel: Record<string, number>;
    byDay: Record<string, number>;
  };
  memoryUsage: {
    totalMemories: number;
    byType: Record<string, number>;
    avgConfidence: number;
  };
  worktrees: Array<{
    name: string;
    branch: string;
    path: string;
  }>;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'build', '.queenbee']);

export class InspectorService {
  /**
   * Recursively scan a directory, returning file stats.
   * Skips node_modules, .git, dist, .next, build, .queenbee.
   */
  private static async scanDirectory(
    dir: string,
    byExtension: Record<string, number>,
    largestFiles: Array<{ path: string; size: number }>,
    rootPath: string
  ): Promise<number> {
    let totalFiles = 0;

    let entries: fs.Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return totalFiles;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        totalFiles += await this.scanDirectory(fullPath, byExtension, largestFiles, rootPath);
      } else if (entry.isFile()) {
        totalFiles++;
        const ext = path.extname(entry.name) || 'no-ext';
        byExtension[ext] = (byExtension[ext] || 0) + 1;

        try {
          const stat = await fs.stat(fullPath);
          largestFiles.push({ path: path.relative(rootPath, fullPath), size: stat.size });
        } catch {
          // skip unreadable files
        }
      }
    }

    return totalFiles;
  }

  /**
   * Parse `git worktree list --porcelain` output into structured objects.
   */
  private static parseWorktrees(raw: string): Array<{ name: string; branch: string; path: string }> {
    const worktrees: Array<{ name: string; branch: string; path: string }> = [];
    const blocks = raw.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n');
      let wtPath = '';
      let branch = '';

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          wtPath = line.replace('worktree ', '').trim();
        } else if (line.startsWith('branch ')) {
          branch = line.replace('branch ', '').trim();
          // Strip refs/heads/ prefix
          branch = branch.replace(/^refs\/heads\//, '');
        }
      }

      if (wtPath) {
        worktrees.push({
          name: path.basename(wtPath),
          branch: branch || '(detached)',
          path: wtPath,
        });
      }
    }

    return worktrees;
  }

  /**
   * Get a full inspector snapshot for a project.
   */
  static async getProjectInspector(projectPath: string): Promise<InspectorData> {
    // --- File Tree ---
    const byExtension: Record<string, number> = {};
    const allFiles: Array<{ path: string; size: number }> = [];
    const totalFiles = await this.scanDirectory(projectPath, byExtension, allFiles, projectPath);

    // Sort by size descending, take top 10
    allFiles.sort((a, b) => b.size - a.size);
    const largestFiles = allFiles.slice(0, 10);

    // --- Agent Sessions (from DiagnosticCollector live heartbeats) ---
    const snapshot = diagnosticCollector.getSnapshot();
    const costTracker = new CostTracker(projectPath);
    const costSummary = await costTracker.getSummary();

    const agentSessions = await Promise.all(
      snapshot.sessions.map(async (session) => {
        let sessionCost = 0;
        try {
          sessionCost = await costTracker.getSessionTotal(session.threadId);
        } catch {
          sessionCost = 0;
        }
        const isStuck = snapshot.stuckSessions.includes(session.threadId);
        return {
          sessionId: session.threadId,
          status: isStuck ? 'stuck' : 'active',
          startedAt: new Date(session.startedAt).toISOString(),
          cost: sessionCost,
          toolsUsed: session.stepCount,
        };
      })
    );

    // --- Cost Breakdown ---
    const dailySummary = await costTracker.getDailySummary();
    const byDay: Record<string, number> = {};
    for (const [day, stats] of Object.entries(dailySummary)) {
      byDay[day] = stats.cost;
    }

    const costBreakdown = {
      total: costSummary.totalCost,
      byModel: costSummary.byModel,
      byDay,
    };

    // --- Memory Usage ---
    const memoryStore = new MemoryStore(projectPath);
    let memories: MemoryEntry[] = [];
    try {
      memories = await memoryStore.getAll();
    } catch {
      memories = [];
    }

    const byType: Record<string, number> = {};
    let confidenceSum = 0;
    for (const m of memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      confidenceSum += m.confidence;
    }
    const avgConfidence = memories.length > 0 ? confidenceSum / memories.length : 0;

    const memoryUsage = {
      totalMemories: memories.length,
      byType,
      avgConfidence: Math.round(avgConfidence * 1000) / 1000,
    };

    // --- Worktrees ---
    let worktrees: Array<{ name: string; branch: string; path: string }> = [];
    try {
      const raw = execSync('git worktree list --porcelain', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
      });
      worktrees = this.parseWorktrees(raw);
    } catch {
      // git not available or not a git repo — return empty list
      worktrees = [];
    }

    return {
      projectPath,
      fileTree: {
        totalFiles,
        byExtension,
        largestFiles,
      },
      agentSessions,
      costBreakdown,
      memoryUsage,
      worktrees,
    };
  }
}
