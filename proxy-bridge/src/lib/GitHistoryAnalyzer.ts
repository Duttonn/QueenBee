/**
 * P18-12: GitHistoryAnalyzer — mine git history for anti-patterns
 *
 * On project initialization, scan git log for revert/rollback/hotfix commits.
 * Extract the pattern that caused the revert using an LLM (Haiku) call.
 * Write lessons to evolution-directives.json under `git_history_lessons[]`.
 *
 * Cache: uses current HEAD commit hash as cache key — skips analysis if HEAD hasn't changed.
 *
 * Pattern from generate-agents: mining institutional memory from git history surfaces
 * project-specific anti-patterns that generic rules miss.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

const execAsync = promisify(exec);

export interface GitLesson {
  commitHash: string;
  revertMessage: string;
  antiPattern: string;  // LLM-extracted short description
  discoveredAt: string;
}

export interface GitAnalysisResult {
  headHash: string;
  lessonsExtracted: number;
  lessons: GitLesson[];
  cachedAt: string;
}

const CACHE_FILE = '.queenbee/git-history-cache.json';
const DIRECTIVES_FILE = '.queenbee/evolution-directives.json';

export class GitHistoryAnalyzer {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /** Run analysis if HEAD has changed since last run. Returns early if cached. */
  async analyze(
    providerId: string,
    apiKey?: string,
    maxReverts = 10
  ): Promise<GitAnalysisResult | null> {
    try {
      const headHash = await this.getHeadHash();
      if (!headHash) return null;

      // Check cache
      const cacheFile = path.join(this.projectPath, CACHE_FILE);
      if (await fs.pathExists(cacheFile)) {
        const cache: GitAnalysisResult = await fs.readJson(cacheFile);
        if (cache.headHash === headHash) {
          console.log('[GitHistoryAnalyzer] Cache hit — skipping analysis.');
          return cache;
        }
      }

      // Find revert commits
      const reverts = await this.findRevertCommits(maxReverts);
      if (reverts.length === 0) {
        const empty: GitAnalysisResult = {
          headHash,
          lessonsExtracted: 0,
          lessons: [],
          cachedAt: new Date().toISOString(),
        };
        await fs.ensureDir(path.dirname(cacheFile));
        await fs.writeJson(cacheFile, empty, { spaces: 2 });
        return empty;
      }

      // Extract lessons (LLM call per revert)
      const lessons = await this.extractLessons(reverts, providerId, apiKey);

      const result: GitAnalysisResult = {
        headHash,
        lessonsExtracted: lessons.length,
        lessons,
        cachedAt: new Date().toISOString(),
      };

      // Persist cache
      await fs.ensureDir(path.dirname(cacheFile));
      await fs.writeJson(cacheFile, result, { spaces: 2 });

      // Merge lessons into evolution-directives.json
      await this.mergeLessonsIntoDirectives(lessons);

      console.log(`[GitHistoryAnalyzer] Extracted ${lessons.length} anti-pattern(s) from git history.`);
      return result;
    } catch (err) {
      console.warn('[GitHistoryAnalyzer] Analysis failed (non-fatal):', err);
      return null;
    }
  }

  private async getHeadHash(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', {
        cwd: this.projectPath,
        timeout: 5000,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  private async findRevertCommits(limit: number): Promise<Array<{ hash: string; message: string; diff: string }>> {
    try {
      const { stdout } = await execAsync(
        `git log --oneline --grep="^[Rr]evert\\|rollback\\|hotfix\\|undo" -n ${limit}`,
        { cwd: this.projectPath, timeout: 10_000 }
      );

      const lines = stdout.trim().split('\n').filter(Boolean);
      const reverts = [];

      for (const line of lines.slice(0, 5)) { // Limit to 5 to avoid LLM cost
        const hash = line.split(' ')[0];
        const message = line.split(' ').slice(1).join(' ');
        let diff = '';

        try {
          const { stdout: diffOut } = await execAsync(
            `git show ${hash} --stat --no-patch`,
            { cwd: this.projectPath, timeout: 5000 }
          );
          diff = diffOut.slice(0, 500); // Cap diff size
        } catch { /* skip diff */ }

        reverts.push({ hash, message, diff });
      }

      return reverts;
    } catch {
      return [];
    }
  }

  private async extractLessons(
    reverts: Array<{ hash: string; message: string; diff: string }>,
    providerId: string,
    apiKey?: string
  ): Promise<GitLesson[]> {
    const lessons: GitLesson[] = [];

    // Lazy import to avoid circular deps
    const { unifiedLLMService } = await import('./UnifiedLLMService');

    for (const revert of reverts) {
      try {
        const prompt = `A developer reverted this commit:
Commit: ${revert.hash}
Message: "${revert.message}"
Files changed: ${revert.diff || '(unknown)'}

In one sentence, what coding anti-pattern or mistake likely caused this revert? Be specific and actionable.
Reply with ONLY the anti-pattern description, nothing else.`;

        const response = await unifiedLLMService.chat(
          providerId,
          [{ role: 'user', content: prompt }],
          { model: 'claude-3-haiku-20240307', maxTokens: 100, apiKey }
        );

        if (response.content) {
          lessons.push({
            commitHash: revert.hash,
            revertMessage: revert.message,
            antiPattern: response.content.trim().slice(0, 200),
            discoveredAt: new Date().toISOString(),
          });
        }
      } catch { /* skip this revert */ }
    }

    return lessons;
  }

  private async mergeLessonsIntoDirectives(lessons: GitLesson[]): Promise<void> {
    const directivesFile = path.join(this.projectPath, DIRECTIVES_FILE);
    let directives: Record<string, any> = {};

    if (await fs.pathExists(directivesFile)) {
      try {
        directives = await fs.readJson(directivesFile);
      } catch { /* start fresh */ }
    }

    const existing: GitLesson[] = directives.git_history_lessons || [];
    const existingHashes = new Set(existing.map((l: GitLesson) => l.commitHash));
    const newLessons = lessons.filter(l => !existingHashes.has(l.commitHash));

    directives.git_history_lessons = [...existing, ...newLessons];
    directives.last_updated = new Date().toISOString();

    await fs.ensureDir(path.dirname(directivesFile));
    await fs.writeJson(directivesFile, directives, { spaces: 2 });
  }
}
