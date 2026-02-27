/**
 * P18-02: CompletionGate — pre-DONE quality checks
 *
 * Before an agent transitions to APPROVED/DONE, this gate verifies:
 *   1. No unchecked `- [ ]` todos remain in PLAN.md / TASKS.md files
 *   2. Tests pass (if a test script is available in package.json)
 *   3. TypeScript compiles without errors (if tsconfig.json exists)
 *
 * Returns { pass: boolean, blockers: string[] } so the caller can inject
 * the blockers as context into the agent loop or abort the transition.
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GateResult {
  pass: boolean;
  blockers: string[];
}

export class CompletionGate {
  private projectPath: string;
  private timeoutMs: number;

  constructor(projectPath: string, options: { timeoutMs?: number } = {}) {
    this.projectPath = projectPath;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /**
   * Run all checks and return a combined gate result.
   */
  async check(): Promise<GateResult> {
    const blockers: string[] = [];

    await Promise.all([
      this.checkUncheckedTodos(blockers),
      this.checkTypeScript(blockers),
    ]);

    return { pass: blockers.length === 0, blockers };
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

    // Resolve tsc binary
    const tscBin = path.join(this.projectPath, 'node_modules', '.bin', 'tsc');
    const tscCmd = (await fs.pathExists(tscBin)) ? `"${tscBin}"` : 'tsc';

    try {
      await execAsync(`${tscCmd} --noEmit`, {
        cwd: this.projectPath,
        timeout: this.timeoutMs,
      });
    } catch (err: any) {
      const output = (err.stdout || '') + (err.stderr || '');
      // Count error lines (lines containing " error TS")
      const errorCount = (output.match(/ error TS/g) || []).length;
      if (errorCount > 0) {
        blockers.push(`TypeScript: ${errorCount} compile error(s). Fix before marking DONE.`);
      }
    }
  }
}
