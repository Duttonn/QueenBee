import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { broadcast } from '../infrastructure/socket-instance';
import { sessionManager } from '../agents/SessionManager';
import { Paths } from '../infrastructure/Paths';
import { CloudFSManager } from '../infrastructure/CloudFSManager';
import { ProjectTaskManager } from '../ProjectTaskManager';
import { ProposalService } from '../ProposalService';
import { EventLog } from '../agents/EventLog';
import { PolicyStore } from '../infrastructure/PolicyStore';
import { Roundtable } from '../agents/Roundtable';
import { acquireWriteLock } from '../infrastructure/SessionWriteLock';
import { withRetry } from '../infrastructure/RetryUtils';
import { SecurityAuditor } from '../infrastructure/SecurityAuditor';
import { approvalBridge } from '../infrastructure/ExternalApprovalBridge';
import { MemoryStore } from '../infrastructure/MemoryStore';
import { StyleScraper } from '../learning/StyleScraper';
import { fileOwnershipRegistry } from '../infrastructure/FileOwnershipRegistry';
import { getWorkerPrompt, getWorkerCapabilities, isToolAllowed, isKnownWorkerType, registerWorkerType, WorkerType, WorkerCapabilities } from '../prompts/workers';
import { indexFile, applyHashlineEdits } from '../infrastructure/HashlineIndex';
import { CredentialScrubber } from '../infrastructure/CredentialScrubber';
import { SkillsManager } from '../agents/SkillsManager';
import { SessionSearchIndex } from '../agents/SessionSearchIndex';
import { WorkflowTool } from '../tools/WorkflowTool';
import { AgentsmdLoader } from '../agents/AgentsmdLoader';
import { CommentChecker } from '../CommentChecker';
import { AstSearchTool } from '../tools/AstSearchTool';
import { TopologyManager } from '../infrastructure/TopologyManager';
import { agentDiscovery } from '../AgentDiscoveryService';
import { AgentFactory } from '../agents/AgentFactory';
import { unifiedLLMService } from '../UnifiedLLMService';
import { KnowledgeArtifactStore } from '../infrastructure/KnowledgeArtifactStore';
import { fileConflictDetector } from '../infrastructure/FileConflictDetector';

