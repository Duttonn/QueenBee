import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

const TASKS_FILE = Paths.getGSDTasksPath();

export class TaskManager {
  static async getTasks() {
    if (!fs.existsSync(TASKS_FILE)) return [];
    const content = await fs.readFile(TASKS_FILE, 'utf-8');
    return content;
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