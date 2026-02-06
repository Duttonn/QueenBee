import fs from 'fs-extra';
import path from 'path';

/**
 * ProjectTaskManager: Manages the internal GSD (TASKS.md) for user projects.
 * Implements the "Vertical Slicing" philosophy.
 */
export class ProjectTaskManager {
  private projectPath: string;
  private tasksFile: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.tasksFile = path.join(projectPath, 'TASKS.md');
  }

  /**
   * Initializes a new TASKS.md if it doesn't exist
   */
  async ensureInitialized(projectName: string) {
    if (!(await fs.pathExists(this.tasksFile))) {
      const template = `# 🚀 PROJET: ${projectName}\n\n## 🏗 PHASE 1: CORE (BLOCKING)\n- [ ] \`FEAT-01\`: **Initial Scan** - Analyze codebase and define structure.\n\n## 🧩 PHASE 2: FEATURES\n\n## 🧪 PHASE 3: QA & POLISH\n`;
      await fs.writeFile(this.tasksFile, template);
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
Génère le contenu pour un fichier TASKS.md avec :
- PHASE 1: CORE (Squelette)
- PHASE 2: FEATURES (Vertical Slices)
- PHASE 3: QA & POLISH
`;
  }

  /**
   * Updates the tasks file with new content from the Architect
   */
  async updateTasks(content: string) {
    await fs.writeFile(this.tasksFile, content);
  }

  /**
   * Parses TASKS.md to find available (unchecked) tasks
   */
  async getPendingTasks() {
    if (!(await fs.pathExists(this.tasksFile))) return [];
    const content = await fs.readFile(this.tasksFile, 'utf-8');
    const lines = content.split('\n');
    return lines
      .filter(line => line.startsWith('- [ ]'))
      .map(line => line.replace('- [ ]', '').trim());
  }

  async claimTask(taskId: string, agentId: string): Promise<boolean> {
    if (!(await fs.pathExists(this.tasksFile))) return false;
    let content = await fs.readFile(this.tasksFile, 'utf-8');

    const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `- \\[ \\] \`${safeTaskId}\``;
    const regex = new RegExp(pattern);

    if (!regex.test(content)) return false;

    const newContent = content.replace(
      regex,
      `- [IN PROGRESS: ${agentId}] \`${taskId}\``
    );

    await fs.writeFile(this.tasksFile, newContent);
    return true;
  }

  async completeTask(taskId: string, agentId: string): Promise<boolean> {
    if (!(await fs.pathExists(this.tasksFile))) return false;
    let content = await fs.readFile(this.tasksFile, 'utf-8');

    const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `- \\[IN PROGRESS: ${agentId}\\] \`${safeTaskId}\``;
    const regex = new RegExp(pattern);

    if (!regex.test(content)) {
      const fallbackPattern = `- \\[IN PROGRESS: .*\\] \`${safeTaskId}\``;
      const fallbackRegex = new RegExp(fallbackPattern);
      if (!fallbackRegex.test(content)) return false;
      const newContent = content.replace(fallbackRegex, `- [DONE] \`${taskId}\``);
      await fs.writeFile(this.tasksFile, newContent);
      return true;
    }

    const newContent = content.replace(regex, `- [DONE] \`${taskId}\``);
    await fs.writeFile(this.tasksFile, newContent);
    return true;
  }

  async addTask(phase: string, taskId: string, description: string) {
    if (!(await fs.pathExists(this.tasksFile))) {
      await this.ensureInitialized('New Project');
    }
    let content = await fs.readFile(this.tasksFile, 'utf-8');
    const newTaskLine = `- [ ] \`${taskId}\`: ${description}`;
    
    const phaseHeader = `## ${phase}`;
    if (content.includes(phaseHeader)) {
      content = content.replace(phaseHeader, `${phaseHeader}\n${newTaskLine}`);
    } else {
      content += `\n\n${phaseHeader}\n${newTaskLine}`;
    }
    
    await fs.writeFile(this.tasksFile, content);
  }
}
