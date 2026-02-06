import { Socket } from 'socket.io';
import { ToolExecutor } from './ToolExecutor';
import { ProjectTaskManager } from './ProjectTaskManager';
import { broadcast } from './socket-instance';
import fs from 'fs-extra';
import path from 'path';

export const AUTONOMOUS_SYSTEM_PROMPT_INJECT = `
# AUTONOMY DIRECTIVE
1. You are a high-trust autonomous worker. 
2. NEVER stop to ask questions. If information is missing, make a professional ASSUMPTION based on the existing codebase.
3. Your goal is to deliver a finished, tested, and compiling solution.
4. Continue looping through tool calls until you have verified your work.
5. At the very end of your response, list all your assumptions under a '🧠 ASSUMPTIONS' header.
6. If you fail, report the failure only after exhausting all logical fixes.

# TOOL USAGE
- Use 'create_worktree(name)' when you start a new task or feature to isolate your work.
- Choose a descriptive name for the worktree based on the task.
- Once a worktree is created, all subsequent 'write_file' or 'run_shell' commands should target that worktree path if relevant.
`;


export class AutonomousRunner {
  private socket: Socket;
  private executor: ToolExecutor;
  private projectPath: string;
  private tm: ProjectTaskManager;

  constructor(socket: Socket, projectPath: string) {
    this.socket = socket;
    this.executor = new ToolExecutor();
    this.projectPath = projectPath;
    this.tm = new ProjectTaskManager(projectPath);
  }

  /**
   * Generates a context-rich prompt for the agent
   */
  async getEnhancedContext() {
    const files = await this.scanFiles(this.projectPath);
    const tasks = await this.tm.getPendingTasks();
    
    return `
# PROJECT CONTEXT
Location: ${this.projectPath}
File Tree:
${files.join('\n')}

# ACTIVE GOALS (TASKS.md)
${tasks.join('\n')}

${AUTONOMOUS_SYSTEM_PROMPT_INJECT}
`;
  }

  private async scanFiles(dir: string, depth = 0): Promise<string[]> {
    if (depth > 3) return []; // Limit depth for tokens
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let results: string[] = [];

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(`DIR: ${entry.name}`);
        results = results.concat(await this.scanFiles(fullPath, depth + 1));
      } else {
        results.push(`FILE: ${entry.name}`);
      }
    }
    return results;
  }

  /**
   * Executes a single step in the agentic loop
   */
  async runStep(toolName: string, args: any) {
    broadcast('QUEEN_STATUS', { status: 'working', tool: toolName });
    return await this.executor.execute({ name: toolName, arguments: args }, this.projectPath);
  }
}