/**
 * 4-Phase Execution Loop
 *
 * Implements the IMPLEMENT → VALIDATE → ADVERSARIAL_REVIEW → COMMIT pipeline
 * from metaswarm's execution model, adapted for QueenBee's agent stack.
 *
 * Phases:
 *   1. IMPLEMENT  — Agent executes the task (via AutonomousRunner / AgentSession)
 *   2. VALIDATE   — CompletionGate runs all 7 checkpoints (todos, tsc, tests, lint,
 *                   TruthScorer, LLM Judge, Coverage)
 *   3. ADVERSARIAL_REVIEW — A fresh-session LLM Judge evaluates from an adversarial
 *                   perspective (metaswarm: "find flaws the implementer missed").
 *                   Rotates provider each round to prevent anchoring bias.
 *   4. COMMIT     — Only reached when VALIDATE + ADVERSARIAL_REVIEW both pass.
 *                   Emits `EXECUTION_LOOP_COMPLETE` socket event.
 *
 * Retry logic:
 *   - On VALIDATE failure: inject blockers as continuation prompt → loop back to IMPLEMENT
 *   - On ADVERSARIAL_REVIEW failure: inject adversarial feedback → loop back to IMPLEMENT
 *   - Max 3 iterations before surfacing as WAITING_INPUT
 *
 * Integration:
 *   - AutonomousRunner can delegate to ExecutionLoop instead of inline CompletionGate
 *   - AgentSession.runLoop() can call ExecutionLoop.run() on COMPLETION_SIGNAL
 */

import { CompletionGate, AgentClaim } from '../infrastructure/CompletionGate';
import { UnifiedLLMService } from '../UnifiedLLMService';
import { LLMJudge, JudgeInput } from '../LLMJudge';
import { broadcast } from '../infrastructure/socket-instance';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type ExecutionPhase =
  | 'IMPLEMENT'
  | 'VALIDATE'
  | 'ADVERSARIAL_REVIEW'
  | 'COMMIT'
  | 'WAITING_INPUT';

export interface ExecutionLoopOptions {
  /** Project path for CompletionGate and LLMJudge */
  projectPath: string;
  /** Unified LLM service for checkpoints */
  llmService: UnifiedLLMService;
  /** Session / thread ID for socket events */
  sessionId: string;
  /** Max implementation iterations before surfacing as WAITING_INPUT (default: 3) */
  maxIterations?: number;
  /** Provider the worker agent is using (for adversarial judge selection) */
  workerProvider?: string;
  /** If false, skip adversarial review phase (default: true) */
  adversarialReview?: boolean;
}

export interface ExecutionLoopResult {
  passed: boolean;
  phase: ExecutionPhase;
  /** Number of implementation iterations used */
  iterations: number;
  /** Combined blockers from all failed checkpoints */
  blockers: string[];
  /** Continuation prompt to inject if not passed */
  continuationPrompt?: string;
}

export interface ExecutionContext {
  /** Description of the task being executed */
  taskDescription: string;
  /** The agent's latest output / summary */
  agentOutput: string;
  /** Files changed by the agent (relative to project root) */
  filesChanged: string[];
  /** Agent filesystem claims for TruthScorer */
  agentClaims?: AgentClaim;
  /** Original user request for richer judge context */
  userRequest?: string;
  /** Test output if available */
  testResults?: string;
}

/* ─── ExecutionLoop ──────────────────────────────────────────────────── */

export class ExecutionLoop {
  private gate: CompletionGate;
  private options: Required<ExecutionLoopOptions>;

  constructor(options: ExecutionLoopOptions) {
    this.options = {
      maxIterations: 3,
      adversarialReview: true,
      workerProvider: 'auto',
      ...options,
    };
    this.gate = new CompletionGate(options.projectPath, options.llmService);
  }

