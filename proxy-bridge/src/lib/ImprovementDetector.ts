/**
 * P21-05: Improvement Detector (Critic Subagent)
 *
 * Detects whether an agent iteration represents genuine progress or churn.
 * Compares consecutive outputs to identify:
 *   - Genuine improvement: new tests passing, new functionality, bugs fixed
 *   - Churn: cosmetic changes, refactoring without functional change, oscillation
 *   - Regression: previously working things now broken
 *
 * Inspired by MassGen's Critic Subagent for honest quality assessment.
 *
 * Integration:
 *   - AutonomousRunner.ts: call between iterations to detect churn
 *   - CompletionGate.ts: factor improvement score into gate decision
 *   - ExperienceArchive.ts: record improvement deltas for learning
 */

import { broadcast } from './infrastructure/socket-instance';
import { unifiedLLMService } from './UnifiedLLMService';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type ImprovementVerdict = 'genuine' | 'churn' | 'regression' | 'unknown';

export interface ImprovementAnalysis {
  verdict: ImprovementVerdict;
  /** Confidence 0-100 */
  confidence: number;
  /** Net improvement score: positive = better, negative = regression, ~0 = churn */
  delta: number;
  /** What specifically improved */
  improvements: string[];
  /** What regressed */
  regressions: string[];
  /** Evidence of churn (cosmetic/non-functional changes) */
  churnIndicators: string[];
  /** Recommendation for the architect */
  recommendation: string;
}

export interface IterationSnapshot {
  /** What the agent produced in this iteration */
  output: string;
  /** Files changed (paths) */
  filesChanged: string[];
  /** Test results if available */
  testsPassed?: number;
  testsFailed?: number;
  /** Compilation success */
  compiles?: boolean;
  /** Gate score if available */
  gateScore?: number;
}

/* ─── ImprovementDetector ───────────────────────────────────────────── */

export class ImprovementDetector {
  private history: IterationSnapshot[] = [];
  private analysisHistory: ImprovementAnalysis[] = [];

  /** Record a new iteration snapshot. */
  recordIteration(snapshot: IterationSnapshot): void {
    this.history.push(snapshot);
    // Keep max 10 iterations
    if (this.history.length > 10) this.history.shift();
  }

  /**
   * Analyze whether the latest iteration is an improvement over the previous.
   * Uses both heuristic checks and optionally LLM analysis.
   */
  async analyze(options: { useLLM?: boolean; provider?: string } = {}): Promise<ImprovementAnalysis> {
    if (this.history.length < 2) {
      return {
        verdict: 'unknown',
        confidence: 0,
        delta: 0,
        improvements: [],
        regressions: [],
        churnIndicators: [],
        recommendation: 'Not enough iterations to compare.',
      };
    }

    const prev = this.history[this.history.length - 2];
    const curr = this.history[this.history.length - 1];

    // Heuristic analysis first (fast, no LLM cost)
    const heuristic = this.heuristicAnalysis(prev, curr);

    // Optionally enhance with LLM analysis
    if (options.useLLM && heuristic.verdict === 'unknown') {
      const llmResult = await this.llmAnalysis(prev, curr, options.provider || 'auto');
      // Merge: LLM verdict overrides if heuristic was uncertain
      if (llmResult.verdict !== 'unknown') {
        Object.assign(heuristic, llmResult);
      }
    }

    this.analysisHistory.push(heuristic);

    broadcast('IMPROVEMENT_ANALYSIS', {
      verdict: heuristic.verdict,
      confidence: heuristic.confidence,
      delta: heuristic.delta,
      iteration: this.history.length,
    });

    return heuristic;
  }

  /**
   * Detect if the agent is in a churn loop (3+ consecutive churn verdicts).
   */
  isChurnLoop(threshold = 3): boolean {
    if (this.analysisHistory.length < threshold) return false;
    const recent = this.analysisHistory.slice(-threshold);
    return recent.every(a => a.verdict === 'churn');
  }

