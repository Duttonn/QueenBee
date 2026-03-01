import fs from 'fs-extra';
import path from 'path';

/* ─── Types ─────────────────────────────────────────────────────────── */

/**
 * Rich dependency types (inspired by ruflo TaskEngine):
 * - finish_to_start (f2s): B cannot start until A finishes (default)
 * - start_to_start  (s2s): B cannot start until A starts
 * - finish_to_finish (f2f): B cannot finish until A finishes
 */
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish';

export interface TaskDependency {
  taskId: string;
  type: DependencyType;
}

export interface TaskCheckpoint {
  taskId: string;
  step: number;
  state: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: Record<string, unknown>;
  timestamp: string;
}

/* ─── ProjectTaskManager ────────────────────────────────────────────── */

/**
 * ProjectTaskManager: Manages the internal PLAN.md for user projects.
 * Implements the "Vertical Slicing" philosophy.
 * Enhanced with rich dependency types and task checkpointing.
 */
export class ProjectTaskManager {
  private projectPath: string;
  private tasksFile: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.tasksFile = path.join(projectPath, 'PLAN.md');
  }

  /**
   * Initializes a new PLAN.md if it doesn't exist
   */
  async ensureInitialized(projectName: string, projectPath?: string) {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) {
      const template = `# 🗺 Project Plan: ${projectName}\n\n## 🚀 Phase 1: Short-Term (Now)\n- [ ] \`FEAT-01\`: **Initial Scan** - Analyze codebase and define structure.\n\n## 🛠 Phase 2: Mid-Term (Next)\n\n## 🧠 Phase 3: Long-Term (Future)\n`;
      await fs.writeFile(targetFile, template);
    }
  }

  /**
   * Returns the system prompt for the Architect Agent
   */
  getArchitectPrompt() {
    return `
# RÔLE : ARCHITECTE DE PROJET "FULL STACK"
Tu es le module d'intelligence ProjectTaskManager. Ta mission : Transformer une demande utilisateur en un plan de bataille exécutable.

## RÈGLE D'OR : LE DÉCOUPAGE VERTICAL
Tu ne dois JAMAIS séparer le Frontend du Backend. Une tâche doit être une "Vertical Slice" : une fonctionnalité complète (DB -> API -> UI).

## FORMAT DE SORTIE (Markdown)
Génère le contenu pour un fichier PLAN.md avec :
- Phase 1: Short-Term (Now)
- Phase 2: Mid-Term (Next)
- Phase 3: Long-Term (Future)

## DEPENDENCY TYPES
When declaring task dependencies, you may use:
- \`(depends_on: TASK-ID)\` — finish-to-start (default): B cannot start until A finishes
- \`(starts_with: TASK-ID)\` — start-to-start: B cannot start until A has started
- \`(finishes_with: TASK-ID)\` — finish-to-finish: B cannot finish until A finishes
`;
  }

  /**
   * Updates the tasks file with new content from the Architect
   */
  async updateTasks(content: string, projectPath?: string) {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    await fs.writeFile(targetFile, content);
  }

  /**
   * Parses PLAN.md to find available (unchecked) tasks
   */
  async getPendingTasks(projectPath?: string) {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) return [];
    const content = await fs.readFile(targetFile, 'utf-8');
    const lines = content.split('\n');
    return lines
      .filter(line => line.startsWith('- [ ]'))
      .map(line => line.replace('- [ ]', '').trim());
  }

  /* ─── Rich Dependency Checking ───────────────────────────────────── */

  /**
   * Parse all dependencies from a task line.
   * Supports:
   *   (depends_on: FEAT-01, FEAT-03)  → finish_to_start
   *   (starts_with: FEAT-02)           → start_to_start
   *   (finishes_with: FEAT-04)         → finish_to_finish
   */
  parseDependencies(taskLine: string): TaskDependency[] {
    const deps: TaskDependency[] = [];

    // finish_to_start: (depends_on: ...)
    const f2sMatch = taskLine.match(/\(depends_on:\s*([^)]+)\)/);
    if (f2sMatch) {
      for (const id of f2sMatch[1].split(',').map(d => d.trim()).filter(Boolean)) {
        deps.push({ taskId: id, type: 'finish_to_start' });
      }
    }

    // start_to_start: (starts_with: ...)
    const s2sMatch = taskLine.match(/\(starts_with:\s*([^)]+)\)/);
    if (s2sMatch) {
      for (const id of s2sMatch[1].split(',').map(d => d.trim()).filter(Boolean)) {
        deps.push({ taskId: id, type: 'start_to_start' });
      }
    }

    // finish_to_finish: (finishes_with: ...)
    const f2fMatch = taskLine.match(/\(finishes_with:\s*([^)]+)\)/);
    if (f2fMatch) {
      for (const id of f2fMatch[1].split(',').map(d => d.trim()).filter(Boolean)) {
        deps.push({ taskId: id, type: 'finish_to_finish' });
      }
    }

    return deps;
  }

  /**
   * Check if a specific dependency is satisfied given the dependency task's line.
   */
  isDependencySatisfied(dep: TaskDependency, depTaskLine: string | undefined): boolean {
    if (!depTaskLine) return true; // Unknown task — don't block

    const isDone = /- \[(?:x|DONE)\]/.test(depTaskLine);
    const isInProgress = /- \[IN PROGRESS/.test(depTaskLine);

    switch (dep.type) {
      case 'finish_to_start':
        // Dep must be done before we can start
        return isDone;

      case 'start_to_start':
        // Dep must be at least started (in progress or done)
        return isInProgress || isDone;

      case 'finish_to_finish':
        // Dep must be done before we can finish (not before we start)
        // For start-ability check, this is always satisfied
        return true;
    }
  }

  /**
   * Check if a task can finish, considering finish_to_finish deps.
   */
  isFinishAllowed(deps: TaskDependency[], lines: string[]): { allowed: boolean; waitingOn: string[] } {
    const waitingOn: string[] = [];

    for (const dep of deps) {
      if (dep.type !== 'finish_to_finish') continue;
      const depLine = lines.find(l => l.includes(`\`${dep.taskId}\``));
      const isDone = depLine ? /- \[(?:x|DONE)\]/.test(depLine) : true;
      if (!isDone) waitingOn.push(dep.taskId);
    }

    return { allowed: waitingOn.length === 0, waitingOn };
  }

  /**
   * LS-05: Check if all dependencies for a given taskId are satisfied for starting.
   * Enhanced with rich dependency types.
   */
  async checkDependencies(taskId: string, projectPath?: string): Promise<{
    blocked: boolean;
    waitingOn: string[];
  }> {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) return { blocked: false, waitingOn: [] };
    const content = await fs.readFile(targetFile, 'utf-8');
    const lines = content.split('\n');

    const taskLine = lines.find(l => l.includes(`\`${taskId}\``));
    if (!taskLine) return { blocked: false, waitingOn: [] };

    const deps = this.parseDependencies(taskLine);
    if (deps.length === 0) return { blocked: false, waitingOn: [] };

    const waitingOn: string[] = [];

    for (const dep of deps) {
      const depLine = lines.find(l => l.includes(`\`${dep.taskId}\``));
      if (!this.isDependencySatisfied(dep, depLine)) {
        waitingOn.push(`${dep.taskId} (${dep.type})`);
      }
    }

    return { blocked: waitingOn.length > 0, waitingOn };
  }

  async claimTask(taskId: string, agentId: string, projectPath?: string): Promise<
    boolean | { success: false; blocked: true; waitingOn: string[]; message: string }
  > {
    // LS-05: Check dependency constraints before claiming
    const deps = await this.checkDependencies(taskId, projectPath);
    if (deps.blocked) {
      return {
        success: false,
        blocked: true,
        waitingOn: deps.waitingOn,
        message: `Task ${taskId} is blocked — waiting for: ${deps.waitingOn.join(', ')}`,
      };
    }

    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) return false;
    let content = await fs.readFile(targetFile, 'utf-8');

    const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `- \\[ \\] \`${safeTaskId}\``;
    const regex = new RegExp(pattern);

    if (!regex.test(content)) return false;

    const newContent = content.replace(
      regex,
      `- [IN PROGRESS: ${agentId} @ ${new Date().toISOString()}] \`${taskId}\``
    );

    await fs.writeFile(targetFile, newContent);
    return true;
  }

  /**
   * LS-01: Set per-task file scope (work environment).
   * Stored in .queenbee/work-environments.json
   */
  async setWorkEnvironment(
    taskId: string,
    files: string[],
    notes?: string,
    projectPath?: string
  ): Promise<void> {
    const base = projectPath || this.projectPath;
    const envPath = path.join(base, '.queenbee', 'work-environments.json');
    await fs.ensureDir(path.dirname(envPath));
    const envs: Record<string, any> = await fs.readJson(envPath).catch(() => ({}));
    envs[taskId] = { files, notes, setAt: new Date().toISOString() };
    await fs.writeJson(envPath, envs, { spaces: 2 });
  }

  /**
   * LS-01: Get the work environment for a task (null if not set).
   */
  async getWorkEnvironment(
    taskId: string,
    projectPath?: string
  ): Promise<{ files: string[]; notes?: string } | null> {
    if (!taskId) return null;
    const base = projectPath || this.projectPath;
    const envPath = path.join(base, '.queenbee', 'work-environments.json');
    const envs: Record<string, any> = await fs.readJson(envPath).catch(() => ({}));
    return envs[taskId] || null;
  }

  async completeTask(taskId: string, agentId: string, projectPath?: string): Promise<boolean> {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) return false;
    let content = await fs.readFile(targetFile, 'utf-8');
    const lines = content.split('\n');

    // Check finish_to_finish dependencies before allowing completion
    const taskLine = lines.find(l => l.includes(`\`${taskId}\``));
    if (taskLine) {
      const deps = this.parseDependencies(taskLine);
      const finishCheck = this.isFinishAllowed(deps, lines);
      if (!finishCheck.allowed) {
        console.warn(`[TaskManager] Cannot complete ${taskId} — finish_to_finish deps not met: ${finishCheck.waitingOn.join(', ')}`);
        return false;
      }
    }

    const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `- \\[IN PROGRESS: ${agentId}\\] \`${safeTaskId}\``;
    const regex = new RegExp(pattern);

    if (!regex.test(content)) {
      const fallbackPattern = `- \\[IN PROGRESS: .*\\] \`${safeTaskId}\``;
      const fallbackRegex = new RegExp(fallbackPattern);
      if (!fallbackRegex.test(content)) return false;
      const newContent = content.replace(fallbackRegex, `- [DONE] \`${taskId}\``);
      await fs.writeFile(targetFile, newContent);
      return true;
    }

    const newContent = content.replace(regex, `- [DONE] \`${taskId}\``);
    await fs.writeFile(targetFile, newContent);
    return true;
  }

  async addTask(phase: string, taskId: string, description: string, projectPath?: string) {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) {
      await this.ensureInitialized('New Project', projectPath);
    }
    let content = await fs.readFile(targetFile, 'utf-8');
    const newTaskLine = `- [ ] \`${taskId}\`: ${description}`;

    // Normalize phase name for matching
    const phaseHeader = phase.startsWith('##') ? phase : `## ${phase}`;
    if (content.includes(phaseHeader)) {
      content = content.replace(phaseHeader, `${phaseHeader}\n${newTaskLine}`);
    } else {
      content += `\n\n${phaseHeader}\n${newTaskLine}`;
    }

    await fs.writeFile(targetFile, content);
  }

  /* ─── Task Checkpointing ──────────────────────────────────────────── */

  /**
   * Save a checkpoint for a task step (enables rollback).
   */
  async saveCheckpoint(taskId: string, step: number, data?: Record<string, unknown>, projectPath?: string): Promise<void> {
    const base = projectPath || this.projectPath;
    const cpPath = path.join(base, '.queenbee', 'checkpoints.json');
    await fs.ensureDir(path.dirname(cpPath));

    const checkpoints: TaskCheckpoint[] = await fs.readJson(cpPath).catch(() => []);
    checkpoints.push({
      taskId,
      step,
      state: 'completed',
      data,
      timestamp: new Date().toISOString(),
    });
    await fs.writeJson(cpPath, checkpoints, { spaces: 2 });
  }

  /**
   * Get all checkpoints for a task (for rollback inspection).
   */
  async getCheckpoints(taskId: string, projectPath?: string): Promise<TaskCheckpoint[]> {
    const base = projectPath || this.projectPath;
    const cpPath = path.join(base, '.queenbee', 'checkpoints.json');
    const checkpoints: TaskCheckpoint[] = await fs.readJson(cpPath).catch(() => []);
    return checkpoints.filter(cp => cp.taskId === taskId);
  }

  /**
   * Get the last successful checkpoint for a task (for resume after failure).
   */
  async getLastCheckpoint(taskId: string, projectPath?: string): Promise<TaskCheckpoint | null> {
    const cps = await this.getCheckpoints(taskId, projectPath);
    const completed = cps.filter(cp => cp.state === 'completed');
    return completed.length > 0 ? completed[completed.length - 1] : null;
  }
}
