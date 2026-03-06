import fs from 'fs-extra';
import path from 'path';
import { ExperienceArchive, ArchiveEntry } from './agents/ExperienceArchive';
import { unifiedLLMService } from './UnifiedLLMService';
import { LLMMessage } from './types/llm';

/**
 * GEA-07: MCTS Workflow Optimizer
 * Automated search over agentic workflow operators, inspired by AFlow
 * (ICLR 2025 Oral, arXiv:2410.10762).
 *
 * Operators (from AFlow):
 *   - sequential:    default single-pass (baseline)
 *   - ensemble:      run prompt 2× in parallel → LLM votes on best response
 *   - review_revise: generate → critique → refine (up to 2 rounds)
 *
 * Search strategy: UCB1 bandit over operators (MCTS depth=1).
 * Scores are derived from ExperienceArchive — sessions whose tool
 * pattern matches an operator get that operator's score updated.
 *
 * Persistence: .queenbee/workflow-mcts.json
 */

export type WorkflowOperator = 'sequential' | 'ensemble' | 'review_revise';

export interface OperatorStats {
  visits: number;
  totalScore: number;
  avgScore: number;
}

export interface WorkflowMCTSState {
  operators: Record<WorkflowOperator, OperatorStats>;
  totalVisits: number;
  lastUpdated: number;
  bestOperator: WorkflowOperator;
}

const MCTS_FILE = 'workflow-mcts.json';
const UCB_C = Math.SQRT2; // exploration constant

const DEFAULT_STATE: WorkflowMCTSState = {
  operators: {
    sequential:    { visits: 1, totalScore: 0.5, avgScore: 0.5 },
    ensemble:      { visits: 0, totalScore: 0,   avgScore: 0   },
    review_revise: { visits: 0, totalScore: 0,   avgScore: 0   },
  },
  totalVisits: 1,
  lastUpdated: 0,
  bestOperator: 'sequential',
};

