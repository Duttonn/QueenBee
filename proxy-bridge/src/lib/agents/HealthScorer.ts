/**
 * P18-17: HealthScorer — persistent codebase health score
 *
 * Runs targeted mechanical checks on files modified during a session.
 * Computes a 0-100 health score and a delta vs the previous baseline.
 * Feeds `code_quality_delta` into ExperienceArchive scoring.
 *
 * Checks (per file, averaged):
 *  - TODO/FIXME density (per 100 lines) — penalised
 *  - Long-line density (>120 chars, per 100 lines) — penalised
 *  - Blank-line ratio (>40% = padding, <5% = dense) — penalised at extremes
 *  - AI-slop comment density — penalised via CommentChecker
 *
 * Stored in: .queenbee/health.json
 */

import fs from 'fs-extra';
import path from 'path';
import { CommentChecker } from '../CommentChecker';

export interface FileHealthScore {
  filePath: string;
  score: number;         // 0–100
  todoDensity: number;   // per 100 lines
  longLineDensity: number;
  blankLinePenalty: number;
  slopDensity: number;
}

export interface HealthSnapshot {
  score: number;
  files: FileHealthScore[];
  timestamp: number;
}

const BASELINE_FILE = 'health.json';

export class HealthScorer {
  private baselinePath: string;
  private checker = new CommentChecker({ mode: 'warn' });

  constructor(projectPath: string) {
    this.baselinePath = path.join(projectPath, '.queenbee', BASELINE_FILE);
  }

  /** Score a list of absolute file paths and return aggregate snapshot. */
  async scoreFiles(absolutePaths: string[]): Promise<HealthSnapshot> {
    const fileScores: FileHealthScore[] = [];
    for (const fp of absolutePaths) {
      if (!(await fs.pathExists(fp))) continue;
      try {
        const score = await this.scoreFile(fp);
        fileScores.push(score);
      } catch {
        // Skip unreadable files
      }
    }
    const aggregate = fileScores.length > 0
      ? fileScores.reduce((s, f) => s + f.score, 0) / fileScores.length
      : 100;
    return { score: Math.round(aggregate), files: fileScores, timestamp: Date.now() };
  }

  /** Score a single file. Returns FileHealthScore with 0–100 score. */
  async scoreFile(absolutePath: string): Promise<FileHealthScore> {
    const content = await fs.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const total = lines.length || 1;

    // TODO/FIXME density
    const todoCount = lines.filter(l => /TODO|FIXME|HACK|XXX/.test(l)).length;
    const todoDensity = (todoCount / total) * 100;

    // Long-line density (>120 chars)
    const longLines = lines.filter(l => l.length > 120).length;
    const longLineDensity = (longLines / total) * 100;

    // Blank-line ratio penalty (too many blanks = padding)
    const blankLines = lines.filter(l => l.trim() === '').length;
    const blankRatio = blankLines / total;
    const blankLinePenalty = blankRatio > 0.40 ? (blankRatio - 0.40) * 100 : 0;

    // AI-slop comment density
    const slopResult = this.checker.check(content);
    const slopDensity = (slopResult.findings.length / total) * 100;

    // Compute score (start at 100, deduct penalties)
    let score = 100;
    score -= Math.min(15, todoDensity * 3);       // up to -15 for TODOs
    score -= Math.min(10, longLineDensity * 2);   // up to -10 for long lines
    score -= Math.min(10, blankLinePenalty * 2);  // up to -10 for blank padding
    score -= Math.min(15, slopDensity * 5);       // up to -15 for slop comments
    score = Math.max(0, Math.min(100, score));

    return { filePath: absolutePath, score, todoDensity, longLineDensity, blankLinePenalty, slopDensity };
  }

  /** Get the last stored baseline. Returns null if no baseline exists. */
  async getBaseline(): Promise<HealthSnapshot | null> {
    try {
      return await fs.readJson(this.baselinePath);
    } catch {
      return null;
    }
  }

  /** Save a snapshot as the new baseline. */
  async saveBaseline(snapshot: HealthSnapshot): Promise<void> {
    await fs.ensureDir(path.dirname(this.baselinePath));
    await fs.writeJson(this.baselinePath, snapshot, { spaces: 2 });
  }

  /**
   * Compute delta vs baseline and update baseline.
   * Returns positive value = health improved, negative = degraded.
   */
  async computeDeltaAndSave(current: HealthSnapshot): Promise<number> {
    const baseline = await this.getBaseline();
    const delta = baseline ? current.score - baseline.score : 0;
    await this.saveBaseline(current);
    return delta;
  }
}
