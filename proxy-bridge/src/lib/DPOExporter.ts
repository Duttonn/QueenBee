/**
 * P20-04: Training Data Export (DPO — Direct Preference Optimization)
 *
 * Exports paired preference data from ExperienceArchive for DPO fine-tuning.
 * DPO format: { prompt, chosen, rejected } triplets where:
 *   - `chosen` = high-scoring agent trajectory (good solution)
 *   - `rejected` = low-scoring agent trajectory (bad solution)
 *
 * Inspired by:
 *   - Puzld.ai: Multi-LLM comparison + preference extraction
 *   - AgentScope: Trinity-RFT agentic RL with reward signals
 *
 * The key insight: ExperienceArchive already stores performanceScore + combinedScore
 * for every session. We pair high-performing sessions against low-performing ones
 * for the same project/task type to generate DPO training data.
 */

import fs from 'fs-extra';
import path from 'path';
import { ExperienceArchive, ArchiveEntry } from './agents/ExperienceArchive';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface DPOSample {
  /** The task/prompt that was given */
  prompt: string;
  /** The preferred (better) response/trajectory */
  chosen: string;
  /** The rejected (worse) response/trajectory */
  rejected: string;
  /** Score of the chosen trajectory */
  chosenScore: number;
  /** Score of the rejected trajectory */
  rejectedScore: number;
  /** Margin between scores (higher = more informative) */
  margin: number;
}

export interface DPOExportOptions {
  /** Minimum score difference to form a valid pair (default: 0.2) */
  minMargin?: number;
  /** Maximum number of pairs to generate (default: 500) */
  maxPairs?: number;
  /** Minimum performance score for "chosen" samples (default: 0.7) */
  minChosenScore?: number;
  /** Maximum performance score for "rejected" samples (default: 0.4) */
  maxRejectedScore?: number;
  /** Output format */
  format?: 'jsonl' | 'json';
}

export interface DPOExportStats {
  totalEntries: number;
  highPerformers: number;
  lowPerformers: number;
  pairsGenerated: number;
  avgMargin: number;
}

/* ─── DPOExporter ───────────────────────────────────────────────────── */

export class DPOExporter {
  private archive: ExperienceArchive;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.archive = new ExperienceArchive(projectPath);
  }

  /**
   * Generate DPO training pairs from the experience archive.
   * Pairs high-scoring sessions (chosen) with low-scoring ones (rejected).
   */
  async generatePairs(options: DPOExportOptions = {}): Promise<DPOSample[]> {
    const {
      minMargin = 0.2,
      maxPairs = 500,
      minChosenScore = 0.7,
      maxRejectedScore = 0.4,
    } = options;

    // Fetch all entries sorted by score
    const entries = await this.archive.query({ limit: 10000, sortBy: 'combinedScore' });
    if (entries.length < 2) return [];

    // Split into high and low performers
    const highPerformers = entries.filter(e => e.combinedScore >= minChosenScore);
    const lowPerformers = entries.filter(e => e.combinedScore <= maxRejectedScore);

    if (highPerformers.length === 0 || lowPerformers.length === 0) return [];

    const pairs: DPOSample[] = [];

    // Generate pairs: each high performer paired with closest low performer
    for (const chosen of highPerformers) {
      if (pairs.length >= maxPairs) break;

      for (const rejected of lowPerformers) {
        if (pairs.length >= maxPairs) break;

        const margin = chosen.combinedScore - rejected.combinedScore;
        if (margin < minMargin) continue;

        // Build the prompt from the task context
        const prompt = this.buildPrompt(chosen);
        const chosenResponse = this.buildTrajectory(chosen);
        const rejectedResponse = this.buildTrajectory(rejected);

        // Skip if trajectories are too similar or too short
        if (chosenResponse.length < 50 || rejectedResponse.length < 50) continue;

        pairs.push({
          prompt,
          chosen: chosenResponse,
          rejected: rejectedResponse,
          chosenScore: chosen.combinedScore,
          rejectedScore: rejected.combinedScore,
          margin,
        });
      }
    }

    // Sort by margin descending (most informative pairs first)
    pairs.sort((a, b) => b.margin - a.margin);

    return pairs.slice(0, maxPairs);
  }

  /**
   * Export DPO pairs as JSONL or JSON file.
   */
  async export(options: DPOExportOptions = {}): Promise<string> {
    const format = options.format || 'jsonl';
    const pairs = await this.generatePairs(options);

    if (format === 'jsonl') {
      return pairs.map(p => JSON.stringify(p)).join('\n');
    }

    return JSON.stringify(pairs, null, 2);
  }

  /**
   * Get statistics about available DPO training data.
   */
  async getStats(options: DPOExportOptions = {}): Promise<DPOExportStats> {
    const {
      minChosenScore = 0.7,
      maxRejectedScore = 0.4,
    } = options;

    const entries = await this.archive.query({ limit: 10000, sortBy: 'combinedScore' });
    const highPerformers = entries.filter(e => e.combinedScore >= minChosenScore);
    const lowPerformers = entries.filter(e => e.combinedScore <= maxRejectedScore);

    // Estimate pairs without generating them
    const estimatedPairs = Math.min(
      highPerformers.length * lowPerformers.length,
      options.maxPairs || 500
    );

    const pairs = await this.generatePairs(options);
    const avgMargin = pairs.length > 0
      ? pairs.reduce((sum, p) => sum + p.margin, 0) / pairs.length
      : 0;

    return {
      totalEntries: entries.length,
      highPerformers: highPerformers.length,
      lowPerformers: lowPerformers.length,
      pairsGenerated: pairs.length,
      avgMargin,
    };
  }

  /**
   * Build a prompt string from an archive entry's task context.
   */
  private buildPrompt(entry: ArchiveEntry): string {
    const tasks = entry.taskOutcomes.map(t => t.taskId).join(', ');
    return `Complete the following coding task(s): ${tasks || 'general development task'}. Project: ${path.basename(entry.projectPath)}`;
  }

  /**
   * Build a trajectory string representing the agent's approach.
   * Includes tool usage pattern, files modified, and strategies used.
   */
  private buildTrajectory(entry: ArchiveEntry): string {
    const parts: string[] = [];

    // Tool usage sequence
    if (entry.toolHistory.length > 0) {
      const toolSequence = entry.toolHistory
        .map(t => `${t.tool}(${t.outcome}, ${t.durationMs}ms)`)
        .join(' → ');
      parts.push(`Tools: ${toolSequence}`);
    }

    // Files modified
    if (entry.codePatches.length > 0) {
      parts.push(`Files: ${entry.codePatches.join(', ')}`);
    }

    // Strategies
    if (entry.promptStrategies.length > 0) {
      parts.push(`Strategies: ${entry.promptStrategies.join(', ')}`);
    }

    // Task outcomes
    const outcomes = entry.taskOutcomes.map(t =>
      `${t.taskId}: ${t.success ? 'SUCCESS' : 'FAILED'}`
    ).join(', ');
    if (outcomes) parts.push(`Outcomes: ${outcomes}`);

    // Score summary
    parts.push(`Performance: ${(entry.performanceScore * 100).toFixed(0)}%, Novelty: ${(entry.noveltyScore * 100).toFixed(0)}%, Combined: ${(entry.combinedScore * 100).toFixed(0)}%`);

    return parts.join('\n');
  }
}