export class WorkflowOptimizer {
  private mctsPath: string;
  private archive: ExperienceArchive;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.archive  = new ExperienceArchive(projectPath);
    this.mctsPath = path.join(projectPath, '.queenbee', MCTS_FILE);
  }

  // ─── UCB1 selection ────────────────────────────────────────────────────────

  /** Select the best operator to try next using UCB1. */
  async selectOperator(): Promise<WorkflowOperator> {
    const state = await this.load();
    return this.ucb1Select(state);
  }

  private ucb1Select(state: WorkflowMCTSState): WorkflowOperator {
    const N = Math.max(1, state.totalVisits);
    let best: WorkflowOperator = 'sequential';
    let bestScore = -Infinity;

    for (const [op, stats] of Object.entries(state.operators) as [WorkflowOperator, OperatorStats][]) {
      const score = stats.visits === 0
        ? Infinity // unvisited → always explore first
        : stats.avgScore + UCB_C * Math.sqrt(Math.log(N) / stats.visits);
      if (score > bestScore) {
        bestScore = score;
        best = op;
      }
    }
    return best;
  }

  /** Record an outcome (0–1 score) for the operator used in a session. */
  async recordOutcome(operator: WorkflowOperator, score: number): Promise<void> {
    const state = await this.load();
    const stats = state.operators[operator];
    stats.visits++;
    stats.totalScore += score;
    stats.avgScore = stats.totalScore / stats.visits;
    state.totalVisits++;
    state.lastUpdated = Date.now();

    // Update bestOperator to the one with highest avgScore (≥1 visit)
    let best: WorkflowOperator = 'sequential';
    let bestAvg = -1;
    for (const [op, s] of Object.entries(state.operators) as [WorkflowOperator, OperatorStats][]) {
      if (s.visits > 0 && s.avgScore > bestAvg) {
        bestAvg = s.avgScore;
        best = op;
      }
    }
    state.bestOperator = best;
    await this.save(state);
  }

  /** Get the currently best-performing operator (for applying to new sessions). */
  async getBestOperator(): Promise<WorkflowOperator> {
    const state = await this.load();
    return state.bestOperator;
  }

  /** Get full MCTS state for the dashboard. */
  async getState(): Promise<WorkflowMCTSState> {
    return this.load();
  }

  // ─── Archive-driven score update ──────────────────────────────────────────

  /**
   * Run one MCTS update cycle from ExperienceArchive.
   * Infers which operator each recent archive entry likely used from its
   * tool history, then updates the corresponding UCB1 stats.
   * Called by HeartbeatService.
   */
  async runArchiveCycle(): Promise<void> {
    const entries = await this.archive.query({ limit: 20, sortBy: 'timestamp' });
    if (entries.length === 0) return;

    for (const entry of entries) {
      const operator = this.inferOperator(entry);
      await this.recordOutcome(operator, entry.combinedScore);
    }

    const state = await this.load();
    console.log(`[WorkflowOptimizer] Cycle complete. Best operator: ${state.bestOperator} (avg=${state.operators[state.bestOperator].avgScore.toFixed(3)})`);
  }

  /**
   * Infer which workflow operator was likely used by examining tool history.
   * - ensemble:      multiple identical tool calls in sequence (fan-out pattern)
   * - review_revise: read_file → write_file → read_file pattern (read-write-verify)
   * - sequential:    default
   */
  private inferOperator(entry: ArchiveEntry): WorkflowOperator {
    const tools = entry.toolHistory.map(t => t.tool);

    // Ensemble signal: same tool called 2+ times consecutively
    for (let i = 0; i < tools.length - 1; i++) {
      if (tools[i] === tools[i + 1] && tools[i] !== 'write_file') {
        return 'ensemble';
      }
    }

    // ReviewRevise signal: write_file followed by read_file or run_shell (verify)
    const hasWriteThenVerify = tools.some((t, i) =>
      t === 'write_file' && i < tools.length - 1 &&
      (tools[i + 1] === 'read_file' || tools[i + 1] === 'run_shell')
    );
    if (hasWriteThenVerify) return 'review_revise';

    return 'sequential';
  }

  // ─── Operator application (called from AutonomousRunner) ──────────────────

  /**
   * Apply the ensemble operator: run the prompt twice in parallel,
   * then ask the LLM to pick the better response.
   */
  static async applyEnsemble(
    messages: LLMMessage[],
    providerId: string,
    options: { apiKey?: string; model?: string } = {}
  ): Promise<LLMMessage> {
    const [r1, r2] = await Promise.all([
      unifiedLLMService.chat(providerId, messages, options),
      unifiedLLMService.chat(providerId, messages, options),
    ]);

    // Vote: ask LLM to pick the better of the two responses
    const voteMessages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a response evaluator. You will be given two candidate responses to the same task. Pick the better one and output ONLY the full text of the chosen response, unchanged.'
      },
      {
        role: 'user',
        content: `RESPONSE A:\n${r1.content ?? ''}\n\nRESPONSE B:\n${r2.content ?? ''}\n\nPick the better response and output it verbatim.`
      }
    ];

    const voted = await unifiedLLMService.chat(providerId, voteMessages, options);
    return { role: 'assistant', content: voted.content } as LLMMessage;
  }

  /**
   * Apply the review-revise operator: run the prompt, then critique,
   * then refine (up to maxRounds).
   */
  static async applyReviewRevise(
    messages: LLMMessage[],
    providerId: string,
    options: { apiKey?: string; model?: string } = {},
    maxRounds = 1
  ): Promise<LLMMessage> {
    let responseContent: string | null = (await unifiedLLMService.chat(providerId, messages, options)).content;

    for (let round = 0; round < maxRounds; round++) {
      const critiqueMessages: LLMMessage[] = [
        ...messages,
        { role: 'assistant', content: responseContent } as LLMMessage,
        {
          role: 'user',
          content: 'Review your response above critically. Identify any errors, missing steps, or improvements. Then output a revised, improved version of your response. If the response is already correct and complete, output it unchanged.'
        } as LLMMessage,
      ];
      responseContent = (await unifiedLLMService.chat(providerId, critiqueMessages, options)).content;
    }

    return { role: 'assistant', content: responseContent } as LLMMessage;
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private async load(): Promise<WorkflowMCTSState> {
    try {
      if (await fs.pathExists(this.mctsPath)) {
        return await fs.readJson(this.mctsPath);
      }
    } catch { /* corrupt file — reset */ }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  private async save(state: WorkflowMCTSState): Promise<void> {
    await fs.ensureDir(path.dirname(this.mctsPath));
    await fs.writeJson(this.mctsPath, state, { spaces: 2 });
  }
}

/**
 * Convenience function for HeartbeatService.
 */
export async function runWorkflowOptimizerCycle(projectPath: string): Promise<void> {
  const optimizer = new WorkflowOptimizer(projectPath);
  await optimizer.runArchiveCycle();
}
