/**
 * P18-18: WorkflowTool — package multi-step workflows as single callable tools
 *
 * Workflows are JSON files in `.queenbee/workflows/` defining ordered sequences
 * of tool calls. Agents can discover and execute them via `list_workflows` and
 * `run_workflow` tools.
 *
 * Common built-in workflows seeded on first use:
 *  - test-and-commit: run tests → commit if passing
 *  - lint-and-fix: run linter → auto-fix → verify
 *  - check-types: tsc → report errors
 *  - full-qa: lint + types + tests in sequence
 *
 * Pattern from dify workflow-as-tool composition.
 */

import fs from 'fs-extra';
import path from 'path';

export interface WorkflowStep {
  tool: string;
  args: Record<string, any>;
  description?: string;
  continueOnError?: boolean; // If true, next step runs even if this one fails
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  triggers?: string[]; // Keywords that suggest this workflow
  steps: WorkflowStep[];
  successCriteria?: string[];
}

export interface WorkflowResult {
  workflowName: string;
  success: boolean;
  stepsCompleted: number;
  stepsTotal: number;
  results: Array<{
    step: number;
    tool: string;
    success: boolean;
    result: any;
  }>;
  summary: string;
}

const WORKFLOWS_DIR = '.queenbee/workflows';

// Default starter workflows
const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [
  {
    name: 'test-and-commit',
    description: 'Run tests and commit if all pass',
    triggers: ['test', 'commit', 'verify'],
    steps: [
      { tool: 'run_shell', args: { command: 'npm test 2>&1 | tail -20' }, description: 'Run test suite' },
      { tool: 'run_shell', args: { command: 'git add -A && git diff --cached --stat' }, description: 'Stage changes' },
    ],
    successCriteria: ['All tests pass', 'Changes committed'],
  },
  {
    name: 'lint-and-fix',
    description: 'Run linter and attempt to auto-fix issues',
    triggers: ['lint', 'eslint', 'style', 'format'],
    steps: [
      { tool: 'run_shell', args: { command: 'npx eslint . --ext .ts,.tsx --fix 2>&1 | tail -20' }, description: 'Run ESLint with auto-fix', continueOnError: true },
      { tool: 'run_shell', args: { command: 'npx prettier --write "src/**/*.{ts,tsx}" 2>&1 | tail -10' }, description: 'Format with Prettier', continueOnError: true },
      { tool: 'run_shell', args: { command: 'npx eslint . --ext .ts,.tsx 2>&1 | tail -10' }, description: 'Verify no remaining lint errors' },
    ],
    successCriteria: ['No lint errors remaining'],
  },
  {
    name: 'check-types',
    description: 'Run TypeScript type check and report errors',
    triggers: ['typescript', 'types', 'tsc', 'compile'],
    steps: [
      { tool: 'run_shell', args: { command: 'npx tsc --noEmit 2>&1 | head -30' }, description: 'TypeScript compilation check' },
    ],
    successCriteria: ['Zero TypeScript errors'],
  },
  {
    name: 'full-qa',
    description: 'Run full quality assurance: lint → types → tests',
    triggers: ['qa', 'quality', 'ci', 'all checks'],
    steps: [
      { tool: 'run_shell', args: { command: 'npx eslint . --ext .ts,.tsx 2>&1 | tail -10' }, description: 'Lint check', continueOnError: true },
      { tool: 'run_shell', args: { command: 'npx tsc --noEmit 2>&1 | head -20' }, description: 'Type check', continueOnError: true },
      { tool: 'run_shell', args: { command: 'npm test 2>&1 | tail -20' }, description: 'Run tests', continueOnError: true },
    ],
    successCriteria: ['No lint errors', 'No type errors', 'All tests pass'],
  },
  {
    name: 'git-status-and-diff',
    description: 'Show git status and recent changes',
    triggers: ['diff', 'status', 'changes', 'what changed'],
    steps: [
      { tool: 'run_shell', args: { command: 'git status --short' }, description: 'Show changed files' },
      { tool: 'run_shell', args: { command: 'git diff --stat HEAD' }, description: 'Show diff stats' },
    ],
  },
];

export class WorkflowTool {
  private workflowsDir: string;

  constructor(projectPath: string) {
    this.workflowsDir = path.join(projectPath, WORKFLOWS_DIR);
  }

  /** Ensure default workflows are seeded. */
  async ensureDefaults(): Promise<void> {
    await fs.ensureDir(this.workflowsDir);
    for (const wf of DEFAULT_WORKFLOWS) {
      const file = path.join(this.workflowsDir, `${wf.name}.json`);
      if (!(await fs.pathExists(file))) {
        await fs.writeJson(file, wf, { spaces: 2 });
      }
    }
  }

  /** List all available workflows. */
  async listAll(): Promise<WorkflowDefinition[]> {
    await this.ensureDefaults();
    const files = await fs.readdir(this.workflowsDir);
    const workflows: WorkflowDefinition[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const wf = await fs.readJson(path.join(this.workflowsDir, file));
        workflows.push(wf);
      } catch { /* skip */ }
    }

    return workflows;
  }

  /** Load a workflow by name. */
  async load(name: string): Promise<WorkflowDefinition | null> {
    const file = path.join(this.workflowsDir, `${name}.json`);
    if (!(await fs.pathExists(file))) return null;
    try { return await fs.readJson(file); } catch { return null; }
  }

  /**
   * Execute a workflow by sequentially running its tool steps.
   * Each step result is passed to the next step via the result context.
   * Returns a structured result summary.
   */
  async execute(
    workflowName: string,
    toolExecutor: { execute: (tool: any, ctx: any) => Promise<any> },
    context: { projectPath: string; threadId?: string; agentId?: string }
  ): Promise<WorkflowResult> {
    const wf = await this.load(workflowName);
    if (!wf) {
      return {
        workflowName,
        success: false,
        stepsCompleted: 0,
        stepsTotal: 0,
        results: [],
        summary: `Workflow '${workflowName}' not found.`,
      };
    }

    const results: WorkflowResult['results'] = [];
    let stepsCompleted = 0;

    for (let i = 0; i < wf.steps.length; i++) {
      const step = wf.steps[i];
      let stepSuccess = false;
      let stepResult: any = null;

      try {
        stepResult = await toolExecutor.execute(
          { name: step.tool, arguments: step.args, id: `wf-${workflowName}-step-${i}` },
          { ...context }
        );
        stepSuccess = true;
        stepsCompleted++;
      } catch (err: any) {
        stepResult = { error: err.message };
        if (!step.continueOnError) {
          results.push({ step: i + 1, tool: step.tool, success: false, result: stepResult });
          break;
        }
      }

      results.push({ step: i + 1, tool: step.tool, success: stepSuccess, result: stepResult });
    }

    const allPassed = stepsCompleted === wf.steps.length;
    const summary = allPassed
      ? `✓ Workflow '${workflowName}' completed (${stepsCompleted}/${wf.steps.length} steps passed)`
      : `✗ Workflow '${workflowName}' partially completed (${stepsCompleted}/${wf.steps.length} steps)`;

    return {
      workflowName,
      success: allPassed,
      stepsCompleted,
      stepsTotal: wf.steps.length,
      results,
      summary,
    };
  }
}
