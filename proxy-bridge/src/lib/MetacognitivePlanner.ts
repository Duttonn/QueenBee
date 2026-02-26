/**
 * P17-05: MetacognitivePlanner
 * Tracks per-task-type success rates, detects learning stagnation (LP),
 * and triggers focused GEA reflection only when needed.
 * Based on: Self-Evolving Agents Survey (arXiv:2508.07407),
 *           ICML Position Paper (arXiv:2506.05109),
 *           MAGELLAN (arXiv:2502.07709)
 */

import fs from 'fs-extra';
import path from 'path';

// Window size for per-task-type outcome tracking
const WINDOW_SIZE = 20;

// Minimum attempts before LP stagnation check is meaningful
const MIN_ATTEMPTS = 10;

// LP threshold — if improvement between first/second half is ≤ this, trigger reflection
const LP_STAGNATION_THRESHOLD = 0.05;

// Number of consecutive triggers (without LP improvement) before second-order reflection
const SECOND_ORDER_TRIGGER_COUNT = 3;

/**
 * Outcome window for a single task type.
 */
interface TaskTypeState {
  /** Sliding window of last WINDOW_SIZE outcomes (true = success, false = failure) */
  outcomes: boolean[];
  /** How many consecutive times this task type has triggered reflection without LP improvement */
  consecutiveTriggerCount: number;
  /** LP value at the time of the last trigger (used to detect true improvement) */
  lpAtLastTrigger: number | null;
}

/**
 * Persisted state shape written to .queenbee/metacognitive-state.json
 */
interface MetacognitiveState {
  taskTypes: Record<string, TaskTypeState>;
  /** Heartbeat cycle counter — used for every-N-cycles forced reflection */
  heartbeatCycleCount: number;
}

/**
 * Maps keywords found in task descriptions to canonical task type labels.
 * Order matters: first matching keyword wins.
 */
const TASK_TYPE_KEYWORDS: Array<{ keywords: string[]; type: string }> = [
  { keywords: ['test', 'spec', 'coverage', 'jest', 'vitest', 'unit', 'integration'], type: 'testing' },
  { keywords: ['refactor', 'cleanup', 'lint', 'format', 'tidy', 'reorganize'], type: 'refactoring' },
  { keywords: ['bug', 'fix', 'error', 'crash', 'exception', 'regression', 'broken'], type: 'bugfix' },
  { keywords: ['feat', 'feature', 'implement', 'add', 'build', 'create', 'new'], type: 'feature' },
  { keywords: ['doc', 'readme', 'comment', 'jsdoc', 'tsdoc', 'explain'], type: 'documentation' },
  { keywords: ['deploy', 'release', 'ci', 'cd', 'pipeline', 'docker', 'build'], type: 'devops' },
  { keywords: ['review', 'analyse', 'analyze', 'audit', 'scan', 'check'], type: 'review' },
  { keywords: ['migrate', 'migration', 'upgrade', 'update', 'bump'], type: 'migration' },
  { keywords: ['perf', 'optim', 'speed', 'latency', 'throughput', 'memory'], type: 'performance' },
  { keywords: ['design', 'architect', 'structure', 'model', 'schema', 'plan'], type: 'architecture' },
];

const DEFAULT_TASK_TYPE = 'general';

export class MetacognitivePlanner {
  private projectPath: string;
  private statePath: string;
  private state: MetacognitiveState;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.statePath = path.join(projectPath, '.queenbee', 'metacognitive-state.json');
    this.state = {
      taskTypes: {},
      heartbeatCycleCount: 0,
    };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Detect the task type from a free-text task description using keyword matching.
   */
  detectTaskType(taskDescription: string): string {
    const lower = taskDescription.toLowerCase();
    for (const { keywords, type } of TASK_TYPE_KEYWORDS) {
      if (keywords.some(kw => lower.includes(kw))) {
        return type;
      }
    }
    return DEFAULT_TASK_TYPE;
  }

  /**
   * Record the outcome of a completed task.
   * Appends to the sliding window for the detected task type and trims to WINDOW_SIZE.
   */
  recordOutcome(taskDescription: string, success: boolean): void {
    const taskType = this.detectTaskType(taskDescription);
    if (!this.state.taskTypes[taskType]) {
      this.state.taskTypes[taskType] = {
        outcomes: [],
        consecutiveTriggerCount: 0,
        lpAtLastTrigger: null,
      };
    }
    const ts = this.state.taskTypes[taskType];
    ts.outcomes.push(success);
    if (ts.outcomes.length > WINDOW_SIZE) {
      ts.outcomes = ts.outcomes.slice(-WINDOW_SIZE);
    }
  }

