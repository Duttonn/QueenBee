/**
 * P18-02: CompletionGate — pre-DONE quality checks (Enhanced with Verification Pipeline)
 *
 * Before an agent transitions to APPROVED/DONE, this gate verifies:
 *   1. No unchecked `- [ ]` todos remain in PLAN.md / TASKS.md files
 *   2. TypeScript compiles without errors (if tsconfig.json exists)
 *   3. Tests pass (if a test script is available)
 *   4. Lint passes (if a lint script is available)
 *   5. TruthScorer — validates agent claims against actual filesystem state
 *
 * Returns { pass: boolean, blockers: string[], scores: TruthScore } so the caller
 * can inject the blockers as context into the agent loop or abort the transition.
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LLMJudge, JudgeInput, JudgeResult } from './LLMJudge';

const execAsync = promisify(exec);

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface GateResult {
  pass: boolean;
  blockers: string[];
  /** Per-checkpoint results for observability */
  checkpoints: CheckpointResult[];
  /** Truth scoring result (null if no claims to validate) */
  truthScore: TruthScore | null;
  /** LLM Judge result (null if no judge input provided) */
  judgeResult: JudgeResult | null;
}

export interface CheckpointResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

export interface TruthScore {
  /** Overall score 0-1 */
  overall: number;
  /** Individual component scores */
  components: {
    fileModificationAccuracy: number;
    claimConsistency: number;
  };
  /** Details of what was validated */
  details: string[];
}

export interface AgentClaim {
  /** Files the agent said it wrote/modified */
  filesModified?: string[];
  /** Files the agent said it created */
  filesCreated?: string[];
  /** Whether the agent claimed to fix a specific issue */
  claimedFix?: string;
  /** Raw tool calls from the session for validation */
  toolCalls?: Array<{ tool: string; args: Record<string, any>; result?: string }>;
}

/* ─── CompletionGate ────────────────────────────────────────────────── */

export class CompletionGate {
  private projectPath: string;
  private timeoutMs: number;

  constructor(projectPath: string, options: { timeoutMs?: number } = {}) {
    this.projectPath = projectPath;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /**
   * Run all verification checkpoints and return a combined gate result.
   * Checkpoints run in order — each is independent (no rollback needed).
   */
  async check(agentClaims?: AgentClaim, judgeInput?: JudgeInput): Promise<GateResult> {
    const blockers: string[] = [];
    const checkpoints: CheckpointResult[] = [];

    // Checkpoint 1: Unchecked todos
    const todoCp = await this.runCheckpoint('unchecked_todos', () => this.checkUncheckedTodos(blockers));
    checkpoints.push(todoCp);

    // Checkpoint 2: TypeScript compilation
    const tsCp = await this.runCheckpoint('typescript', () => this.checkTypeScript(blockers));
    checkpoints.push(tsCp);

    // Checkpoint 3: Test execution
    const testCp = await this.runCheckpoint('tests', () => this.checkTests(blockers));
    checkpoints.push(testCp);

    // Checkpoint 4: Lint
    const lintCp = await this.runCheckpoint('lint', () => this.checkLint(blockers));
    checkpoints.push(lintCp);

    // Checkpoint 5: Truth scoring (validates agent claims against filesystem)
    let truthScore: TruthScore | null = null;
    if (agentClaims) {
      const truthCp = await this.runCheckpoint('truth_scoring', async () => {
        truthScore = await TruthScorer.score(this.projectPath, agentClaims);
        if (truthScore.overall < 0.5) {
          blockers.push(`TruthScore: ${(truthScore.overall * 100).toFixed(0)}% — agent claims don't match filesystem. ${truthScore.details.join('; ')}`);
        }
      });
      checkpoints.push(truthCp);
    }

    // Checkpoint 6: LLM-as-Judge quality evaluation (P20-01)
    let judgeResult: JudgeResult | null = null;
    if (judgeInput) {
      const judgeCp = await this.runCheckpoint('llm_judge', async () => {
        judgeResult = await LLMJudge.judge(judgeInput, {
          threshold: 60,
          projectPath: this.projectPath,
        });
        if (!judgeResult.passed) {
          blockers.push(`LLM Judge: score ${judgeResult.score}/100 (threshold 60). Feedback: ${judgeResult.feedback}`);
        }
      });
      checkpoints.push(judgeCp);
    }

    return {
      pass: blockers.length === 0,
      blockers,
      checkpoints,
      truthScore,
      judgeResult,
    };
  }

  /* ─── Individual Checkpoints ─────────────────────────────────────── */

  private async runCheckpoint(name: string, fn: () => Promise<void>): Promise<CheckpointResult> {
    const start = Date.now();
    try {
      await fn();
      return { name, passed: true, durationMs: Date.now() - start };
    } catch (err: any) {
      return { name, passed: false, message: err.message, durationMs: Date.now() - start };
    }
  }

  /** Check for unchecked markdown todo items in plan/task files. */
  private async checkUncheckedTodos(blockers: string[]): Promise<void> {
    const candidates = [
      'PLAN.md', 'plan.md',
      'TASKS.md', 'tasks.md',
      'TODO.md', 'todo.md',
      'GSD_TASKS.md',
    ];

    for (const name of candidates) {
      const filePath = path.join(this.projectPath, name);
      if (!(await fs.pathExists(filePath))) continue;

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const unchecked = lines
          .map((l, i) => ({ line: l, num: i + 1 }))
          .filter(({ line }) => /^\s*-\s*\[ \]/.test(line))
          .slice(0, 5); // Only report first 5 to keep context tight

        if (unchecked.length > 0) {
          blockers.push(
            `${name} has ${unchecked.length} unchecked todo(s): lines ${unchecked.map(u => u.num).join(', ')}`
          );
        }
      } catch {
        // File unreadable — skip
      }
    }
  }

