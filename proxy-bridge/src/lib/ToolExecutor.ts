import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { broadcast } from './socket-instance';
import { sessionManager } from './SessionManager';
import { Paths } from './Paths';
import { CloudFSManager } from './CloudFSManager';
import { ProjectTaskManager } from './ProjectTaskManager';
import { ProposalService } from './ProposalService';
import { EventLog } from './EventLog';
import { PolicyStore } from './PolicyStore';
import { Roundtable } from './Roundtable';

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
  private eventLog?: EventLog;
  private policyStore?: PolicyStore;

  constructor(eventLog?: EventLog, policyStore?: PolicyStore) {
    this.eventLog = eventLog;
    this.policyStore = policyStore;
  }

  private static ALLOWED_COMMANDS = new Set([
    'git', 'npm', 'npx', 'node', 'python3', 'python', 'ls', 'cat', 'head', 'tail',
    'mkdir', 'cp', 'mv', 'rm', 'touch', 'echo', 'grep', 'find', 'wc', 'diff',
    'tsc', 'eslint', 'prettier', 'jest', 'vitest', 'cargo', 'go', 'make', 'cd',
    'pwd', 'which', 'env', 'sort', 'uniq', 'sed', 'awk', 'tr', 'chmod',
    'bash', 'sh', 'pdftotext'
  ]);

  private static pendingConfirmations = new Map<string, (approved: boolean) => void>();

  public static confirm(toolCallId: string, approved: boolean) {
    const resolver = this.pendingConfirmations.get(toolCallId);
    if (resolver) {
      console.log(`[ToolExecutor] Resolving confirmation for ${toolCallId}: ${approved}`);
      resolver(approved);
      this.pendingConfirmations.delete(toolCallId);
    } else {
      console.warn(`[ToolExecutor] No pending confirmation found for ${toolCallId}`);
    }
  }

  private validateCommand(command: string, allowedCommands: string[] = []): boolean {
    const subCommands = command.split(/[|;&]+/).map(s => s.trim()).filter(Boolean);
    for (const sub of subCommands) {
      const baseCmd = sub.split(/\s+/)[0].replace(/^.*\//, '');
      if (!ToolExecutor.ALLOWED_COMMANDS.has(baseCmd) && !allowedCommands.includes(baseCmd)) {
        return false;
      }
    }
    return true;
  }

  private validateCwd(cwd: string, projectPath: string): void {
    const resolvedCwd = path.resolve(cwd);
    const resolvedProject = path.resolve(projectPath);
    if (!resolvedCwd.startsWith(resolvedProject)) {
      throw new Error(`Security Violation: Working directory '${cwd}' is outside project root '${projectPath}'.`);
    }
  }

  private validatePath(projectPath: string, relativePath: string): string {
    const absolutePath = path.resolve(projectPath, relativePath);
    if (!absolutePath.startsWith(path.resolve(projectPath))) {
      throw new Error(`Security Violation: Path traversal detected. Path '${relativePath}' is outside of project root '${projectPath}'.`);
    }
    return absolutePath;
  }

  async execute(
    tool: { name: string; arguments: any; id?: string },
    contextOrPath: string | { 
      projectPath: string; 
      agentId?: string | null; 
      threadId?: string; 
      projectId?: string; 
      toolCallId?: string; 
      mode?: string;
      allowedCommands?: string[]; 
    },
    legacyAgentId?: string | null
  ) {
    let projectPath: string;
    let agentId: string | null = 'unknown';
    let threadId: string | undefined;
    let projectId: string | undefined;
    let toolCallId: string | undefined = tool.id || `call-${Date.now()}`;
    let mode: string = 'local';
    let allowedCommands: string[] = [];

    if (typeof contextOrPath === 'string') {
      projectPath = contextOrPath;
      agentId = legacyAgentId || 'unknown';
    } else {
      projectPath = contextOrPath.projectPath;
      agentId = contextOrPath.agentId || 'unknown';
      threadId = contextOrPath.threadId;
      projectId = contextOrPath.projectId;
      mode = contextOrPath.mode || 'local';
      if (contextOrPath.toolCallId) toolCallId = contextOrPath.toolCallId;
      if (contextOrPath.allowedCommands) allowedCommands = contextOrPath.allowedCommands;
    }

    // BP-19: Strict Tool Validation
    if (!tool.name) {
      console.error(`[ToolExecutor] CRITICAL: Tool name is missing for call ID ${toolCallId}`);
      throw new Error(`Execution Failed: Tool name is missing for call ID ${toolCallId}`);
    }

    const cloudFS = mode === 'cloud' ? new CloudFSManager(projectPath) : null;
    const ptm = new ProjectTaskManager(projectPath);

    broadcast('TOOL_EXECUTION', { 
      tool: tool.name, 
      status: 'running', 
      args: tool.arguments,
      projectId,
      threadId,
      toolCallId
    });

    if (this.eventLog) {
      await this.eventLog.emit('tool_executed', agentId || 'unknown', {
        tool: tool.name,
        arguments: tool.arguments,
        projectId,
        threadId,
        toolCallId
      });
    }
    
    try {
      let result = null;
      switch (tool.name) {
        // ... (write_file case remains same)
        case 'write_file':
          if (cloudFS) {
            await cloudFS.writeFile(tool.arguments.path, tool.arguments.content);
            result = { success: true, path: tool.arguments.path };
          } else {
            const filePath = this.validatePath(projectPath, tool.arguments.path);
            let stats = { added: 0, removed: 0 };
            
            try {
              if (await fs.pathExists(filePath)) {
                const oldContent = await fs.readFile(filePath, 'utf-8');
                const oldLines = oldContent.split('\n').length;
                const newLines = tool.arguments.content.split('\n').length;
                stats = { added: newLines, removed: oldLines };
              } else {
                const newLines = tool.arguments.content.split('\n').length;
                stats = { added: newLines, removed: 0 };
              }
            } catch (e) {}

            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, tool.arguments.content);
            result = { success: true, path: filePath, stats };
          }
          break;
          
        case 'run_shell':
          result = await this.runShellCommand(tool.arguments.command, projectPath, { projectId, threadId, toolCallId, allowedCommands });
          break;
          
        // ... (other cases remain same)
          
                  case 'read_file':
                    const readPath = this.validatePath(projectPath, tool.arguments.path);
                    const stats = await fs.stat(readPath);
                    
                    // Limit file size to 1MB to prevent context overflow and 413 errors
                    if (stats.size > 1024 * 1024) {
                      result = `Error: File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Use a more specific tool or read a smaller file.`;
                      break;
                    }
        
                    const ext = path.extname(readPath).toLowerCase();
                    const binaryExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz', '.exe', '.bin'];
                    
                    if (binaryExtensions.includes(ext)) {
                      result = `Error: Cannot read binary file ${tool.arguments.path} as text. Use specialized agents for binary analysis if available.`;
                      break;
                    }
        
                    if (cloudFS) {
                      result = await cloudFS.readFile(tool.arguments.path);
                    } else {
                      const content = await fs.readFile(readPath, 'utf-8');
                      // Basic check for binary content (null bytes or excessive non-printable characters)
                      if (content.includes('\u0000') || (content.match(/[\x00-\x08\x0E-\x1F]/g) || []).length > content.length * 0.1) {
                        result = `Error: File ${tool.arguments.path} appears to be binary or has encoding issues.`;
                      } else {
                        result = content;
                      }
                    }
                    break;
        case 'create_worktree':
          const wtName = tool.arguments.name;
          const worktreePath = path.join(Paths.getWorktreesDir(), wtName);
          const branchName = `agent/${wtName}`;
          
          broadcast('QUEEN_STATUS', { status: 'working', message: `Creating worktree ${wtName}...` });
          
          await new Promise((resolve, reject) => {
            const cmd = `git worktree add -b ${branchName} "${worktreePath}" HEAD`;
            exec(cmd, { cwd: Paths.getWorkspaceRoot() }, (error, stdout, stderr) => {
              if (error) reject(new Error(`Failed to create worktree: ${stderr}`));
              else resolve(stdout);
            });
          });
          
          result = { success: true, path: worktreePath, branch: branchName };
          break;

        case 'write_memory':
          result = await this.handleWriteMemory(projectPath, tool.arguments.category, tool.arguments.content, agentId, cloudFS);
          break;

        case 'read_memory':
          result = await this.handleReadMemory(projectPath, tool.arguments.category, cloudFS);
          break;

        case 'spawn_worker':
          result = await this.handleSpawnWorker(projectPath, tool.arguments.taskId, tool.arguments.instructions);
          break;

        case 'report_completion':
          workerRegistry.set(tool.arguments.taskId, { 
            status: tool.arguments.status, 
            prUrl: tool.arguments.prUrl 
          });
          await ptm.completeTask(tool.arguments.taskId, agentId || 'unknown', projectPath);
          result = { success: true, message: `Status for ${tool.arguments.taskId} updated and PLAN.md synced.` };
          break;

        case 'check_status':
          const taskId = tool.arguments.taskId;
          if (taskId) {
            result = workerRegistry.get(taskId) || { status: 'unknown' };
          } else {
            result = Object.fromEntries(workerRegistry);
          }
          break;

        case 'plan_tasks':
          await ptm.updateTasks(tool.arguments.content, projectPath);
          result = { success: true, message: 'PLAN.md updated with the new plan.' };
          break;

        case 'add_task':
          await ptm.addTask(tool.arguments.phase, tool.arguments.taskId, tool.arguments.description, projectPath);
          result = { success: true, taskId: tool.arguments.taskId, message: 'Task added to PLAN.md' };
          break;

        case 'claim_task':
          const claimed = await ptm.claimTask(tool.arguments.taskId, agentId || 'unknown', projectPath);
          result = { success: claimed, taskId: tool.arguments.taskId, message: claimed ? 'Task claimed' : 'Task not found or already claimed' };
          break;

        case 'submit_proposal':
          const proposalService = new ProposalService(projectPath);
          const proposal = await proposalService.submit(agentId || 'unknown', tool.arguments.action, tool.arguments.reason);
          
          if (this.eventLog) {
            await this.eventLog.emit('proposal_submitted', agentId || 'unknown', {
              proposalId: proposal.id,
              action: proposal.action,
              reason: proposal.reason
            });
          }

          result = { success: true, proposal, message: `Proposal submitted: ${proposal.id}` };
          break;

        case 'chat_with_team':
          const roundtable = new Roundtable(projectPath);
          const teamMsg = await roundtable.postMessage(
            agentId || 'unknown',
            contextOrPath && typeof contextOrPath !== 'string' ? contextOrPath.agentId || 'agent' : 'agent',
            tool.arguments.content,
            { threadId, taskId: tool.arguments.taskId }
          );

          if (this.eventLog) {
            await this.eventLog.emit('team_message_sent', agentId || 'unknown', {
              messageId: teamMsg.id,
              content: teamMsg.content,
              taskId: teamMsg.taskId
            });
          }

          result = { success: true, message: "Message sent to team channel." };
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

      if (this.eventLog) {
        await this.eventLog.emit('tool_result', agentId || 'unknown', {
          tool: tool.name,
          status: 'success',
          result,
          projectId,
          threadId,
          toolCallId
        });
      }
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

      if (this.eventLog) {
        await this.eventLog.emit('tool_result', agentId || 'unknown', {
          tool: tool.name,
          status: 'error',
          error: error.message,
          projectId,
          threadId,
          toolCallId
        });
      }
      throw error;
    }
  }

  private async handleSpawnWorker(projectPath: string, taskId: string, instructions: string) {
    workerRegistry.set(taskId, { status: 'starting' });
    
    console.log(`[Swarm] Spawning worker for task ${taskId}...`);
    
    // 1. Prepare worktree details
    const wtName = `worker-${taskId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const worktreeDir = path.join(Paths.getWorktreesDir(), wtName);
    const branchName = `agent/${wtName}`;

    try {
      // 2. Create the worktree
      await new Promise((resolve, reject) => {
        const cmd = `git worktree add -b ${branchName} "${worktreeDir}" HEAD`;
        exec(cmd, { cwd: Paths.getWorkspaceRoot() }, (error, stdout, stderr) => {
          if (error) reject(new Error(`Failed to create worktree: ${stderr}`));
          else resolve(stdout);
        });
      });

      // 3. Start the background runner (non-blocking)
      this.runBackgroundWorker(worktreeDir, taskId, instructions, wtName).catch(err => {
        console.error(`[Swarm] Worker for ${taskId} failed:`, err);
        workerRegistry.set(taskId, { status: 'failed' });
      });

      broadcast('UI_UPDATE', {
        action: 'SPAWN_THREAD',
        payload: {
          id: `worker-${taskId}-${Date.now()}`,
          title: `Worker: ${taskId}`,
          agentId: wtName,
          parentTaskId: taskId,
          instructions,
          worktreePath: worktreeDir
        }
      });

      return { 
        success: true, 
        taskId, 
        worktreePath: worktreeDir,
        message: `Worker agent spawned for task ${taskId} in isolated worktree.` 
      };
    } catch (error: any) {
      console.error(`[Swarm] Failed to spawn worker:`, error);
      return { success: false, error: error.message };
    }
  }

  private async runBackgroundWorker(worktreePath: string, taskId: string, instructions: string, agentId: string) {
    const { AutonomousRunner } = await import('./AutonomousRunner');
    const { getIO } = await import('./socket-instance');
    
    const io = getIO();
    // Create a mock socket that redirects emits to the global io instance
    const mockSocket = {
      emit: (event: string, data: any) => {
        if (io) io.emit(event, { ...data, agentId, parentTaskId: taskId });
      },
      on: () => {},
      off: () => {}
    } as any;

    const runner = new AutonomousRunner(
      mockSocket,
      worktreePath,
      'auto',
      `swarm-${taskId}-${Date.now()}`,
      null,
      'local', // Working directly inside the worktree
      agentId
    );

    workerRegistry.set(taskId, { status: 'running' });
    
    try {
      await runner.executeLoop(instructions);
      workerRegistry.set(taskId, { status: 'completed' });
    } catch (error) {
      console.error(`[Swarm] Background worker ${agentId} error:`, error);
      workerRegistry.set(taskId, { status: 'failed' });
      throw error;
    }
  }

  private async handleWriteMemory(projectPath: string, category: string, content: string, agentId: string | null, cloudFS?: CloudFSManager | null) {
    const unlock = await memoryMutex.lock();
    try {
      const memoryFileName = 'MEMORY.md';
      const sectionHeaders: Record<string, string> = {
        architecture: '# 🏗 Architecture',
        conventions: '# 📏 Conventions & patterns',
        knowledge: '# 🧠 Knowledge Graph (Facts)',
        issues: '# 🛑 Known Issues'
      };

      let fileContent = '';
      if (cloudFS) {
        if (await cloudFS.exists(memoryFileName)) {
          fileContent = await cloudFS.readFile(memoryFileName);
        }
      } else {
        const memoryPath = this.validatePath(projectPath, memoryFileName);
        if (await fs.pathExists(memoryPath)) {
          fileContent = await fs.readFile(memoryPath, 'utf-8');
        }
      }

      if (!fileContent) {
        fileContent = Object.values(sectionHeaders).join('\n\n\n') + '\n';
      }

      const header = sectionHeaders[category];
      const entry = `\n- [${new Date().toISOString()}] (Agent: ${agentId}): ${content}`;

      if (fileContent.includes(header)) {
        const parts = fileContent.split(header);
        fileContent = parts[0] + header + entry + parts[1];
      } else {
        fileContent += `\n\n${header}${entry}`;
      }

      if (cloudFS) {
        await cloudFS.writeFile(memoryFileName, fileContent);
      } else {
        const memoryPath = this.validatePath(projectPath, memoryFileName);
        await fs.writeFile(memoryPath, fileContent);
      }
      
      return { success: true, category, message: `Recorded in ${category}` };
    } finally {
      unlock();
    }
  }

  private async handleReadMemory(projectPath: string, category?: string, cloudFS?: CloudFSManager | null) {
    const memoryFileName = 'MEMORY.md';
    let fileContent = '';

    if (cloudFS) {
      if (!await cloudFS.exists(memoryFileName)) return "MEMORY.md does not exist yet.";
      fileContent = await cloudFS.readFile(memoryFileName);
    } else {
      const memoryPath = this.validatePath(projectPath, memoryFileName);
      if (!await fs.pathExists(memoryPath)) return "MEMORY.md does not exist yet.";
      fileContent = await fs.readFile(memoryPath, 'utf-8');
    }

    if (!category) return fileContent;

    const sectionHeaders: Record<string, string> = {
      architecture: '# 🏗 Architecture',
      conventions: '# 📏 Conventions & patterns',
      knowledge: '# 🧠 Knowledge Graph (Facts)',
      issues: '# 🛑 Known Issues'
    };

    const header = sectionHeaders[category];
    if (!fileContent.includes(header)) return `Section ${category} not found.`;

    const sections = Object.values(sectionHeaders);
    const startIdx = fileContent.indexOf(header);
    let endIdx = fileContent.length;

    for (const otherHeader of sections) {
      if (otherHeader === header) continue;
      const idx = fileContent.indexOf(otherHeader, startIdx + 1);
      if (idx !== -1 && idx < endIdx) {
        endIdx = idx;
      }
    }

    return fileContent.substring(startIdx, endIdx).trim();
  }

  private async runShellCommand(
    command: string, 
    cwd: string, 
    context: { projectId?: string, threadId?: string, toolCallId?: string, allowedCommands?: string[] }
  ): Promise<any> {
    let isAllowed = this.validateCommand(command, context.allowedCommands);
    
    if (this.policyStore) {
      const isRestricted = await this.policyStore.get('restrict_shell_commands');
      if (isRestricted) {
        console.log(`[ToolExecutor] Policy 'restrict_shell_commands' is ON. Forcing confirmation for: ${command}`);
        isAllowed = false; // Force confirmation flow
      }
    }
    
    if (!isAllowed) {
      if (!context.toolCallId) {
        throw new Error(`BLOCKED_COMMAND: '${command}' is restricted and cannot be confirmed without a toolCallId.`);
      }

      console.log(`[ToolExecutor] Command '${command}' requires confirmation. ToolCallId: ${context.toolCallId}`);
      
      // Broadcast pending status to UI
      broadcast('TOOL_EXECUTION', { 
        tool: 'run_shell', 
        status: 'pending', 
        args: { command },
        projectId: context.projectId,
        threadId: context.threadId,
        toolCallId: context.toolCallId
      });

      // Wait for approval
      const approved = await new Promise<boolean>((resolve) => {
        ToolExecutor.pendingConfirmations.set(context.toolCallId!, resolve);
        
        // Listen for abort signal
        const signal = context.threadId ? sessionManager.getSignal(context.threadId) : null;
        const onAbort = () => {
            if (ToolExecutor.pendingConfirmations.has(context.toolCallId!)) {
                ToolExecutor.confirm(context.toolCallId!, false);
            }
        };
        signal?.addEventListener('abort', onAbort);

        // Auto-reject after 5 minutes
        setTimeout(() => {
          if (ToolExecutor.pendingConfirmations.has(context.toolCallId!)) {
            signal?.removeEventListener('abort', onAbort);
            ToolExecutor.confirm(context.toolCallId!, false);
          }
        }, 300000);
      });

      if (!approved) {
        throw new Error("Command execution rejected by user or thread deleted.");
      }
    }

    this.validateCwd(cwd, cwd);
    const signal = context.threadId ? sessionManager.getSignal(context.threadId) : undefined;

    return new Promise((resolve, reject) => {
      exec(command, { cwd, timeout: 30000, signal }, (error, stdout, stderr) => {
        if (error) {
          if (error.name === 'AbortError') {
            reject(new Error('Command aborted: thread deleted.'));
          } else {
            reject(new Error(`Command failed: ${error.message}\n${stderr}`));
          }
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}