  /**
   * Increment the heartbeat cycle counter.
   * Returns the new count so callers can check modulo thresholds.
   */
  incrementCycleCount(): number {
    this.state.heartbeatCycleCount += 1;
    return this.state.heartbeatCycleCount;
  }

  /**
   * Get current heartbeat cycle count.
   */
  getCycleCount(): number {
    return this.state.heartbeatCycleCount;
  }

  /**
   * Learning Progress for a task type:
   * LP = successRate(second half of window) - successRate(first half of window)
   * Returns 0 if insufficient data.
   */
  getLearningProgress(taskType: string): number {
    const ts = this.state.taskTypes[taskType];
    if (!ts || ts.outcomes.length < MIN_ATTEMPTS) return 0;

    const outcomes = ts.outcomes;
    const midpoint = Math.floor(outcomes.length / 2);
    const firstHalf  = outcomes.slice(0, midpoint);
    const secondHalf = outcomes.slice(midpoint);

    const rate = (arr: boolean[]) =>
      arr.length === 0 ? 0 : arr.filter(Boolean).length / arr.length;

    return rate(secondHalf) - rate(firstHalf);
  }

  /**
   * Check whether any task type has stagnated (LP ≤ LP_STAGNATION_THRESHOLD with ≥ MIN_ATTEMPTS).
   * Returns the first stagnating task type found, or triggered=false.
   */
  hasTrigger(): { triggered: boolean; taskType?: string; stagnationRate?: number } {
    for (const [taskType, ts] of Object.entries(this.state.taskTypes)) {
      if (ts.outcomes.length < MIN_ATTEMPTS) continue;

      const lp = this.getLearningProgress(taskType);
      if (lp <= LP_STAGNATION_THRESHOLD) {
        const successRate = ts.outcomes.filter(Boolean).length / ts.outcomes.length;
        return { triggered: true, taskType, stagnationRate: successRate };
      }
    }
    return { triggered: false };
  }

  /**
   * Second-order trigger: if any task type has triggered SECOND_ORDER_TRIGGER_COUNT consecutive
   * times without LP improvement, return a meta-reflection prompt.
   */
  getSecondOrderTrigger(): string | null {
    for (const [taskType, ts] of Object.entries(this.state.taskTypes)) {
      if (ts.consecutiveTriggerCount >= SECOND_ORDER_TRIGGER_COUNT) {
        const lp = this.getLearningProgress(taskType);
        return (
          `[META-REFLECTION] Task type "${taskType}" has stagnated for ` +
          `${ts.consecutiveTriggerCount} consecutive reflection cycles without improvement ` +
          `(current LP=${lp.toFixed(3)}). ` +
          `Consider fundamentally revising the strategy or tool selection for tasks of this type. ` +
          `Root causes to explore: ` +
          `(1) are the task decompositions too coarse? ` +
          `(2) is the wrong tool being selected for "${taskType}" tasks? ` +
          `(3) is there a systematic knowledge gap that needs addressing via external resources?`
        );
      }
    }
    return null;
  }

  /**
   * After reflection has been triggered and handled for a task type,
   * update the consecutive trigger counter.
   * If LP has not improved since the last trigger, increment the counter.
   * If LP has improved, reset it.
   */
  markTriggerHandled(taskType: string): void {
    const ts = this.state.taskTypes[taskType];
    if (!ts) return;

    const currentLP = this.getLearningProgress(taskType);
    const lastLP    = ts.lpAtLastTrigger;

    if (lastLP === null || currentLP > lastLP + LP_STAGNATION_THRESHOLD) {
      // Real improvement — reset consecutive trigger count
      ts.consecutiveTriggerCount = 0;
    } else {
      // No meaningful improvement — increment consecutive trigger count
      ts.consecutiveTriggerCount += 1;
    }

    ts.lpAtLastTrigger = currentLP;
  }

  /**
   * Persist state to .queenbee/metacognitive-state.json
   */
  async save(): Promise<void> {
    await fs.ensureDir(path.dirname(this.statePath));
    await fs.writeJson(this.statePath, this.state, { spaces: 2 });
  }

  /**
   * Load state from .queenbee/metacognitive-state.json (idempotent — safe if file missing).
   */
  async load(): Promise<void> {
    try {
      if (await fs.pathExists(this.statePath)) {
        const loaded = await fs.readJson(this.statePath) as Partial<MetacognitiveState>;
        this.state = {
          taskTypes:           loaded.taskTypes           ?? {},
          heartbeatCycleCount: loaded.heartbeatCycleCount ?? 0,
        };
      }
    } catch (err) {
      console.warn('[MetacognitivePlanner] Failed to load state, starting fresh:', err);
      this.state = { taskTypes: {}, heartbeatCycleCount: 0 };
    }
  }
}