  /** Check TypeScript compilation if tsconfig.json exists. */
  private async checkTypeScript(blockers: string[]): Promise<void> {
    const tsconfigPath = path.join(this.projectPath, 'tsconfig.json');
    if (!(await fs.pathExists(tsconfigPath))) return;

    const tscBin = path.join(this.projectPath, 'node_modules', '.bin', 'tsc');
    const tscCmd = (await fs.pathExists(tscBin)) ? `"${tscBin}"` : 'tsc';

    try {
      await execAsync(`${tscCmd} --noEmit`, {
        cwd: this.projectPath,
        timeout: this.timeoutMs,
      });
    } catch (err: any) {
      const output = (err.stdout || '') + (err.stderr || '');
      const errorCount = (output.match(/ error TS/g) || []).length;
      if (errorCount > 0) {
        blockers.push(`TypeScript: ${errorCount} compile error(s). Fix before marking DONE.`);
      }
    }
  }

  /** Check if tests pass (looks for test/test:ci script in package.json). */
  private async checkTests(blockers: string[]): Promise<void> {
    const pkgPath = path.join(this.projectPath, 'package.json');
    if (!(await fs.pathExists(pkgPath))) return;

    try {
      const pkg = await fs.readJson(pkgPath);
      const testScript = pkg.scripts?.['test:ci'] || pkg.scripts?.test;
      if (!testScript) return;
      // Skip if test script is the default npm "no test specified"
      if (testScript.includes('no test specified')) return;

      const npmBin = 'npm';
      const scriptName = pkg.scripts?.['test:ci'] ? 'test:ci' : 'test';

      await execAsync(`${npmBin} run ${scriptName} --if-present 2>&1`, {
        cwd: this.projectPath,
        timeout: this.timeoutMs,
        env: { ...process.env, CI: 'true' },
      });
    } catch (err: any) {
      const output = (err.stdout || '') + (err.stderr || '');
      // Extract failure count from common test runners
      const jestMatch = output.match(/Tests:\s+(\d+) failed/);
      const vitestMatch = output.match(/(\d+) failed/);
      const failCount = jestMatch?.[1] || vitestMatch?.[1] || 'unknown';
      blockers.push(`Tests: ${failCount} test(s) failed. Fix before marking DONE.`);
    }
  }