// Registry to track workers in this process (for the prototype)
const workerRegistry = new Map<string, { status: string; prUrl?: string }>();
// Lock to prevent concurrent spawns for the same taskId
const spawnLocks = new Map<string, Promise<any>>();
// Track workers per swarm for completion detection
const swarmWorkerTracker = new Map<string, { total: number; completed: number; failed: number; projectPath: string; summaries: Map<string, string> }>();
// Topology manager per swarm for structured communication
const swarmTopologyRegistry = new Map<string, TopologyManager>();

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
      // Capability enforcement: if the agent has a known worker type, check tool permissions
      if (agentId && agentId !== 'unknown') {
        const workerType = this.detectWorkerType(agentId);
        if (workerType) {
          const caps = getWorkerCapabilities(workerType);
          if (!isToolAllowed(caps, tool.name)) {
            console.warn(`[ToolExecutor] CAPABILITY_BLOCK: ${agentId} (${workerType}) not allowed to use ${tool.name}`);
            throw new Error(`CAPABILITY_BLOCK: Worker type ${workerType} is not permitted to use tool '${tool.name}'. Allowed tools: ${caps.allowedTools.join(', ') || 'all'}`);
          }
        }
      }

      let result = null;
      switch (tool.name) {
        // ... (write_file case remains same)
        case 'write_file': {
          // OC-10: Security Audit for file content
          const audit = await SecurityAuditor.auditContent(tool.arguments.content);
          if (!audit.safe) {
            console.error(`[SecurityAuditor] write_file BLOCKED: ${audit.findings.join(' ')}`);
            throw new Error(`SECURITY_BLOCK: ${audit.findings.join(' ')} ${audit.remediation}`);
          }

          // LS-01: Scope guard — validate against work environment if set
          if (tool.arguments.taskId || tool.arguments._taskId) {
            const scopeTaskId = tool.arguments.taskId || tool.arguments._taskId;
            const env = await ptm.getWorkEnvironment(scopeTaskId, projectPath);
            if (env?.files?.length) {
              const filePath = tool.arguments.path;
              const allowed = env.files.some((pattern: string) =>
                filePath.includes(pattern) || filePath.endsWith(pattern)
              );
              if (!allowed) {
                throw new Error(
                  `SCOPE_VIOLATION: '${filePath}' is outside the work environment for task ${scopeTaskId}. Allowed: ${env.files.join(', ')}`
                );
              }
            }
          }

          if (cloudFS) {
            await cloudFS.writeFile(tool.arguments.path, tool.arguments.content);
            result = { success: true, path: tool.arguments.path };
          } else {
            const filePath = this.validatePath(projectPath, tool.arguments.path);
            
            // P21-02: File conflict detection with locking
            await fileConflictDetector.acquireLock(filePath, agentId || 'unknown', 'write');

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

            // Codemap: update persistent codebase index
            try {
              const { codemapService } = await import('../infrastructure/CodemapService');
              codemapService.setRoot(projectPath);
              await codemapService.updateEntry(filePath, tool.arguments.content);
            } catch (_) {}

            // Auto-formatter: run Prettier if auto_format policy enabled
            try {
              const policiesPath = path.join(projectPath, '.queenbee', 'policies.json');
              const policies = await fs.readJson(policiesPath).catch(() => ({}));
              if (policies.auto_format && /\.(ts|tsx|js|jsx)$/.test(filePath)) {
                const { execFileSync } = await import('child_process');
                try {
                  execFileSync('prettier', ['--write', filePath], { cwd: projectPath, timeout: 15000, stdio: 'pipe' });
                } catch (_) {}
              }
            } catch (_) {}

            // P18-23: Post-write CommentChecker — warn on AI-slop comments
            const commentChecker = new CommentChecker({ mode: 'warn' });
            const commentResult = await commentChecker.checkFile(filePath).catch(() => null);
            const commentWarning = commentResult?.hasSlop
              ? CommentChecker.formatFindings(commentResult.findings)
              : null;

              result = { success: true, path: filePath, stats, ...(commentWarning ? { commentWarning } : {}) };

              // Invalidate graph cache so next scout_impact reflects this write
              const { GraphEngine: GE } = await import('./GraphEngine');
              GE.invalidate(projectPath);
            }
            break;
          }
            
          case 'run_shell':
          result = await this.runShellCommand(tool.arguments.command, projectPath, { projectId, threadId, toolCallId, allowedCommands });
          break;
          
        // ... (other cases remain same)
          
        case 'read_file': {
          const readPath = this.validatePath(projectPath, tool.arguments.path);
          const stats = await fs.stat(readPath);

          if (stats.size > 1024 * 1024) {
            result = `Error: File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Use a more specific tool.`;
            break;
          }

          // P18-01: with_hashes mode — return line content annotated with hashes for hashline_edit
          if (tool.arguments.with_hashes) {
            const lineEntries = await indexFile(readPath);
            result = lineEntries.map(e => `${e.lineNumber}|${e.hash}|${e.content}`).join('\n');
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
        }

        case 'get_codemap': {
          const { codemapService } = await import('../infrastructure/CodemapService');
          codemapService.setRoot(projectPath);
          if (tool.arguments.refresh) {
            await codemapService.buildCodemap(projectPath);
          }
          result = await codemapService.getCodemap();
          break;
        }

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

        // P18-19: init_agents_md — generate an AGENTS.md for a directory using Haiku
        case 'init_agents_md': {
          const loader = new AgentsmdLoader(projectPath);
          const targetDir = tool.arguments.directory || '.';
          const generated = await loader.generateForDirectory(targetDir, 'auto');
          if (generated) {
            const targetFile = path.join(this.validatePath(projectPath, targetDir), 'AGENTS.md');
            await fs.ensureDir(path.dirname(targetFile));
            await fs.writeFile(targetFile, generated, 'utf-8');
            result = { success: true, path: targetFile, content: generated };
          } else {
            result = { success: false, message: 'No code files found in directory to analyze.' };
          }
          break;
        }

        // P18-18: list_workflows — list available multi-step workflow tools
        case 'list_workflows': {
          const wt = new WorkflowTool(projectPath);
          const workflows = await wt.listAll();
          result = workflows.map(w => ({
            name: w.name,
            description: w.description,
            steps: w.steps.length,
            triggers: w.triggers || [],
          }));
          break;
        }

        // P18-18: run_workflow — execute a named workflow
        case 'run_workflow': {
          const wt = new WorkflowTool(projectPath);
          result = await wt.execute(tool.arguments.name, this, {
            projectPath,
            threadId,
            agentId: agentId || undefined,
          });
          break;
        }

        // P18-09: session_search — full-text search across past agent sessions
        case 'session_search': {
          const ssi = new SessionSearchIndex(projectPath);
          const searchResults = await ssi.search(
            tool.arguments.query,
            tool.arguments.limit ?? 10
          );
          result = searchResults.length > 0
            ? searchResults
            : { message: 'No matching sessions found.' };
          break;
        }

        // P18-11: list_skills — list available skills in .queenbee/skills/
        case 'list_skills': {
          const sm = new SkillsManager(projectPath);
          const skills = await sm.loadAll();
          result = skills.map(s => ({ name: s.name, description: s.description, triggers: s.triggers }));
          break;
        }

        // P18-11: load_skill — load a specific skill by name
        case 'load_skill': {
          const sm = new SkillsManager(projectPath);
          const skill = await sm.load(tool.arguments.name);
          if (!skill) {
            result = { error: `Skill '${tool.arguments.name}' not found. Use list_skills to see available skills.` };
          } else {
            result = { skill, formatted: SkillsManager.formatSkillContext(skill) };
          }
          break;
        }

        // P18-23: check_comments — scan a file for AI-slop comments
        case 'check_comments': {
          const ccPath = this.validatePath(projectPath, tool.arguments.path);
          const ccMode = (tool.arguments.mode as 'warn' | 'strip') ?? 'warn';
          const cc = new CommentChecker({ mode: ccMode });
          const ccResult = await cc.checkFile(ccPath);
          result = ccResult.hasSlop
            ? { hasSlop: true, message: CommentChecker.formatFindings(ccResult.findings), findings: ccResult.findings }
            : { hasSlop: false, message: 'No AI-slop comments detected.' };
          break;
        }

        // P18-01: hashline_edit — surgical per-line edits with hash validation
        case 'hashline_edit': {
          const hlPath = this.validatePath(projectPath, tool.arguments.path);
          const ops = tool.arguments.ops as Array<{ lineNumber: number; expectedHash: string; newContent: string }>;
          if (!Array.isArray(ops) || ops.length === 0) {
            result = { success: false, error: 'ops must be a non-empty array' };
            break;
          }
          const editResult = await applyHashlineEdits(hlPath, ops);
          
          // Invalidate graph cache so next scout_impact reflects this edit
          const { GraphEngine: GE } = await import('./GraphEngine');
          GE.invalidate(projectPath);
          
          result = editResult;
          break;
        }

        // P18-15: ast_search — structural code search via AST node patterns
        case 'ast_search': {
          const ast = new AstSearchTool(projectPath);
          const astMatches = await ast.search(
            tool.arguments.pattern,
            tool.arguments.language ?? 'ts',
            tool.arguments.path,
            tool.arguments.limit ?? 50
          );
          result = astMatches.length > 0
            ? { matches: astMatches, count: astMatches.length }
            : { matches: [], count: 0, message: 'No structural matches found.' };
          break;
        }

        // P18-15: ast_rewrite — structural code rewrite via AST pattern → replacement
        case 'ast_rewrite': {
          const ast = new AstSearchTool(projectPath);
          result = await ast.rewrite(
            tool.arguments.pattern,
            tool.arguments.replacement,
            tool.arguments.language ?? 'ts',
            tool.arguments.path
          );
          break;
        }

        // P18-22: git_commit — atomic commit enforcement with style detection
        case 'git_commit': {
          const commitMsg: string = tool.arguments.message;
          const stageAll: boolean = tool.arguments.stage_all ?? false;

          // Count staged + unstaged files that would be committed
          const stagedOutput = await new Promise<string>((res, rej) => {
            exec('git diff --cached --name-only', { cwd: projectPath }, (err, stdout) => {
              if (err) rej(err); else res(stdout.trim());
            });
          });
          const stagedFiles = stagedOutput ? stagedOutput.split('\n').filter(Boolean) : [];

          if (stagedFiles.length > 3) {
            // Detect commit style from recent log
            const logOutput = await new Promise<string>((res) => {
              exec('git log --format="%s" -20', { cwd: projectPath }, (_err, stdout) => res(stdout || ''));
            }).catch(() => '');
            const recentStyles = logOutput.split('\n').filter(Boolean).slice(0, 5).join(', ');
            result = {
              blocked: true,
              stagedFileCount: stagedFiles.length,
              files: stagedFiles,
              message: `ATOMIC_COMMIT_REQUIRED: ${stagedFiles.length} files staged. Split into ≤3-file commits for atomic history. Recent commit style: ${recentStyles || 'conventional commits'}`,
            };
            break;
          }

          // Stage all if requested
          if (stageAll) {
            await new Promise<void>((res, rej) => {
              exec('git add -A', { cwd: projectPath }, (err) => { if (err) rej(err); else res(); });
            });
          }

          // Execute commit
          const commitOut = await new Promise<string>((res, rej) => {
            const { execFile } = require('child_process');
            execFile('git', ['commit', '-m', commitMsg], { cwd: projectPath }, (err: any, stdout: string, stderr: string) => {
              if (err) rej(new Error(stderr || err.message)); else res(stdout.trim());
            });
          });
          result = { success: true, output: commitOut, filesCommitted: stagedFiles };
          break;
        }

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

        case 'read_memory': {
          // P17-04: If an entry ID is provided, use graph-aware retrieval via MemoryStore
          if (tool.arguments.id) {
            const memStore = new MemoryStore(projectPath);
            const depth: number = typeof tool.arguments.depth === 'number'
              ? Math.min(2, Math.max(0, Math.floor(tool.arguments.depth)))
              : 1;
            const entries = await memStore.getWithLinks(tool.arguments.id, depth);
            if (entries.length === 0) {
              result = `No memory entry found with id: ${tool.arguments.id}`;
            } else {
              result = { entries, count: entries.length };
            }
          } else {
            result = await this.handleReadMemory(projectPath, tool.arguments.category, cloudFS);
          }
          break;
        }

        case 'spawn_worker':
          result = await this.handleSpawnWorker(projectPath, tool.arguments.taskId, tool.arguments.instructions, threadId);
          break;

        case 'batch_spawn_workers':
          result = await this.batchSpawnWorkers(projectPath, tool.arguments.workers, threadId);
          break;

        case 'report_completion':
          workerRegistry.set(tool.arguments.taskId, {
            status: tool.arguments.status,
            prUrl: tool.arguments.prUrl
          });
          await ptm.completeTask(tool.arguments.taskId, agentId || 'unknown', projectPath);
          result = { success: true, message: `Status for ${tool.arguments.taskId} updated and PLAN.md synced.` };
          break;

        case 'discover_agents': {
          // P20-03: Agent Discovery Service — query for available agents
          const discoveryResult = agentDiscovery.discover({
            languages: tool.arguments.languages,
            frameworks: tool.arguments.frameworks,
            status: tool.arguments.status,
            swarmId: tool.arguments.swarmId,
            minReliability: tool.arguments.minReliability,
          });
          result = {
            agents: discoveryResult.agents.map(a => ({
              agentId: a.agentId,
              workerType: a.workerType,
              status: a.status,
              currentTask: a.currentTask,
              languages: a.capabilities.languages,
              frameworks: a.capabilities.frameworks,
              reliability: a.capabilities.reliability,
              quality: a.capabilities.quality,
            })),
            totalRegistered: discoveryResult.totalRegistered,
          };
          break;
        }

        case 'post_artifact': {
          // P20-07: Knowledge Artifact Synthesis
          const artifactStore = new KnowledgeArtifactStore(projectPath);
          const artifact = await artifactStore.store({
            type: tool.arguments.artifact_type || 'discovery',
            data: tool.arguments.data || {},
            agentId: agentId || 'unknown',
            taskId: tool.arguments.taskId || 'unknown',
            swarmId: tool.arguments.swarmId,
            summary: tool.arguments.summary,
          });
          result = { success: true, artifactId: artifact.id, message: `Artifact stored: ${artifact.type}` };
          break;
        }

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

        case 'claim_task': {
          const claimResult = await ptm.claimTask(tool.arguments.taskId, agentId || 'unknown', projectPath);
          if (typeof claimResult === 'object' && claimResult.blocked) {
            result = claimResult; // { success: false, blocked: true, waitingOn: [...], message }
          } else {
            result = { success: claimResult, taskId: tool.arguments.taskId, message: claimResult ? 'Task claimed' : 'Task not found or already claimed' };
          }
          break;
        }

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
          // Attach topology for structured routing
          if (swarmId && swarmTopologyRegistry.has(swarmId)) {
            roundtable.setTopology(swarmTopologyRegistry.get(swarmId)!);
          }
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

        case 'prompt_agent':
          result = await this.handlePromptAgent(
            mainProjectPath || projectPath,
            agentId || 'unknown',
            tool.arguments.targetAgent,
            tool.arguments.act,
            tool.arguments.content,
            tool.arguments.context,
            tool.arguments.requiresResponse
          );
          break;

        case 'respond_to_prompt':
          result = await this.handleRespondToPrompt(
            mainProjectPath || projectPath,
            agentId || 'unknown',
            tool.arguments.promptId,
            tool.arguments.response
          );
          break;

        case 'share_with_agent':
          result = await this.handleShareWithAgent(
            mainProjectPath || projectPath,
            agentId || 'unknown',
            tool.arguments.targetAgent,
            tool.arguments.query,
            tool.arguments.reason
          );
          break;

        // ============== LS-01: Work Environment ==============
        case 'set_work_environment': {
          await ptm.setWorkEnvironment(
            tool.arguments.taskId,
            tool.arguments.files,
            tool.arguments.notes,
            projectPath
          );
          result = {
            success: true,
            message: `Work environment set for task ${tool.arguments.taskId}: ${tool.arguments.files.length} file pattern(s) registered.`
          };
          break;
        }

        // ============== LS-02: Findings Blackboard ==============
        case 'write_finding': {
          const { v4: uuidv4 } = await import('uuid');
          const findingsPath = path.join(projectPath, '.queenbee', 'findings.json');
          await fs.ensureDir(path.dirname(findingsPath));
          const findings: any[] = await fs.readJson(findingsPath).catch(() => []);
          const finding = {
            id: uuidv4(),
            taskId: tool.arguments.taskId || '',
            agentId: agentId || 'unknown',
            title: tool.arguments.title,
            content: tool.arguments.content,
            tags: tool.arguments.tags || [],
            confidence: tool.arguments.confidence ?? 0.8,
            timestamp: new Date().toISOString(),
          };
          findings.push(finding);
          await fs.writeJson(findingsPath, findings, { spaces: 2 });
          result = { success: true, id: finding.id, message: `Finding "${finding.title}" saved.` };
          break;
        }

        case 'read_findings': {
          const findingsPath2 = path.join(projectPath, '.queenbee', 'findings.json');
          let allFindings: any[] = await fs.readJson(findingsPath2).catch(() => []);
          if (tool.arguments.taskId) allFindings = allFindings.filter((f: any) => f.taskId === tool.arguments.taskId);
          if (tool.arguments.agentId) allFindings = allFindings.filter((f: any) => f.agentId === tool.arguments.agentId);
          if (tool.arguments.tags?.length) {
            allFindings = allFindings.filter((f: any) =>
              tool.arguments.tags.some((t: string) => (f.tags || []).includes(t))
            );
          }
          const limit = tool.arguments.limit ?? 20;
          result = allFindings.slice(-limit);
          break;
        }

        // ============== LS-03: Swarm Context ==============
        case 'read_swarm_context': {
          const ctxProjectPath = mainProjectPath || projectPath;
          // Mission from PLAN.md
          const planPath2 = path.join(ctxProjectPath, 'PLAN.md');
          const planRaw = await fs.readFile(planPath2, 'utf-8').catch(() => '');
          const mission = planRaw.slice(0, 500);
          const pending2 = (planRaw.match(/^- \[ \]/gm) || []).length;
          const inProgress2 = (planRaw.match(/^- \[IN PROGRESS/gm) || []).length;
          const done2 = (planRaw.match(/^- \[(?:x|DONE)\]/gm) || []).length;

          // Recent roundtable
          const { Roundtable: RT } = await import('../agents/Roundtable');
          const rt2 = new RT(ctxProjectPath);
          const allMsgs = await rt2.getRecentMessages(3);

          // Top memories
          const memStore = new MemoryStore(ctxProjectPath);
          const mems = await memStore.getAll().catch(() => []);
          const topMems = mems
            .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
            .slice(0, 5);

          // Open proposals
          const ps = new ProposalService(ctxProjectPath);
          const openProposals = await ps.getPendingProposals();

          // Session summary
          const summaryPath = path.join(ctxProjectPath, '.queenbee', 'session-summary.md');
          const sessionSummary = await fs.readFile(summaryPath, 'utf-8').catch(() => null);

          result = {
            mission,
            tasks: { pending: pending2, inProgress: inProgress2, done: done2 },
            recentMessages: allMsgs,
            topMemories: topMems,
            openProposals,
            sessionSummary: sessionSummary ? sessionSummary.slice(0, 400) : null,
          };
          break;
        }

        // ============== LS-04: Proposal Debate ==============
        case 'challenge_proposal': {
          const ps2 = new ProposalService(mainProjectPath || projectPath);
          const challenged = await ps2.challenge(
            tool.arguments.proposalId,
            agentId || 'unknown',
            tool.arguments.risks,
            tool.arguments.questions,
            tool.arguments.severity
          );
          result = challenged
            ? { success: true, proposal: challenged, message: 'Proposal challenged. A judge should now call judge_proposal.' }
            : { success: false, message: 'Proposal not found.' };
          break;
        }

        case 'judge_proposal': {
          const ps3 = new ProposalService(mainProjectPath || projectPath);
          const judged = await ps3.judge(
            tool.arguments.proposalId,
            agentId || 'unknown',
            tool.arguments.confidence,
            tool.arguments.reasoning,
            tool.arguments.stressor
          );
          result = judged
            ? { success: true, proposal: judged, message: `Judgment recorded: ${judged.judgment?.confidenceLevel} (${judged.judgment?.confidence}/100)` }
            : { success: false, message: 'Proposal not found.' };
          break;
        }

        // ============== LS-07: Autonomous Recovery ==============
        case 'request_help': {
          const helpRt = new Roundtable(mainProjectPath || projectPath);
          const urgencyTag = tool.arguments.urgency ? `[${(tool.arguments.urgency as string).toUpperCase()}]` : '[MEDIUM]';
          const helpMsg = `[HELP REQUEST ${urgencyTag} from ${agentId}]\nProblem: ${tool.arguments.problem}\nCapability needed: ${tool.arguments.capability_needed}${tool.arguments.context ? `\nContext: ${tool.arguments.context}` : ''}`;
          await helpRt.postMessage(agentId || 'unknown', 'help_request', helpMsg, { threadId, swarmId });
          if (this.eventLog) {
            await this.eventLog.emit('help_requested', agentId || 'unknown', {
              problem: tool.arguments.problem,
              capability: tool.arguments.capability_needed,
            });
          }
          result = { success: true, message: 'Help request broadcast to roundtable. A capable teammate will respond.' };
          break;
        }

        case 'escalate_to_expert': {
          const escalateRt = new Roundtable(mainProjectPath || projectPath);
          const filesNote = tool.arguments.files_involved?.length
            ? `\nFiles: ${tool.arguments.files_involved.join(', ')}`
            : '';
          const escalateMsg = `[ESCALATION → ${tool.arguments.expert_type} from ${agentId}]\nProblem: ${tool.arguments.problem}${filesNote}${tool.arguments.context ? `\nContext: ${tool.arguments.context}` : ''}`;
          await escalateRt.postMessage(agentId || 'unknown', 'escalation', escalateMsg, {
            threadId,
            swarmId,
          });
          if (this.eventLog) {
            await this.eventLog.emit('escalation', agentId || 'unknown', {
              expertType: tool.arguments.expert_type,
              problem: tool.arguments.problem,
            });
          }
          result = { success: true, message: `Escalated to ${tool.arguments.expert_type}. They will pick this up on the next heartbeat or prompt cycle.` };
          break;
        }

        // ============== P19-11: Browser Control Tools ==============
        case 'browser_navigate': {
          const { mcpBrowserBridge } = await import('./MCPBrowserBridge');
          result = await mcpBrowserBridge.navigate(tool.arguments.url);
          break;
        }

        case 'browser_screenshot': {
          const { mcpBrowserBridge } = await import('./MCPBrowserBridge');
          result = await mcpBrowserBridge.screenshot(tool.arguments.url);
          break;
        }

        case 'browser_click': {
          const { mcpBrowserBridge } = await import('./MCPBrowserBridge');
          result = await mcpBrowserBridge.click(tool.arguments.selector);
          break;
        }

        case 'browser_type': {
          const { mcpBrowserBridge } = await import('./MCPBrowserBridge');
          result = await mcpBrowserBridge.type(tool.arguments.selector, tool.arguments.text);
          break;
        }

        case 'browser_get_dom': {
          const { mcpBrowserBridge } = await import('./MCPBrowserBridge');
          result = await mcpBrowserBridge.getDom(tool.arguments.selector);
          break;
        }

        case 'browser_connect': {
          const { mcpBrowserBridge } = await import('./MCPBrowserBridge');
          result = await mcpBrowserBridge.connect(tool.arguments.url);
          break;
        }

          case 'browser_visual_verify': {
            const { mcpBrowserBridge } = await import('./MCPBrowserBridge');
            result = await mcpBrowserBridge.visualVerify(
              tool.arguments.description,
              tool.arguments.key_elements
            );
            break;
          }

          // ── Graph / Impact-analysis tools ─────────────────────────────────
          case 'scout_impact': {
            const { GraphEngine } = await import('./GraphEngine');
            result = await GraphEngine.scoutImpact(projectPath, tool.arguments.file_path);
            break;
          }

          case 'graph_find_callers': {
            const { GraphEngine } = await import('./GraphEngine');
            result = await GraphEngine.getFunctionCallers(projectPath, tool.arguments.function_name);
            break;
          }

          case 'graph_summary': {
            const { GraphEngine } = await import('./GraphEngine');
            result = await GraphEngine.getGraphSummary(projectPath);
            break;
          }

          default:
          throw new Error(`Unknown tool: ${tool.name}`);
      }

      // P18-04: Scrub credentials from all tool outputs before broadcasting/logging
      if (result !== null && result !== undefined) {
        result = CredentialScrubber.scrubObject(result);
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
    
    // QB-05: Worker Prompt Templating — supports ANY worker type, not just built-in ones
    let specializedInstructions = instructions;
    const roleMatch = instructions.match(/ROLE:\s*([A-Z][A-Z0-9_]*(?:_BEE)?)/);
    if (roleMatch) {
      const type = roleMatch[1] as WorkerType;

      if (isKnownWorkerType(type)) {
        // Known type (built-in or previously registered) — use existing prompt
        const specializedPrompt = getWorkerPrompt(type);
        specializedInstructions = `${specializedPrompt}\n\n${instructions}`;
        console.log(`[Swarm] Injected known prompt for ${type}`);
      } else {
        // Unknown type — use AgentFactory to generate a specialized prompt on-the-fly
        try {
          const factory = new AgentFactory(unifiedLLMService);
          const agentSpec = await factory.createAgent({
              role: type,
              specialization: 'Task Specialist',
              systemPrompt: `You are a ${type} specialist. Task instructions: ${instructions}`
          });
          // Register so subsequent spawns of this type reuse the prompt
          registerWorkerType(type, agentSpec.systemPrompt, {
              canWriteFiles: true,
              canRunShell: true,
              canModifyTests: true,
              canSpawnWorkers: false,
              languages: ['typescript', 'javascript'],
              frameworks: [],
              allowedTools: [], // All tools allowed by default for generic factory agents
              reliability: 0.8,
              quality: 0.8
          });
          specializedInstructions = `${agentSpec.systemPrompt}\n\n${instructions}`;
          console.log(`[Swarm] Factory generated new agent type: ${type}`);
        } catch (err: any) {
          console.warn(`[Swarm] Factory generation failed for ${type}, using generic:`, err.message);
          specializedInstructions = `You are a specialized ${type} agent.\n\n${instructions}`;
        }
      }
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

            // 4b. Register in topology for structured communication
            let topology = swarmTopologyRegistry.get(architectThreadId);
            if (!topology) {
              // Auto-select topology based on expected swarm size
              const topoType = TopologyManager.autoSelect(tracker.total);
              topology = new TopologyManager(topoType);
              // Register the architect as the hub/root
              topology.addAgent({ id: architectThreadId, role: 'architect' });
              swarmTopologyRegistry.set(architectThreadId, topology);
              console.log(`[Swarm] Created ${topoType} topology for swarm ${architectThreadId}`);
            }
            const workerRole = roleMatch ? roleMatch[1] as string : 'worker';
            topology.addAgent({ id: wtName, role: 'worker' });
            console.log(`[Swarm] Registered ${wtName} (${workerRole}) in topology. Reachable: ${topology.getReachableAgents(wtName).join(', ')}`);
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

  /**
   * Batch spawn multiple workers concurrently using Promise.allSettled.
   * Respects max_parallel_launches from PolicyStore.
   * Emits BATCH_SPAWN_START/BATCH_SPAWN_COMPLETE socket events.
   */
  private async batchSpawnWorkers(
    projectPath: string,
    workers: Array<{ taskId: string; instructions: string }>,
    architectThreadId?: string
  ) {
    if (!workers || workers.length === 0) {
      return { success: false, error: 'No workers specified' };
    }

    const maxParallel = this.policyStore
      ? await this.policyStore.get('max_parallel_launches') || 3
      : 3;

    console.log(`[Swarm] Batch spawning ${workers.length} workers (max parallel: ${maxParallel})`);

    broadcast('UI_UPDATE', {
      action: 'BATCH_SPAWN_START',
      payload: {
        swarmId: architectThreadId,
        workerCount: workers.length,
        maxParallel,
      }
    });

    const results: Array<{ taskId: string; success: boolean; error?: string }> = [];

    // Process in batches of maxParallel
    for (let i = 0; i < workers.length; i += maxParallel) {
      const batch = workers.slice(i, i + maxParallel);

      const batchResults = await Promise.allSettled(
        batch.map(w => this.handleSpawnWorker(projectPath, w.taskId, w.instructions, architectThreadId))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        const w = batch[j];
        if (r.status === 'fulfilled') {
          results.push({ taskId: w.taskId, success: !!(r.value as any)?.success });
        } else {
          results.push({ taskId: w.taskId, success: false, error: r.reason?.message || 'Unknown error' });
        }
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    broadcast('UI_UPDATE', {
      action: 'BATCH_SPAWN_COMPLETE',
      payload: {
        swarmId: architectThreadId,
        succeeded,
        failed,
        total: workers.length,
        results,
      }
    });

    console.log(`[Swarm] Batch spawn complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      success: failed === 0,
      total: workers.length,
      succeeded,
      failed,
      results,
    };
  }

  private async runBackgroundWorker(worktreePath: string, taskId: string, instructions: string, agentId: string, threadId: string, providerId?: string, apiKey?: string, model?: string, swarmId?: string, mainProjectPath?: string) {
    const { AutonomousRunner } = await import('../agents/AutonomousRunner');
    const { broadcast: broadcastFn } = await import('../infrastructure/socket-instance');

    // Create a mock socket that broadcasts via the relay (works across processes)
    const mockSocket = {
      emit: (event: string, data: any) => {
        broadcastFn(event, { ...data, agentId, threadId, parentTaskId: taskId });
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

    // P20-03: Register agent in discovery service
    const detectedType = this.detectWorkerType(agentId) || 'GENERIC';
    agentDiscovery.register(agentId, detectedType, { swarmId, metadata: { taskId } });
    agentDiscovery.updateStatus(agentId, 'busy', taskId);

    // Broadcast running status to UI
    broadcastFn('UI_UPDATE', { action: 'WORKER_STATUS', payload: { threadId, taskId, status: 'running' } });

    // Derive project path from worktree path (go up to find the main project)
    const resolvedMainPath = mainProjectPath || (swarmId ? (swarmWorkerTracker.get(swarmId)?.projectPath || worktreePath) : worktreePath);

    let completionSummary = '';
    let workerStatus: 'completed' | 'failed' = 'completed';

    try {
      const result = await runner.executeLoop(instructions, [], model ? { model } : undefined);
      workerRegistry.set(taskId, { status: 'completed' });
      agentDiscovery.updateStatus(agentId, 'completed'); // P20-03
      agentDiscovery.deregister(agentId); // P20-03
      fileConflictDetector.releaseAllForAgent(agentId); // P21-02

      // Extract completion summary from the worker's last assistant message
      completionSummary = this.extractWorkerSummary(runner, taskId, result);

      broadcastFn('UI_UPDATE', { action: 'WORKER_STATUS', payload: { threadId, taskId, status: 'completed' } });
    } catch (error: any) {
      console.error(`[Swarm] Background worker ${agentId} error:`, error);
      workerRegistry.set(taskId, { status: 'failed' });
      agentDiscovery.updateStatus(agentId, 'failed'); // P20-03
      agentDiscovery.deregister(agentId); // P20-03
      fileConflictDetector.releaseAllForAgent(agentId); // P21-02
      workerStatus = 'failed';
      completionSummary = `[FAILED] Worker ${taskId} encountered an error: ${error.message}`;
      broadcastFn('UI_UPDATE', { action: 'WORKER_STATUS', payload: { threadId, taskId, status: 'failed' } });
    }

    // Auto-post completion summary to roundtable (guaranteed — even if the LLM forgot)
      try {
        const roundtable = new Roundtable(resolvedMainPath);
      // Attach topology for structured routing if available
      if (swarmId && swarmTopologyRegistry.has(swarmId)) {
        roundtable.setTopology(swarmTopologyRegistry.get(swarmId)!);
      }
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

          broadcast('UI_UPDATE', {
            action: 'SWARM_COMPLETE',
            payload: {
              swarmId,
              completed: tracker.completed,
              failed: tracker.failed,
              total: tracker.total,
              report: allSummaries
            }
          });

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

          // Cleanup tracker and topology
          swarmWorkerTracker.delete(swarmId);
          swarmTopologyRegistry.delete(swarmId);
        }
      }
    }

    // Post-completion roundtable listening phase (60 seconds)
    // Workers remain available to answer team questions after finishing their primary task.
    if (swarmId) {
      try {
        const listeningDuration = 60000; // 60 seconds
        let listeningEnd = Date.now() + listeningDuration;
        let lastSeenTs = new Date().toISOString();
        let responseCycles = 0;
        const maxResponseCycles = 3;

        console.log(`[Swarm] Worker ${agentId} entering post-task listening mode for ${listeningDuration / 1000}s`);

        while (Date.now() < listeningEnd && responseCycles < maxResponseCycles) {
          await new Promise(r => setTimeout(r, 8000)); // Poll every 8 seconds

          const rt = new Roundtable(resolvedMainPath);
          const recentMsgs = await rt.getRecentMessages(10, swarmId);

          // New messages: not from self, and either from user OR targeted at this worker
          const newMsgs = recentMsgs.filter(m =>
            m.timestamp > lastSeenTs &&
            m.agentId !== agentId &&
            m.threadId !== threadId &&
            (m.role === 'user' || !m.targetAgentId || m.targetAgentId === agentId || m.targetAgentId === threadId)
          );

          if (recentMsgs.length > 0) {
            lastSeenTs = recentMsgs[recentMsgs.length - 1].timestamp;
          }

          if (newMsgs.length > 0) {
            console.log(`[Swarm] Worker ${agentId} got ${newMsgs.length} post-completion roundtable message(s)`);
            responseCycles++;

            const ctx = newMsgs.map(m => `[${m.agentId}]: ${m.content}`).join('\n');
            await runner.executeLoop(
              `Your primary task is done. New team messages arrived:\n\n${ctx}\n\nRespond briefly via chat_with_team if the message is addressed to you or asks a question you can answer. Otherwise stay silent.`,
              []
            );

            // Extend listening window after each response
            listeningEnd = Math.max(listeningEnd, Date.now() + 30000);
          }
        }

        console.log(`[Swarm] Worker ${agentId} post-task listening ended`);
      } catch (err: any) {
        console.error(`[Swarm] Worker ${agentId} post-task listening error:`, err.message);
      }
    }

    if (workerStatus === 'failed') {
      throw new Error(`Worker ${taskId} failed`);
    }
  }

  /**
   * Detect worker type from agentId naming convention.
   * AgentIds follow pattern: worker-{ROLE}-{timestamp}
   * Supports any worker type, not just the built-in ones.
   */
  private detectWorkerType(agentId: string): string | null {
    // Pattern: worker-{type_with_dashes}-{timestamp}
    // e.g. "worker-ui-bee-1709123456" → "UI_BEE"
    // e.g. "worker-db-migration-bee-1709123456" → "DB_MIGRATION_BEE"
    const match = agentId.match(/^worker-(.+?)-\d+$/);
    if (match) {
      return match[1].toUpperCase().replace(/-/g, '_');
    }
    // Fallback: check if agentId itself contains a known pattern
    const upper = agentId.toUpperCase();
    const beeMatch = upper.match(/([A-Z][A-Z0-9_]*_BEE)/);
    if (beeMatch) return beeMatch[1];
    return null;
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
    
    // Note: restrict_shell_commands policy removed — ALLOWED_COMMANDS whitelist +
    // SecurityAuditor (above) already block genuinely dangerous commands.
    // Blanket-blocking all commands caused safe tools like grep/find to halt agents.
    
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

  // ============== Inter-Agent Communication Handlers ==============

  private async handlePromptAgent(
    projectPath: string,
    fromAgentId: string,
    targetAgent: string,
    act: string,
    content: string,
    context?: string,
    requiresResponse?: boolean
  ) {
    const { InterAgentCommunicator } = await import('../agents/InterAgentCommunicator');
    const communicator = new InterAgentCommunicator(projectPath);
    
    const prompt = await communicator.prompt(
      fromAgentId,
      targetAgent,
      act as any,
      content,
      { context, requiresResponse }
    );

    return {
      success: true,
      promptId: prompt.id,
      message: `Prompt sent to ${targetAgent}. ${requiresResponse ? 'Response expected.' : 'No response required.'}`
    };
  }

  private async handleRespondToPrompt(
    projectPath: string,
    agentId: string,
    promptId: string,
    response: string
  ) {
    const { InterAgentCommunicator } = await import('../agents/InterAgentCommunicator');
    const communicator = new InterAgentCommunicator(projectPath);
    
    const prompt = await communicator.respond(agentId, promptId, response);

    return {
      success: true,
      message: `Response sent to prompt ${promptId}`
    };
  }

  private async handleShareWithAgent(
    projectPath: string,
    fromAgentId: string,
    targetAgent: string,
    query: string,
    reason: string
  ) {
    const { InterAgentCommunicator } = await import('../agents/InterAgentCommunicator');
    const communicator = new InterAgentCommunicator(projectPath);
    
    const share = await communicator.shareMemories(fromAgentId, targetAgent, query, reason);

    return {
      success: true,
      sharedCount: share.memories.length,
      message: `Shared ${share.memories.length} relevant memories with ${targetAgent}: ${reason}`
    };
  }
}
