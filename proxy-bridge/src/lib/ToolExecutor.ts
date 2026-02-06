import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { broadcast } from './socket-instance';

/**
 * ToolExecutor: Parses and executes tool calls from the LLM.
 * IMPORTANT: This module is intended for SERVER-SIDE (Node.js backend) execution ONLY.
 * It should NOT be imported or used directly within Electron main or renderer processes.
 * All interactions from Electron should go through defined IPC channels.
 */
export class ToolExecutor {
  async execute(tool: { name: string; arguments: any }, projectPath: string) {
    broadcast('TOOL_EXECUTION', { tool: tool.name, status: 'running', args: tool.arguments });
    
    try {
      let result = null;
      switch (tool.name) {
        case 'write_file':
          const filePath = path.join(projectPath, tool.arguments.path);
          await fs.writeFile(filePath, tool.arguments.content);
          result = { success: true, path: filePath };
          break;
          
        case 'run_shell': // Changed from 'run_command' to 'run_shell' for clarity
          result = await this.runShellCommand(tool.arguments.command, projectPath);
          break;
          
        case 'read_file':
          const readPath = path.join(projectPath, tool.arguments.path);
          result = await fs.readFile(readPath, 'utf-8');
          break;

        case 'create_worktree':
          const wtName = tool.arguments.name;
          // Use the same logic as our worktree API
          const repoDir = projectPath;
          const worktreePath = path.resolve(repoDir, '..', 'worktrees', wtName);
          const branchName = `agent/${wtName}`;
          
          broadcast('QUEEN_STATUS', { status: 'working', message: `Creating worktree ${wtName}...` });
          
          await new Promise((resolve, reject) => {
            exec(`git worktree add -b ${branchName} "${worktreePath}" HEAD`, { cwd: repoDir }, (error, stdout, stderr) => {
              if (error) reject(new Error(`Failed to create worktree: ${stderr}`));
              else resolve(stdout);
            });
          });
          
          result = { success: true, path: worktreePath, branch: branchName };
          break;
          
        default:
          throw new Error(`Unknown tool: ${tool.name}`);
      }
      
      broadcast('TOOL_RESULT', { tool: tool.name, status: 'success', result });
      return result;
    } catch (error: any) {
      console.error(`[ToolExecutor] Error executing tool '${tool.name}':`, error);
      broadcast('TOOL_RESULT', { tool: tool.name, status: 'error', error: error.message });
      throw error;
    }
  }

  private runShellCommand(command: string, cwd: string): Promise<any> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}
${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}