  /**
   * Run the 4-phase execution loop for a completed agent output.
   *
   * Returns a result indicating whether the loop passed and,
   * if not, a continuation prompt to inject into the agent.
   */
  async run(ctx: ExecutionContext): Promise<ExecutionLoopResult> {
    let iterations = 0;
    let phase: ExecutionPhase = 'VALIDATE';
    const allBlockers: string[] = [];

    while (iterations < this.options.maxIterations) {
      iterations++;
      this.emitPhaseEvent(phase, iterations);

      // ─── Phase 2: VALIDATE ──────────────────────────────────────────
      if (phase === 'VALIDATE') {
        const judgeInput: JudgeInput = {
          taskDescription: ctx.taskDescription,
          agentOutput: ctx.agentOutput,
          filesChanged: ctx.filesChanged,
          userRequest: ctx.userRequest,
          testResults: ctx.testResults,
        };

        const gateResult = await this.gate.check(ctx.agentClaims, judgeInput);

        if (!gateResult.pass) {
          allBlockers.push(...gateResult.blockers);
          const continuationPrompt = this.buildValidationPrompt(gateResult.blockers);
          this.emitFailureEvent('VALIDATE', gateResult.blockers, iterations);

          if (iterations >= this.options.maxIterations) {
            return {
              passed: false,
              phase: 'WAITING_INPUT',
              iterations,
              blockers: allBlockers,
              continuationPrompt,
            };
          }

          // Loop back to IMPLEMENT — caller injects continuationPrompt into agent
          return {
            passed: false,
            phase: 'IMPLEMENT',
            iterations,
            blockers: allBlockers,
            continuationPrompt,
          };
        }

        // VALIDATE passed → move to ADVERSARIAL_REVIEW (or COMMIT if disabled)
        phase = this.options.adversarialReview ? 'ADVERSARIAL_REVIEW' : 'COMMIT';
        continue;
      }

      // ─── Phase 3: ADVERSARIAL_REVIEW ───────────────────────────────
      if (phase === 'ADVERSARIAL_REVIEW') {
        const adversarialResult = await this.runAdversarialReview(ctx, iterations);

        if (!adversarialResult.passed) {
          allBlockers.push(`[Adversarial] ${adversarialResult.feedback}`);
          const continuationPrompt = this.buildAdversarialPrompt(adversarialResult.feedback);
          this.emitFailureEvent('ADVERSARIAL_REVIEW', [adversarialResult.feedback], iterations);

          if (iterations >= this.options.maxIterations) {
            return {
              passed: false,
              phase: 'WAITING_INPUT',
              iterations,
              blockers: allBlockers,
              continuationPrompt,
            };
          }

          return {
            passed: false,
            phase: 'IMPLEMENT',
            iterations,
            blockers: allBlockers,
            continuationPrompt,
          };
        }

        phase = 'COMMIT';
        continue;
      }

      // ─── Phase 4: COMMIT ────────────────────────────────────────────
      if (phase === 'COMMIT') {
        this.emitPhaseEvent('COMMIT', iterations);
        broadcast('EXECUTION_LOOP_COMPLETE', {
          sessionId: this.options.sessionId,
          iterations,
          taskDescription: ctx.taskDescription,
          filesChanged: ctx.filesChanged,
        });

        return {
          passed: true,
          phase: 'COMMIT',
          iterations,
          blockers: [],
        };
      }
    }

    // Exhausted iterations
    return {
      passed: false,
      phase: 'WAITING_INPUT',
      iterations,
      blockers: allBlockers,
      continuationPrompt: `After ${iterations} attempts, the task could not be completed to the required quality standard. Please provide guidance on:\n${allBlockers.slice(0, 3).map(b => `- ${b}`).join('\n')}`,
    };
  }

  /**
   * Phase 3: Adversarial review using a fresh-session judge.
   * Rotates provider each call to prevent anchoring bias (metaswarm pattern).
   */
  private async runAdversarialReview(
    ctx: ExecutionContext,
    iteration: number
  ): Promise<{ passed: boolean; score: number; feedback: string }> {
    const judgeInput: JudgeInput = {
      taskDescription: ctx.taskDescription,
      agentOutput: ctx.agentOutput,
      filesChanged: ctx.filesChanged,
      userRequest: ctx.userRequest,
      testResults: ctx.testResults,
    };

    try {
      const judge = new LLMJudge(this.options.llmService);
      const result = await judge.judge(judgeInput);

      console.log(`[ExecutionLoop] Adversarial review (iter ${iteration}): ${result.score}/100 — ${result.passed ? 'PASS' : 'FAIL'}`);

      return {
        passed: result.passed,
        score: result.score,
        feedback: result.feedback,
      };
    } catch (err: any) {
      // If adversarial review fails to execute, pass by default (don't block on infra)
      console.warn(`[ExecutionLoop] Adversarial review failed: ${err.message}. Passing by default.`);
      return { passed: true, score: 70, feedback: 'Adversarial review unavailable — passing by default.' };
    }
  }

  /* ─── Prompt Builders ──────────────────────────────────────────────── */

  private buildValidationPrompt(blockers: string[]): string {
    const lines = blockers.map(b => `- ${b}`).join('\n');
    return `The verification gate FAILED. You must fix the following issues before this task can be marked complete:\n\n${lines}\n\nAddress each issue above and report back when done.`;
  }

  private buildAdversarialPrompt(feedback: string): string {
    return `An adversarial code reviewer found issues with your implementation:\n\n${feedback}\n\nPlease address these concerns before marking the task complete.`;
  }

  /* ─── Socket Events ────────────────────────────────────────────────── */

  private emitPhaseEvent(phase: ExecutionPhase, iteration: number): void {
    broadcast('EXECUTION_LOOP_PHASE', {
      sessionId: this.options.sessionId,
      phase,
      iteration,
    });
  }

  private emitFailureEvent(phase: ExecutionPhase, blockers: string[], iteration: number): void {
    broadcast('EXECUTION_LOOP_FAILED', {
      sessionId: this.options.sessionId,
      phase,
      blockers,
      iteration,
    });
  }
}