  /**
   * Get the cumulative improvement trajectory.
   */
  getTrajectory(): { iteration: number; delta: number; verdict: ImprovementVerdict }[] {
    return this.analysisHistory.map((a, i) => ({
      iteration: i + 1,
      delta: a.delta,
      verdict: a.verdict,
    }));
  }

  /** Reset for a new task. */
  reset(): void {
    this.history = [];
    this.analysisHistory = [];
  }

  /* ─── Heuristic Analysis ──────────────────────────────────────── */

  private heuristicAnalysis(prev: IterationSnapshot, curr: IterationSnapshot): ImprovementAnalysis {
    const improvements: string[] = [];
    const regressions: string[] = [];
    const churnIndicators: string[] = [];
    let delta = 0;

    // Test improvement
    if (curr.testsPassed !== undefined && prev.testsPassed !== undefined) {
      const testDelta = (curr.testsPassed - (curr.testsFailed || 0)) - (prev.testsPassed - (prev.testsFailed || 0));
      if (testDelta > 0) {
        improvements.push(`+${testDelta} net test improvement`);
        delta += testDelta * 10;
      } else if (testDelta < 0) {
        regressions.push(`${testDelta} net test regression`);
        delta += testDelta * 10;
      }
    }

    // Compilation improvement
    if (curr.compiles !== undefined && prev.compiles !== undefined) {
      if (!prev.compiles && curr.compiles) {
        improvements.push('Compilation fixed');
        delta += 30;
      } else if (prev.compiles && !curr.compiles) {
        regressions.push('Compilation broken');
        delta -= 30;
      }
    }

    // Gate score improvement
    if (curr.gateScore !== undefined && prev.gateScore !== undefined) {
      const scoreDelta = curr.gateScore - prev.gateScore;
      if (scoreDelta > 5) {
        improvements.push(`Gate score improved by ${scoreDelta}`);
        delta += scoreDelta;
      } else if (scoreDelta < -5) {
        regressions.push(`Gate score dropped by ${Math.abs(scoreDelta)}`);
        delta += scoreDelta;
      }
    }

    // File change analysis
    if (curr.filesChanged.length === 0 && prev.filesChanged.length > 0) {
      churnIndicators.push('No file changes in this iteration');
    }

    // Output similarity (crude check)
    if (curr.output && prev.output) {
      const similarity = this.outputSimilarity(prev.output, curr.output);
      if (similarity > 0.9) {
        churnIndicators.push(`Output ${(similarity * 100).toFixed(0)}% similar to previous iteration`);
      }
    }

    // Determine verdict
    let verdict: ImprovementVerdict = 'unknown';
    let confidence = 30;

    if (regressions.length > 0 && improvements.length === 0) {
      verdict = 'regression';
      confidence = 70;
    } else if (improvements.length > 0 && regressions.length === 0) {
      verdict = 'genuine';
      confidence = 70;
    } else if (churnIndicators.length >= 2 && improvements.length === 0) {
      verdict = 'churn';
      confidence = 60;
    } else if (delta > 10) {
      verdict = 'genuine';
      confidence = 50;
    } else if (delta < -10) {
      verdict = 'regression';
      confidence = 50;
    }

    const recommendation = this.generateRecommendation(verdict, improvements, regressions, churnIndicators);

    return { verdict, confidence, delta, improvements, regressions, churnIndicators, recommendation };
  }

  private outputSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity on word sets
    const setA = new Set(a.toLowerCase().split(/\s+/).slice(0, 100));
    const setB = new Set(b.toLowerCase().split(/\s+/).slice(0, 100));
    if (setA.size === 0 && setB.size === 0) return 1;

