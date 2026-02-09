import fs from 'fs-extra';
import path from 'path';

/**
 * ProjectTaskManager: Manages the internal PLAN.md for user projects.
 * Implements the "Vertical Slicing" philosophy.
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

  async claimTask(taskId: string, agentId: string, projectPath?: string): Promise<boolean> {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) return false;
    let content = await fs.readFile(targetFile, 'utf-8');

    const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `- \\[ \\] \`${safeTaskId}\``;
    const regex = new RegExp(pattern);

    if (!regex.test(content)) return false;

    const newContent = content.replace(
      regex,
      `- [IN PROGRESS: ${agentId}] \`${taskId}\``
    );

    await fs.writeFile(targetFile, newContent);
    return true;
  }

  async completeTask(taskId: string, agentId: string, projectPath?: string): Promise<boolean> {
    const targetFile = projectPath ? path.join(projectPath, 'PLAN.md') : this.tasksFile;
    if (!(await fs.pathExists(targetFile))) return false;
    let content = await fs.readFile(targetFile, 'utf-8');

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
}