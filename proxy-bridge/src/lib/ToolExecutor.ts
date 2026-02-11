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
import { acquireWriteLock } from './SessionWriteLock';
import { withRetry } from './RetryUtils';
import { SecurityAuditor } from './SecurityAuditor';
import { approvalBridge } from './ExternalApprovalBridge';
import { MemoryStore } from './MemoryStore';
import { StyleScraper } from './learning/StyleScraper';
import { fileOwnershipRegistry } from './FileOwnershipRegistry';
import { getWorkerPrompt, WorkerType } from './prompts/workers';

// Registry to track workers in this process (for the prototype)
const workerRegistry = new Map<string, { status: string; prUrl?: string }>();
// Lock to prevent concurrent spawns for the same taskId
const spawnLocks = new Map<string, Promise<any>>();
// Track workers per swarm for completion detection
const swarmWorkerTracker = new Map<string, { total: number; completed: number; failed: number; projectPath: string; summaries: Map<string, string> }>();

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
    'git', 'npm', 'npx', 'node', 'python3', 'python', 'pip', 'pip3', 'ls', 'cat', 'head', 'tail',
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
        swarmId?: string;
        mainProjectPath?: string;
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
    let swarmId: string | undefined;
    let mainProjectPath: string | undefined;

    if (typeof contextOrPath === 'string') {
      projectPath = contextOrPath;
      agentId = legacyAgentId || 'unknown';
    } else {
      projectPath = contextOrPath.projectPath;
      agentId = contextOrPath.agentId || 'unknown';
      threadId = contextOrPath.threadId;
      projectId = contextOrPath.projectId;
      mode = contextOrPath.mode || 'local';
      swarmId = contextOrPath.swarmId;
      mainProjectPath = contextOrPath.mainProjectPath;
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
          // OC-10: Security Audit for file content
          const audit = await SecurityAuditor.auditContent(tool.arguments.content);
          if (!audit.safe) {
            console.error(`[SecurityAuditor] write_file BLOCKED: ${audit.findings.join(' ')}`);
            throw new Error(`SECURITY_BLOCK: ${audit.findings.join(' ')} ${audit.remediation}`);
          }

          if (cloudFS) {
            await cloudFS.writeFile(tool.arguments.path, tool.arguments.content);
            result = { success: true, path: tool.arguments.path };
          } else {
            const filePath = this.validatePath(projectPath, tool.arguments.path);
            
            // NB-01: File Ownership & Conflict Detection
            const previousOwner = fileOwnershipRegistry.recordWrite(filePath, agentId || 'unknown');
              if (previousOwner && previousOwner !== (agentId || 'unknown')) {
                const roundtable = new Roundtable(mainProjectPath || projectPath);
              await roundtable.postMessage('SYSTEM', 'alert', 
                `⚠️ Agent ${agentId} modified ${tool.arguments.path} which was last edited by ${previousOwner}. Potential conflict!`,
                { threadId, taskId: (tool.arguments as any).taskId }
              );
            }

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
          
          if (stats.size > 1024 * 1024) {
            result = `Error: File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Use a more specific tool.`;
            break;
          }

          const content = await fs.readFile(readPath, 'utf-8');
          const lines = content.split('\n');
          
          if (lines.length > 200) {
            // Stage 1: Summary Pattern
            const symbols = lines
              .map((line, idx) => ({ line, idx: idx + 1 }))
              .filter(l => /^\s*(export\s+)?(class|function|interface|enum|const|async\s+function)\s+([a-zA-Z0-9_]+)/.test(l.line))
              .map(l => `Line ${l.idx}: ${l.line.trim()}`);
            
            result = `FILE SUMMARY (Large File: ${lines.length} lines)\n\nSymbol Map:\n${symbols.join('\n') || 'No major symbols found.'}\n\nUse 'read_file_range' to read specific parts of this file.`;
          } else {
            result = content;
          }

          // OC-10: Redact secrets from read content
          if (typeof result === 'string') {
            const readAudit = await SecurityAuditor.auditContent(result);
            if (!readAudit.safe) {
              console.warn(`[SecurityAuditor] read_file WARNING: Secret detected. Redacting...`);
              result = `[REDACTED BY SECURITY AUDITOR: ${readAudit.findings.join(' ')}]`;
            }
          }
          break;

        case 'read_file_range':
          const rangePath = this.validatePath(projectPath, tool.arguments.path);
          const rangeContent = await fs.readFile(rangePath, 'utf-8');
          const rangeLines = rangeContent.split('\n');
          const start = Math.max(1, tool.arguments.start);
          const end = Math.min(rangeLines.length, tool.arguments.end);
          
          result = rangeLines.slice(start - 1, end).join('\n');

          // OC-10: Redact secrets from read content
          if (typeof result === 'string') {
            const readAudit = await SecurityAuditor.auditContent(result);
            if (!readAudit.safe) {
              console.warn(`[SecurityAuditor] read_file_range WARNING: Secret detected. Redacting...`);
              result = `[REDACTED BY SECURITY AUDITOR: ${readAudit.findings.join(' ')}]`;
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
          result = await this.handleSpawnWorker(projectPath, tool.arguments.taskId, tool.arguments.instructions, threadId);
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
          const roundtable = new Roundtable(mainProjectPath || projectPath);
          const teamMsg = await roundtable.postMessage(
            agentId || 'unknown',
            contextOrPath && typeof contextOrPath !== 'string' ? contextOrPath.agentId || 'agent' : 'agent',
            tool.arguments.content,
            { threadId, taskId: tool.arguments.taskId, swarmId }
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

        case 'teach_agent':
          const ms = new MemoryStore(projectPath);
          await ms.add(tool.arguments.type || 'style', tool.arguments.rule, 1.0);
          result = { success: true, message: `Rule learned: ${tool.arguments.rule}` };
          break;

        case 'learn_style':
          const samples = await StyleScraper.getSamples(projectPath, tool.arguments.path);
          result = { 
            success: true, 
            style_samples: StyleScraper.formatForPrompt(samples),
            message: `Learned user style from ${samples.length} examples. Please mimic this style in your next edits.`
          };
          break;

        case 'scout_project':
          result = await this.handleScoutProject(projectPath);
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
      
      // Upgrade 2: Persistence on Failure
      // If a tool fails, we must record this in the project context so the agent knows 
      // not to retry the same mistake blindly.
      try {
        const ptm = new ProjectTaskManager(projectPath);
        const failureNote = `[FAILURE] Tool '${tool.name}' failed at ${new Date().toISOString()}. Error: ${error.message}`;
        await this.handleWriteMemory(projectPath, 'issues', failureNote, agentId || 'system');
      } catch (logErr) {
        console.error('[ToolExecutor] Failed to log tool failure to memory:', logErr);
      }

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

  private async handleSpawnWorker(projectPath: string, taskId: string, instructions: string, architectThreadId?: string) {
    // Serialize spawns for the same taskId to prevent race conditions
    // when the LLM emits multiple spawn_worker calls in parallel
    const existingLock = spawnLocks.get(taskId);
    if (existingLock) {
      await existingLock;
      // After waiting, check if a worker was already spawned
      const existing = workerRegistry.get(taskId);
      if (existing && existing.status !== 'failed') {
        console.log(`[Swarm] Worker for ${taskId} already spawned by concurrent call (status: ${existing.status}). Skipping.`);
        return { success: true, taskId, message: `Worker for ${taskId} already running (${existing.status}). Skipped duplicate.` };
      }
    }

    const spawnPromise = this._doSpawnWorker(projectPath, taskId, instructions, architectThreadId);
    spawnLocks.set(taskId, spawnPromise.catch(() => {})); // Store but don't propagate errors to other waiters
    try {
      return await spawnPromise;
    } finally {
      spawnLocks.delete(taskId);
    }
  }

  private async _doSpawnWorker(projectPath: string, taskId: string, instructions: string, architectThreadId?: string) {
    // Prevent duplicate spawns for the same taskId
    const existing = workerRegistry.get(taskId);
    if (existing && existing.status !== 'failed') {
      console.log(`[Swarm] Worker for ${taskId} already exists (status: ${existing.status}). Skipping duplicate spawn.`);
      return { success: true, taskId, message: `Worker for ${taskId} already running (${existing.status}). Skipped duplicate.` };
    }
    workerRegistry.set(taskId, { status: 'starting' });
    
    console.log(`[Swarm] Spawning worker for task ${taskId}...`);
    
    // QB-05: Worker Prompt Templating
    let specializedInstructions = instructions;
    const roleMatch = instructions.match(/ROLE:\s*(UI_BEE|LOGIC_BEE|TEST_BEE)/);
    if (roleMatch) {
      const type = roleMatch[1] as WorkerType;
      const specializedPrompt = getWorkerPrompt(type);
      specializedInstructions = `${specializedPrompt}\n\n${instructions}`;
      console.log(`[Swarm] Injected specialized prompt for ${type}`);
    }

      // 1. Prepare worktree details — use a single timestamp for consistent IDs
      const spawnTs = Date.now();
      const wtName = `worker-${taskId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${spawnTs}`;
      const workerThreadId = `worker-${taskId}-${spawnTs}`;
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

        // QB-06: Parallel Launch Sequencer (Staggered launch)
        const activeCount = Array.from(workerRegistry.values()).filter(w => w.status === 'starting' || w.status === 'running').length;
        const staggerDelay = (activeCount - 1) * 500;
        if (staggerDelay > 0) {
          console.log(`[Swarm] Staggering launch for ${taskId} by ${staggerDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, staggerDelay));
        }

        // Derive a clean display name from taskId (e.g. "UI_BEE" → "UI Bee", "LOGIC_BEE" → "Logic Bee")
        const displayName = taskId.replace(/_/g, ' ').replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

        // 3. Broadcast the thread to the UI FIRST so it exists before messages arrive
        broadcast('UI_UPDATE', {
          action: 'SPAWN_THREAD',
          payload: {
            id: workerThreadId,
            title: displayName,
            agentId: wtName,
            parentTaskId: taskId,
            swarmId: architectThreadId || undefined,
            instructions: specializedInstructions,
            worktreePath: worktreeDir
          }
        });

          // 4a. Register in swarm tracker for completion detection
          if (architectThreadId) {
            const tracker = swarmWorkerTracker.get(architectThreadId) || { total: 0, completed: 0, failed: 0, projectPath, summaries: new Map() };
            tracker.total++;
            swarmWorkerTracker.set(architectThreadId, tracker);
          }

          // 4. Start the background runner (non-blocking) — pass the SAME threadId
          // Inherit the architect's provider/apiKey/model so workers use the same model
        const architectProviderId = architectThreadId ? sessionManager.getProvider(architectThreadId) : undefined;
        const architectApiKey = architectThreadId ? sessionManager.getApiKey(architectThreadId) : undefined;
        const architectModel = architectThreadId ? sessionManager.getModel(architectThreadId) : undefined;
        this.runBackgroundWorker(worktreeDir, taskId, specializedInstructions, wtName, workerThreadId, architectProviderId, architectApiKey, architectModel, architectThreadId, projectPath).catch(err => {
          console.error(`[Swarm] Worker for ${taskId} failed:`, err);
          workerRegistry.set(taskId, { status: 'failed' });
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

  private async runBackgroundWorker(worktreePath: string, taskId: string, instructions: string, agentId: string, threadId: string, providerId?: string, apiKey?: string, model?: string, swarmId?: string, mainProjectPath?: string) {
    const { AutonomousRunner } = await import('./AutonomousRunner');
    const { getIO } = await import('./socket-instance');
    
    const io = getIO();
    // Create a mock socket that redirects emits to the global io instance
    // Always tag events with the worker's threadId so the frontend routes messages correctly
    const mockSocket = {
      emit: (event: string, data: any) => {
        if (io) io.emit(event, { ...data, agentId, threadId, parentTaskId: taskId });
      },
      on: () => {},
      off: () => {}
    } as any;

    const runner = new AutonomousRunner(
      mockSocket,
      worktreePath,
      providerId || 'auto',   // Inherit architect's provider
      threadId,  // Use the SAME threadId as the SPAWN_THREAD broadcast
      apiKey || null,          // Inherit architect's API key
      'local',
      agentId,
      'code',
      swarmId,
      mainProjectPath
    );

    workerRegistry.set(taskId, { status: 'running' });
    
    // Broadcast running status to UI
    if (io) io.emit('UI_UPDATE', { action: 'WORKER_STATUS', payload: { threadId, taskId, status: 'running' } });

    // Derive project path from worktree path (go up to find the main project)
    const resolvedMainPath = mainProjectPath || (swarmId ? (swarmWorkerTracker.get(swarmId)?.projectPath || worktreePath) : worktreePath);

    let completionSummary = '';
    let workerStatus: 'completed' | 'failed' = 'completed';

    try {
      const result = await runner.executeLoop(instructions, [], model ? { model } : undefined);
      workerRegistry.set(taskId, { status: 'completed' });
      
      // Extract completion summary from the worker's last assistant message
      completionSummary = this.extractWorkerSummary(runner, taskId, result);
      
      if (io) io.emit('UI_UPDATE', { action: 'WORKER_STATUS', payload: { threadId, taskId, status: 'completed' } });
    } catch (error: any) {
      console.error(`[Swarm] Background worker ${agentId} error:`, error);
      workerRegistry.set(taskId, { status: 'failed' });
      workerStatus = 'failed';
      completionSummary = `[FAILED] Worker ${taskId} encountered an error: ${error.message}`;
      if (io) io.emit('UI_UPDATE', { action: 'WORKER_STATUS', payload: { threadId, taskId, status: 'failed' } });
    }

    // Auto-post completion summary to roundtable (guaranteed — even if the LLM forgot)
      try {
        const roundtable = new Roundtable(resolvedMainPath);
      await roundtable.postMessage(
        agentId,
        'worker',
        completionSummary,
        { threadId, taskId, swarmId }
      );
      console.log(`[Swarm] Auto-posted completion summary for ${taskId} to roundtable`);
    } catch (err: any) {
      console.error(`[Swarm] Failed to post completion summary for ${taskId}:`, err.message);
    }

    // Track swarm-level completion
    if (swarmId) {
      const tracker = swarmWorkerTracker.get(swarmId);
      if (tracker) {
        if (workerStatus === 'completed') tracker.completed++;
        else tracker.failed++;
        tracker.summaries.set(taskId, completionSummary);

        const allDone = (tracker.completed + tracker.failed) >= tracker.total;
        console.log(`[Swarm] Worker ${taskId} ${workerStatus}. Progress: ${tracker.completed + tracker.failed}/${tracker.total}`);

        if (allDone) {
          console.log(`[Swarm] All workers for swarm ${swarmId} have finished. Broadcasting SWARM_COMPLETE.`);
          
          // Compile all summaries into one report
          const allSummaries = Array.from(tracker.summaries.entries())
            .map(([tid, summary]) => `### ${tid}\n${summary}`)
            .join('\n\n');

          if (io) {
            io.emit('UI_UPDATE', {
              action: 'SWARM_COMPLETE',
              payload: {
                swarmId,
                completed: tracker.completed,
                failed: tracker.failed,
                total: tracker.total,
                report: allSummaries
              }
            });
          }

          // Also post the aggregated report to roundtable
            try {
              const roundtable = new Roundtable(resolvedMainPath);
            await roundtable.postMessage(
              'SYSTEM',
              'coordinator',
              `[SWARM COMPLETE] All ${tracker.total} workers finished (${tracker.completed} succeeded, ${tracker.failed} failed).\n\n${allSummaries}`,
              { swarmId }
            );
          } catch (err: any) {
            console.error(`[Swarm] Failed to post swarm completion to roundtable:`, err.message);
          }

          // Cleanup tracker
          swarmWorkerTracker.delete(swarmId);
        }
      }
    }

    if (workerStatus === 'failed') {
      throw new Error(`Worker ${taskId} failed`);
    }
  }

  /**
   * Extract a useful completion summary from a worker's session.
   * Scans tool results for file paths and the last assistant message for context.
   */
  private extractWorkerSummary(runner: any, taskId: string, lastResult: any): string {
    const messages = runner.getSessionMessages?.() || [];
    
    // Collect files written/modified from tool calls, with stats
    const filesInfo: { path: string; stats?: { added: number; removed: number } }[] = [];
    for (const msg of messages) {
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed?.path) {
            filesInfo.push({ path: parsed.path, stats: parsed.stats });
          }
        } catch {
          const pathMatches = msg.content.match(/(?:path|file)["']?\s*[:=]\s*["']([^"']+)["']/g);
          if (pathMatches) {
            for (const match of pathMatches) {
              const pathVal = match.match(/["']([^"']+)["']\s*$/);
              if (pathVal) filesInfo.push({ path: pathVal[1] });
            }
          }
        }
      }
    }

    // Get the last assistant message content
    let lastAssistantMsg = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].content) {
        lastAssistantMsg = typeof messages[i].content === 'string' 
          ? messages[i].content 
          : '';
        break;
      }
    }

    // Check if the worker already posted a [DONE] summary — if so, use that
    if (lastAssistantMsg.includes('[DONE]') || lastAssistantMsg.includes('Integration:') || lastAssistantMsg.includes('Files:')) {
      return lastAssistantMsg;
    }

    // Build the summary with file details
    const uniqueFiles = new Map<string, { added?: number; removed?: number }>();
    for (const f of filesInfo) {
      uniqueFiles.set(f.path, f.stats || {});
    }
    
    const filesSection = uniqueFiles.size > 0
      ? `Files:\n${[...uniqueFiles.entries()].map(([p, s]) => {
          const statsStr = s.added ? ` (+${s.added} lines${s.removed ? `, -${s.removed} lines` : ''})` : '';
          return `- ${p}${statsStr}`;
        }).join('\n')}`
      : 'No files modified.';

    return `[DONE] Worker ${taskId} completed.\n${filesSection}\n\nSummary: ${lastAssistantMsg.substring(0, 500)}`;
  }

  private async handleWriteMemory(projectPath: string, category: string, content: string, agentId: string | null, cloudFS?: CloudFSManager | null) {
    const memoryFileName = 'MEMORY.md';
    const memoryPath = cloudFS ? memoryFileName : this.validatePath(projectPath, memoryFileName);

    // Use filesystem-based write lock (cross-process safe)
    const lock = await acquireWriteLock({ filePath: path.resolve(projectPath, memoryFileName), timeoutMs: 10_000 });
    try {
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
        await fs.writeFile(memoryPath, fileContent);
      }

      return { success: true, category, message: `Recorded in ${category}` };
    } finally {
      await lock.release();
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
    // OC-10: Security Audit Framework
    const audit = await SecurityAuditor.auditCommand(command);
    if (!audit.safe) {
      console.error(`[SecurityAuditor] Command BLOCKED: ${audit.findings.join(' ')}`);
      throw new Error(`SECURITY_BLOCK: ${audit.findings.join(' ')} ${audit.remediation}`);
    }

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

      // OP-02: Also forward to external webhook if configured
      if (approvalBridge.isConfigured()) {
        approvalBridge.requestApproval(context.toolCallId!, command, context.threadId).then(webhookApproved => {
          // If the webhook responds before UI, resolve via ToolExecutor.confirm
          if (ToolExecutor.pendingConfirmations.has(context.toolCallId!)) {
            ToolExecutor.confirm(context.toolCallId!, webhookApproved);
          }
        }).catch(err => {
          console.error(`[ToolExecutor] Webhook approval failed: ${err.message}`);
        });
      }

      // Wait for approval (from UI or webhook — whichever comes first)
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

    // BP-20: Script-First Resilience
    // If the command is complex (contains heredocs, multiple lines, or is very long),
    // wrap it in a temporary script to avoid shell syntax/limit errors.
    const isComplex = command.includes('<<') || command.includes('\n') || command.length > 1000;
    
    return withRetry(async () => {
      if (isComplex) {
        const scriptName = `agent_cmd_${Date.now()}.sh`;
        const scriptPath = path.join(cwd, scriptName);
        try {
          await fs.writeFile(scriptPath, `#!/bin/bash\n${command}\n`, { mode: 0o755 });
          const scriptResult = await new Promise((resolve, reject) => {
            exec(`./${scriptName}`, { cwd, timeout: 60000, signal }, async (error, stdout, stderr) => {
              await fs.remove(scriptPath).catch(() => {}); // Cleanup
              if (error) {
                if (error.name === 'AbortError') {
                  reject(new Error('Command aborted: thread deleted.'));
                } else if ((error as any).code === 'EBADF') {
                  // OC-07: Spawn Fallback for EBADF
                  console.warn(`[ToolExecutor] EBADF detected in script execution. Retrying with fallback...`);
                  reject(error);
                } else {
                  reject(new Error(`Script execution failed: ${error.message}\n${stderr}`));
                }
              } else {
                resolve({ stdout, stderr });
              }
            });
          });
          return scriptResult;
        } catch (e: any) {
          await fs.remove(scriptPath).catch(() => {});
          throw e;
        }
      }

      return new Promise((resolve, reject) => {
        exec(command, { cwd, timeout: 30000, signal }, (error, stdout, stderr) => {
          if (error) {
            if (error.name === 'AbortError') {
              reject(new Error('Command aborted: thread deleted.'));
            } else if ((error as any).code === 'EBADF') {
              // OC-07: Spawn Fallback for EBADF
              console.warn(`[ToolExecutor] EBADF detected in exec. Retrying with fallback...`);
              reject(error);
            } else {
              reject(new Error(`Command failed: ${error.message}\n${stderr}`));
            }
          } else {
            resolve({ stdout, stderr });
          }
        });
      });
    }, { signal, maxRetries: 2 });
  }

  private async handleScoutProject(projectPath: string) {
    console.log(`[Scout] Scanning project at ${projectPath}...`);
    const results = await this.scanDirectory(projectPath, 0, 3);
    
    const summary = {
      modules: results.dirs.length,
      configFiles: results.configs,
      fileTypes: results.extensions,
      primaryLanguage: this.detectPrimaryLanguage(results.extensions),
      message: `Scouting complete: Found ${results.dirs.length} modules, ${results.configs.length} config files.`
    };

    return summary;
  }

  private async scanDirectory(dir: string, depth: number, maxDepth: number) {
    const stats = {
      dirs: [] as string[],
      configs: [] as string[],
      extensions: {} as Record<string, number>
    };

    if (depth > maxDepth) return stats;

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name.startsWith('.')) continue;

      if (entry.isDirectory()) {
        stats.dirs.push(entry.name);
        const subStats = await this.scanDirectory(path.join(dir, entry.name), depth + 1, maxDepth);
        stats.dirs.push(...subStats.dirs.map(d => `${entry.name}/${d}`));
        stats.configs.push(...subStats.configs);
        for (const [ext, count] of Object.entries(subStats.extensions)) {
          stats.extensions[ext] = (stats.extensions[ext] || 0) + count;
        }
      } else {
        const ext = path.extname(entry.name) || 'no-ext';
        stats.extensions[ext] = (stats.extensions[ext] || 0) + 1;

        if (['package.json', 'tsconfig.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'Makefile', 'README.md'].includes(entry.name)) {
          stats.configs.push(entry.name);
        }
      }
    }

    return stats;
  }

  private detectPrimaryLanguage(extensions: Record<string, number>): string {
    const langMap: Record<string, string[]> = {
      'TypeScript': ['.ts', '.tsx'],
      'JavaScript': ['.js', '.jsx'],
      'Python': ['.py'],
      'C/C++': ['.c', '.cpp', '.h', '.hpp'],
      'Go': ['.go'],
      'Rust': ['.rs']
    };

    let bestLang = 'Unknown';
    let maxCount = 0;

    for (const [lang, exts] of Object.entries(langMap)) {
      let count = 0;
      for (const ext of exts) {
        count += extensions[ext] || 0;
      }
      if (count > maxCount) {
        maxCount = count;
        bestLang = lang;
      }
    }

    return bestLang;
  }
}