    let intersection = 0;
    for (const word of setA) {
      if (setB.has(word)) intersection++;
    }
    return intersection / (setA.size + setB.size - intersection);
  }

  private generateRecommendation(
    verdict: ImprovementVerdict,
    improvements: string[],
    regressions: string[],
    churnIndicators: string[]
  ): string {
    switch (verdict) {
      case 'genuine':
        return `Good progress: ${improvements.join(', ')}. Continue with current approach.`;
      case 'regression':
        return `Regression detected: ${regressions.join(', ')}. Revert last changes and try a different approach.`;
      case 'churn':
        return `Churn detected: ${churnIndicators.join(', ')}. Agent is not making meaningful progress. Consider: (1) providing more specific instructions, (2) breaking the task into smaller steps, or (3) escalating to a different agent type.`;
      default:
        return 'Insufficient data to determine improvement trajectory. Continue monitoring.';
    }
  }

  /* ─── LLM-Assisted Analysis ───────────────────────────────────── */

  private async llmAnalysis(prev: IterationSnapshot, curr: IterationSnapshot, provider: string): Promise<ImprovementAnalysis> {
    try {
      const response = await unifiedLLMService.chat(provider, [
        {
          role: 'system',
          content: `You are a code quality critic. Compare two iterations of an agent's work and determine if there's genuine improvement, churn (cosmetic/meaningless changes), or regression.

Respond in EXACTLY this format:
VERDICT: <genuine|churn|regression>
CONFIDENCE: <0-100>
DELTA: <number, positive=improvement, negative=regression>
IMPROVEMENTS: <comma-separated or "none">
REGRESSIONS: <comma-separated or "none">
CHURN_INDICATORS: <comma-separated or "none">`,
        },
        {
          role: 'user',
          content: `Previous iteration:
Files changed: ${prev.filesChanged.join(', ') || 'none'}
Tests: ${prev.testsPassed ?? '?'} passed, ${prev.testsFailed ?? '?'} failed
Compiles: ${prev.compiles ?? '?'}
Output (truncated): ${prev.output.slice(0, 500)}

Current iteration:
Files changed: ${curr.filesChanged.join(', ') || 'none'}
Tests: ${curr.testsPassed ?? '?'} passed, ${curr.testsFailed ?? '?'} failed
Compiles: ${curr.compiles ?? '?'}
Output (truncated): ${curr.output.slice(0, 500)}`,
        },
      ], { maxTokens: 300, temperature: 0.1 });

      const text = typeof response === 'string'
        ? response
        : (response as any)?.content || (response as any)?.choices?.[0]?.message?.content || '';

      return this.parseLLMResponse(text);
    } catch {
      return {
        verdict: 'unknown',
        confidence: 0,
        delta: 0,
        improvements: [],
        regressions: [],
        churnIndicators: [],
        recommendation: 'LLM analysis failed.',
      };
    }
  }

  private parseLLMResponse(text: string): ImprovementAnalysis {
    const verdictMatch = text.match(/VERDICT:\s*(genuine|churn|regression)/i);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/i);
    const deltaMatch = text.match(/DELTA:\s*(-?\d+)/i);
    const improvementsMatch = text.match(/IMPROVEMENTS:\s*(.+)/i);
    const regressionsMatch = text.match(/REGRESSIONS:\s*(.+)/i);
    const churnMatch = text.match(/CHURN_INDICATORS:\s*(.+)/i);

    const verdict = (verdictMatch?.[1]?.toLowerCase() as ImprovementVerdict) || 'unknown';
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 50;
    const delta = deltaMatch ? parseInt(deltaMatch[1], 10) : 0;

    const parseList = (match: RegExpMatchArray | null): string[] => {
      if (!match || match[1].trim().toLowerCase() === 'none') return [];
      return match[1].split(',').map(s => s.trim()).filter(Boolean);
    };

    return {
      verdict,
      confidence,
      delta,
      improvements: parseList(improvementsMatch),
      regressions: parseList(regressionsMatch),
      churnIndicators: parseList(churnMatch),
      recommendation: this.generateRecommendation(verdict, parseList(improvementsMatch), parseList(regressionsMatch), parseList(churnMatch)),
    };
  }
}
