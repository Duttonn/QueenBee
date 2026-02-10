import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

const GLOBAL_TASKS_FILE = Paths.getGSDTasksPath();

export interface GSDTask {
  id: string;
  status: 'todo' | 'in_progress' | 'done';
  agentId?: string;
  claimedAt?: string;
  title: string;
  worker?: string;
}

export interface GSDPhase {
  name: string;
  tasks: GSDTask[];
}

export class TaskManager {
  private static getTasksPath(projectPath?: string) {
    if (projectPath) {
        return path.join(projectPath, 'PLAN.md');
    }
    return GLOBAL_TASKS_FILE;
  }

  static async getTasks(projectPath?: string) {
    const filePath = this.getTasksPath(projectPath);
    if (!fs.existsSync(filePath)) return null;
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  static async getParsedTasks(projectPath?: string): Promise<GSDPhase[]> {
    const filePath = this.getTasksPath(projectPath);
    if (!fs.existsSync(filePath)) return [];
    
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const phases: GSDPhase[] = [];
    let currentPhase: GSDPhase | null = null;
    let currentTask: GSDTask | null = null;

    for (const line of lines) {
      const trimLine = line.trim();

      // Detect Phase
      if (line.startsWith('## ')) {
        if (currentPhase) {
            phases.push(currentPhase);
        }
        currentPhase = {
            name: line.replace('## ', '').trim(),
            tasks: []
        };
        currentTask = null;
        continue;
      }

      // Detect Task
      const taskMatch = trimLine.match(/^- \[(.*?)\] `(.*?)`: (.*)/);
      if (taskMatch && currentPhase) {
        const [_, statusRaw, id, title] = taskMatch;
        let status: 'todo' | 'in_progress' | 'done' = 'todo';
        let agentId: string | undefined = undefined;
        let claimedAt: string | undefined = undefined;

        if (statusRaw.includes('DONE') || statusRaw.includes('x')) {
            status = 'done';
        } else if (statusRaw.includes('IN PROGRESS')) {
            status = 'in_progress';
            const agentMatch = statusRaw.match(/IN PROGRESS: (.*?)( @ (.*))?$/);
            if (agentMatch) {
                agentId = agentMatch[1].trim();
                if (agentMatch[3]) {
                    claimedAt = agentMatch[3].trim();
                }
            }
        }

        currentTask = {
            id,
            status,
            agentId,
            claimedAt,
            title,
        };
        currentPhase.tasks.push(currentTask);
        continue;
      }

      if (currentTask && trimLine.startsWith('- **Worker**:')) {
        const worker = trimLine.replace('- **Worker**:', '').trim();
        currentTask.worker = worker;
      }
    }

    if (currentPhase) {
        phases.push(currentPhase);
    }

    return phases;
  }

  static async claimTask(taskId: string, agentId: string, projectPath?: string): Promise<boolean> {
    try {
      const filePath = this.getTasksPath(projectPath);
      if (!fs.existsSync(filePath)) return false;
      
      let content = await fs.readFile(filePath, 'utf-8');
      const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `- \\[ \\] \`${safeTaskId}\``;
      const regex = new RegExp(pattern);
      
      if (!regex.test(content)) return false;

      const timestamp = new Date().toISOString();
      const newContent = content.replace(
        regex,
        `- [IN PROGRESS: ${agentId} @ ${timestamp}] \`${taskId}\``
      );

      await fs.writeFile(filePath, newContent);
      return true;
    } catch (error) {
      console.error('TaskManager Error:', error);
      return false;
    }
  }

  static async revertTask(taskId: string, projectPath?: string): Promise<boolean> {
    try {
      const filePath = this.getTasksPath(projectPath);
      if (!fs.existsSync(filePath)) return false;
      
      let content = await fs.readFile(filePath, 'utf-8');
      const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match any IN PROGRESS status for this task
      const pattern = `- \\[IN PROGRESS:.*?\\] \`${safeTaskId}\``;
      const regex = new RegExp(pattern);
      
      if (!regex.test(content)) return false;

      const newContent = content.replace(
        regex,
        `- [ ] \`${taskId}\``
      );

      await fs.writeFile(filePath, newContent);
      return true;
    } catch (error) {
      console.error('TaskManager Error:', error);
      return false;
    }
  }

  static async completeTask(taskId: string, agentId: string, projectPath?: string): Promise<boolean> {
    try {
      const filePath = this.getTasksPath(projectPath);
      if (!fs.existsSync(filePath)) return false;
      let content = await fs.readFile(filePath, 'utf-8');

      const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `- \\[IN PROGRESS: ${agentId}\\] \`${safeTaskId}\``;
      const regex = new RegExp(pattern);
      
      if (!regex.test(content)) {
        const fallbackPattern = `- \\[IN PROGRESS: .*\\] \`${safeTaskId}\``;
        const fallbackRegex = new RegExp(fallbackPattern);
        if (!fallbackRegex.test(content)) return false;
        const newContent = content.replace(fallbackRegex, `- [DONE] \`${taskId}\``);
        await fs.writeFile(filePath, newContent);
        return true;
      }

      const newContent = content.replace(regex, `- [DONE] \`${taskId}\``);
      await fs.writeFile(filePath, newContent);
      return true;
    } catch (error) {
      console.error('TaskManager Error:', error);
      return false;
    }
  }

  static async addTask(phase: string, taskId: string, description: string, projectPath?: string) {
    const targetFile = this.getTasksPath(projectPath);
    const projectName = projectPath ? path.basename(projectPath) : 'Project';
    
    if (!fs.existsSync(targetFile)) {
      const template = `# 🚀 PROJET: ${projectName}\n\n## Phase 1: CORE (BLOCKING)\n- [ ] \`FEAT-01\`: **Initial Scan** - Analyze codebase and define structure.\n\n## Phase 2: FEATURES\n\n## Phase 3: QA & POLISH\n`;
      await fs.writeFile(targetFile, template);
    }
    
    let content = await fs.readFile(targetFile, 'utf-8');
    const newTaskLine = `- [ ] \`${taskId}\`: ${description}`;
    
    const phaseHeader = phase.startsWith('##') ? phase : `## ${phase}`;
    if (content.includes(phaseHeader)) {
      content = content.replace(phaseHeader, `${phaseHeader}\n${newTaskLine}`);
    } else {
      content += `\n\n${phaseHeader}\n${newTaskLine}`;
    }
    
    await fs.writeFile(targetFile, content);
  }

  static async updateTasks(content: string, projectPath?: string) {
    const targetFile = this.getTasksPath(projectPath);
    await fs.writeFile(targetFile, content);
  }
}