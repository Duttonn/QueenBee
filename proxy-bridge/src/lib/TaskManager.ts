import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

const TASKS_FILE = Paths.getGSDTasksPath();

export interface GSDTask {
  id: string;
  status: 'todo' | 'in_progress' | 'done';
  agentId?: string;
  title: string;
  worker?: string;
}

export interface GSDPhase {
  name: string;
  tasks: GSDTask[];
}

export class TaskManager {
  static async getTasks() {
    if (!fs.existsSync(TASKS_FILE)) return [];
    const content = await fs.readFile(TASKS_FILE, 'utf-8');
    return content;
  }

  static async getParsedTasks(): Promise<GSDPhase[]> {
    if (!fs.existsSync(TASKS_FILE)) return [];
    const content = await fs.readFile(TASKS_FILE, 'utf-8');
    const lines = content.split('\n');
    
    const phases: GSDPhase[] = [];
    let currentPhase: GSDPhase | null = null;
    let currentTask: GSDTask | null = null;

    for (const line of lines) {
      const trimLine = line.trim();

      // Detect Phase
      if (line.startsWith('## ')) {
        // Push previous task if exists (though usually tasks are added immediately)
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
      // Matches: - [ ] `ID`: Title
      // Matches: - [DONE] `ID`: Title
      // Matches: - [IN PROGRESS: Agent] `ID`: Title
      const taskMatch = trimLine.match(/^- \[(.*?)\] `(.*?)`: (.*)/);
      if (taskMatch && currentPhase) {
        const [_, statusRaw, id, title] = taskMatch;
        let status: 'todo' | 'in_progress' | 'done' = 'todo';
        let agentId: string | undefined = undefined;

        if (statusRaw.includes('DONE') || statusRaw.includes('x')) {
            status = 'done';
        } else if (statusRaw.includes('IN PROGRESS')) {
            status = 'in_progress';
            // Extract agent: "IN PROGRESS: AgentName"
            const agentMatch = statusRaw.match(/IN PROGRESS: (.*)/);
            if (agentMatch) agentId = agentMatch[1];
        }

        currentTask = {
            id,
            status,
            agentId,
            title,
        };
        currentPhase.tasks.push(currentTask);
        continue;
      }

      // Detect Metadata (Worker) for the current task
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

  static async claimTask(taskId: string, agentId: string): Promise<boolean> {
    try {
      if (!fs.existsSync(TASKS_FILE)) {
        console.error(`TaskManager: File not found at ${TASKS_FILE}`);
        return false;
      }
      
      let content = await fs.readFile(TASKS_FILE, 'utf-8');

      // Escape taskId for regex
      const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Regex: - [ ] `TASK-ID`
      // We need to match literal - [ ] `
      const pattern = `- \\[ \\] \`${safeTaskId}\``;
      const regex = new RegExp(pattern);
      
      if (!regex.test(content)) {
        console.warn(`TaskManager: Task ${taskId} not found or already claimed.`);
        return false;
      }

      const newContent = content.replace(
        regex,
        `- [IN PROGRESS: ${agentId}] \`${taskId}\``
      );

      await fs.writeFile(TASKS_FILE, newContent);
      console.log(`TaskManager: Task ${taskId} claimed by ${agentId}`);
      return true;
    } catch (error) {
      console.error('TaskManager Error:', error);
      return false;
    }
  }

  static async completeTask(taskId: string, agentId: string): Promise<boolean> {
    try {
      if (!fs.existsSync(TASKS_FILE)) return false;
      let content = await fs.readFile(TASKS_FILE, 'utf-8');

      const safeTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match [IN PROGRESS: agentId] `taskId`
      const pattern = `- \\[IN PROGRESS: ${agentId}\\] \`${safeTaskId}\``;
      const regex = new RegExp(pattern);
      
      if (!regex.test(content)) {
        // Try matching just the task id if agentId doesn't match
        const fallbackPattern = `- \\[IN PROGRESS: .*\\] \`${safeTaskId}\``;
        const fallbackRegex = new RegExp(fallbackPattern);
        if (!fallbackRegex.test(content)) return false;

        const newContent = content.replace(fallbackRegex, `- [DONE] \`${taskId}\``);
        await fs.writeFile(TASKS_FILE, newContent);
        return true;
      }

      const newContent = content.replace(regex, `- [DONE] \`${taskId}\``);
      await fs.writeFile(TASKS_FILE, newContent);
      console.log(`TaskManager: Task ${taskId} marked as DONE by ${agentId}`);
      return true;
    } catch (error) {
      console.error('TaskManager Error:', error);
      return false;
    }
  }
}