  /** Check if lint passes (looks for lint script in package.json). */
  private async checkLint(blockers: string[]): Promise<void> {
    const pkgPath = path.join(this.projectPath, 'package.json');
    if (!(await fs.pathExists(pkgPath))) return;

    try {
      const pkg = await fs.readJson(pkgPath);
      if (!pkg.scripts?.lint) return;

      await execAsync('npm run lint --if-present 2>&1', {
        cwd: this.projectPath,
        timeout: this.timeoutMs,
      });
    } catch (err: any) {
      const output = (err.stdout || '') + (err.stderr || '');
      const errorMatch = output.match(/(\d+) errors?/);
      const errorCount = errorMatch?.[1] || 'some';
      blockers.push(`Lint: ${errorCount} error(s). Fix before marking DONE.`);
    }
  }
}

/* ─── TruthScorer ───────────────────────────────────────────────────── */

/**
 * Validates agent output claims against actual filesystem state.
 * Produces a 0-1 score indicating how truthful the agent's claims are.
 */
export class TruthScorer {
  /**
   * Score agent claims against filesystem reality.
   */
  static async score(projectPath: string, claims: AgentClaim): Promise<TruthScore> {
    const details: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Component 1: File modification accuracy
    // Did files the agent claimed to modify actually get modified?
    let fileModAccuracy = 1.0;
    if (claims.filesModified && claims.filesModified.length > 0) {
      let modifiedCount = 0;
      for (const f of claims.filesModified) {
        totalChecks++;
        const fullPath = path.isAbsolute(f) ? f : path.join(projectPath, f);
        if (await fs.pathExists(fullPath)) {
          // Check if file was recently modified (within last 5 minutes)
          const stat = await fs.stat(fullPath);
          const fiveMinAgo = Date.now() - 5 * 60 * 1000;
          if (stat.mtimeMs >= fiveMinAgo) {
            modifiedCount++;
            passedChecks++;
          } else {
            details.push(`${f}: claimed modified but last changed ${Math.round((Date.now() - stat.mtimeMs) / 60000)}m ago`);
          }
        } else {
          details.push(`${f}: claimed modified but file does not exist`);
        }
      }
      fileModAccuracy = claims.filesModified.length > 0
        ? modifiedCount / claims.filesModified.length
        : 1.0;
    }

    // Component 2: File creation accuracy
    if (claims.filesCreated && claims.filesCreated.length > 0) {
      for (const f of claims.filesCreated) {
        totalChecks++;
        const fullPath = path.isAbsolute(f) ? f : path.join(projectPath, f);
        if (await fs.pathExists(fullPath)) {
          passedChecks++;
        } else {
          details.push(`${f}: claimed created but file does not exist`);
        }
      }
    }

    // Component 3: Tool call validation
    // Cross-reference write_file tool calls with actual file existence
    let claimConsistency = 1.0;
    if (claims.toolCalls && claims.toolCalls.length > 0) {
      const writeToolCalls = claims.toolCalls.filter(
        tc => tc.tool === 'write_file' || tc.tool === 'replace'
      );
      let consistentCount = 0;
      for (const tc of writeToolCalls) {
        totalChecks++;
        const filePath = tc.args?.path || tc.args?.file_path;
        if (filePath) {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
          if (await fs.pathExists(fullPath)) {
            consistentCount++;
            passedChecks++;
          } else {
            details.push(`Tool ${tc.tool}(${filePath}): file missing after write`);
          }
        } else {
          passedChecks++; // No path to validate
          consistentCount++;
        }
      }
      claimConsistency = writeToolCalls.length > 0
        ? consistentCount / writeToolCalls.length
        : 1.0;
    }

    const overall = totalChecks > 0 ? passedChecks / totalChecks : 1.0;

    return {
      overall,
      components: {
        fileModificationAccuracy: fileModAccuracy,
        claimConsistency,
      },
      details,
    };
  }
}
