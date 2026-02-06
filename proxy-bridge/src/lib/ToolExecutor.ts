import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { broadcast } from './socket-instance';
import { Paths } from './Paths';

// Simple Mutex for concurrent file writes
class Mutex {
  private promise: Promise<void> = Promise.resolve();
  async lock() {
    let unlockNext: () => void;
    const nextPromise = new Promise<void>(resolve => unlockNext = resolve);
    const currentPromise = this.promise;
    this.promise = nextPromise;
    await currentPromise;
    return unlockNext!;
  }
}

const memoryMutex = new Mutex();

// Registry to track workers in this process (for the prototype)
const workerRegistry = new Map<string, { status: string; prUrl?: string }>();

/**
 * ToolExecutor: Parses and executes tool calls from the LLM.
 */
export class ToolExecutor {
  private validatePath(projectPath: string, relativePath: string): string {
    const absolutePath = path.resolve(projectPath, relativePath);
    if (!absolutePath.startsWith(path.resolve(projectPath))) {
      throw new Error(`Security Violation: Path traversal detected. Path '${relativePath}' is outside of project root '${projectPath}'.`);
    }
    return absolutePath;
  }

  async execute(
    tool: { name: string; arguments: any; id?: string },
    contextOrPath: string | { projectPath: string; agentId?: string | null; threadId?: string; projectId?: string; toolCallId?: string },
    legacyAgentId?: string | null
  ) {
    let projectPath: string;
    let agentId: string | null = 'unknown';
    let threadId: string | undefined;
    let projectId: string | undefined;
    let toolCallId: string | undefined = tool.id;

    if (typeof contextOrPath === 'string') {
      projectPath = contextOrPath;
      agentId = legacyAgentId || 'unknown';
    } else {
      projectPath = contextOrPath.projectPath;
      agentId = contextOrPath.agentId || 'unknown';
      threadId = contextOrPath.threadId;
      projectId = contextOrPath.projectId;
      if (contextOrPath.toolCallId) toolCallId = contextOrPath.toolCallId;
    }

    broadcast('TOOL_EXECUTION', { 
      tool: tool.name, 
      status: 'running', 
      args: tool.arguments,
      projectId,
      threadId,
      toolCallId
    });
    
    try {
      let result = null;
      switch (tool.name) {
        case 'write_file':
          const filePath = this.validatePath(projectPath, tool.arguments.path);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, tool.arguments.content);
          result = { success: true, path: filePath };
          break;
          
        case 'run_shell':
          // Potential additional security: sanitize or restrict commands here
          result = await this.runShellCommand(tool.arguments.command, projectPath);
          break;
          
        case 'read_file':
          const readPath = this.validatePath(projectPath, tool.arguments.path);
          result = await fs.readFile(readPath, 'utf-8');
          break;

        case 'create_worktree':
          const wtName = tool.arguments.name;
          const worktreePath = path.join(Paths.getWorktreesDir(), wtName);
          const branchName = `agent/${wtName}`;
          
          broadcast('QUEEN_STATUS', { status: 'working', message: `Creating worktree ${wtName}...` });
          
          await new Promise((resolve, reject) => {
            const cmd = `git worktree add -b ${branchName} "${worktreePath}" HEAD`;
            exec(cmd, { cwd: Paths.getWorkspaceRoot() }, (error: any, stdout: string, stderr: string) => {
              if (error) reject(new Error(`Failed to create worktree: ${stderr}`));
              else resolve(stdout);
            });
          });
          
          result = { success: true, path: worktreePath, branch: branchName };
          break;

        case 'write_memory':
          result = await this.handleWriteMemory(projectPath, tool.arguments.category, tool.arguments.content, agentId);
          break;

        case 'read_memory':
          result = await this.handleReadMemory(projectPath, tool.arguments.category);
          break;

        case 'spawn_worker':
          result = await this.handleSpawnWorker(projectPath, tool.arguments.taskId, tool.arguments.instructions);
          break;

        case 'report_completion':
          workerRegistry.set(tool.arguments.taskId, { 
            status: tool.arguments.status, 
            prUrl: tool.arguments.prUrl 
          });
          result = { success: true, message: `Status for ${tool.arguments.taskId} updated.` };
          break;

        case 'check_status':
          const taskId = tool.arguments.taskId;
          if (taskId) {
            result = workerRegistry.get(taskId) || { status: 'unknown' };
          } else {
            result = Object.fromEntries(workerRegistry);
          }
          break;
          
        default:
          throw new Error(`Unknown tool: ${tool.name}`);
      }
      
      broadcast('TOOL_RESULT', { 
        tool: tool.name, 
        status: 'success', 
        result,
        projectId,
        threadId,
        toolCallId 
      });
      return result;
    } catch (error: any) {
      console.error(`[ToolExecutor] Error executing tool '${tool.name}':`, error);
      broadcast('TOOL_RESULT', { 
        tool: tool.name, 
        status: 'error', 
        error: error.message,
        projectId,
        threadId,
        toolCallId
      });
      throw error;
    }
  }

  private async handleSpawnWorker(projectPath: string, taskId: string, instructions: string) {
    workerRegistry.set(taskId, { status: 'starting' });
    
    // In a real implementation, this would trigger a background process or another API call.
    // For the prototype, we trigger it via a simulated internal loop.
    console.log(`[Swarm] Spawning worker for task ${taskId}...`);
    
    // We emit an event that the UI can catch to show a new "Worker" thread appearing
    broadcast('UI_UPDATE', {
      action: 'SPAWN_THREAD',
      payload: {
        id: `worker-${taskId}-${Date.now()}`,
        title: `Worker: ${taskId}`,
        agentId: 'worker-bee',
        parentTaskId: taskId,
        instructions
      }
    });

    return { 
      success: true, 
      taskId, 
      message: `Worker agent spawned for task ${taskId}. It will report back when finished.` 
    };
  }

  private async handleWriteMemory(projectPath: string, category: string, content: string, agentId: string | null) {
    const unlock = await memoryMutex.lock();
    try {
      const memoryPath = this.validatePath(projectPath, 'MEMORY.md');
      const sectionHeaders: Record<string, string> = {
        architecture: '# 🏗 Architecture',
        conventions: '# 📏 Conventions & patterns',
        knowledge: '# 🧠 Knowledge Graph (Facts)',
        issues: '# 🛑 Known Issues'
      };

      if (!await fs.pathExists(memoryPath)) {
        const initialContent = Object.values(sectionHeaders).join('\n\n\n') + '\n';
        await fs.writeFile(memoryPath, initialContent);
      }

      let fileContent = await fs.readFile(memoryPath, 'utf-8');
      const header = sectionHeaders[category];
      const entry = `\n- [${new Date().toISOString()}] (Agent: ${agentId}): ${content}`;

      if (fileContent.includes(header)) {
        const parts = fileContent.split(header);
        fileContent = parts[0] + header + entry + parts[1];
      } else {
        fileContent += `\n\n${header}${entry}`;
      }

      await fs.writeFile(memoryPath, fileContent);
      return { success: true, category, message: `Recorded in ${category}` };
    } finally {
      unlock();
    }
  }

  private async handleReadMemory(projectPath: string, category?: string) {
    const memoryPath = this.validatePath(projectPath, 'MEMORY.md');
    if (!await fs.pathExists(memoryPath)) {
      return "MEMORY.md does not exist yet.";
    }

    const content = await fs.readFile(memoryPath, 'utf-8');
    if (!category) return content;

    const sectionHeaders: Record<string, string> = {
      architecture: '# 🏗 Architecture',
      conventions: '# 📏 Conventions & patterns',
      knowledge: '# 🧠 Knowledge Graph (Facts)',
      issues: '# 🛑 Known Issues'
    };

    const header = sectionHeaders[category];
    if (!content.includes(header)) return `Section ${category} not found.`;

    const sections = Object.values(sectionHeaders);
    const startIdx = content.indexOf(header);
    let endIdx = content.length;

    for (const otherHeader of sections) {
      if (otherHeader === header) continue;
      const idx = content.indexOf(otherHeader, startIdx + 1);
      if (idx !== -1 && idx < endIdx) {
        endIdx = idx;
      }
    }

    return content.substring(startIdx, endIdx).trim();
  }

  private runShellCommand(command: string, cwd: string): Promise<any> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\n${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}
