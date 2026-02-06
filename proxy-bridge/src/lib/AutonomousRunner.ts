import { Socket } from 'socket.io';
import { ProjectTaskManager } from './ProjectTaskManager';
import { AgentSession } from './AgentSession';
import { LLMMessage, LLMProviderOptions } from './types/llm';
import fs from 'fs-extra';
import path from 'path';
import { Writable } from 'stream';

export type AgentRole = 'solo' | 'orchestrator' | 'worker';

export class AutonomousRunner {
  private socket: Socket;
  private projectPath: string;
  private providerId: string;
  private threadId: string | null;
  private apiKey: string | null;
  private agentId: string | null;
  private mode: 'local' | 'worktree' | 'cloud' | 'autonomous' | 'solo';
  private role: AgentRole;
  private tm: ProjectTaskManager;
  private session: AgentSession | null = null;
  private writable: Writable | null = null;

  constructor(
    socket: Socket, 
    projectPath: string, 
    providerId: string = 'auto', 
    threadId: string | null = null, 
    apiKey: string | null = null, 
    mode: 'local' | 'worktree' | 'cloud' | 'autonomous' | 'solo' = 'worktree', 
    agentId: string | null = null
  ) {
    this.socket = socket;
    this.projectPath = projectPath;
    this.providerId = providerId;
    this.threadId = threadId;
    this.apiKey = apiKey;
    this.mode = mode;
    this.agentId = agentId;
    this.tm = new ProjectTaskManager(projectPath);
    
    // Determine role based on agentId suffix or metadata
    if (agentId?.includes('orchestrator')) {
      this.role = 'orchestrator';
    } else if (agentId?.includes('worker')) {
      this.role = 'worker';
    } else {
      this.role = 'solo';
    }
  }

  setWritable(writable: Writable) {
    this.writable = writable;
  }

  private sendEvent(data: any) {
    if (this.writable) {
      this.writable.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  /**
   * New method to stream intermediate steps from an existing session
   */
  async streamIntermediateSteps(userPrompt: string, options?: LLMProviderOptions) {
      if (!this.session) {
          const systemPrompt = await this.getEnhancedContext();
          this.session = new AgentSession(this.projectPath, {
              systemPrompt,
              maxSteps: 15,
              providerId: this.providerId,
              threadId: this.threadId || undefined,
              apiKey: this.apiKey || undefined
          });

          // Forward events from the session to the client via SSE
          this.session.on('event', (data) => this.sendEvent(data));
      }
      
      await this.session.prompt(userPrompt, options);
      this.sendEvent({ type: 'agent_finished', data: {} });
  }


  /**
   * Main agentic loop
   */
  async executeLoop(userPrompt: string, history: LLMMessage[] = [], options?: LLMProviderOptions) {
    if (!this.session) {
      const systemPrompt = await this.getEnhancedContext();
      this.session = new AgentSession(this.projectPath, {
        systemPrompt,
        maxSteps: 15,
        providerId: this.providerId,
        threadId: this.threadId || undefined,
        apiKey: this.apiKey || undefined
      });
      
      this.session.messages = [
        ...this.session.messages,
        ...history.filter(m => m.role !== 'system')
      ];
    }

    return await this.session.prompt(userPrompt, options);
  }

  async getEnhancedContext() {
    const files = await this.scanFiles(this.projectPath);
    const tasks = await this.tm.getPendingTasks();
    
    let sharedMemory = 'No shared memory recorded yet.';
    const memoryPath = path.join(this.projectPath, 'MEMORY.md');
    if (await fs.pathExists(memoryPath)) {
      const fullContent = await fs.readFile(memoryPath, 'utf-8');
      const lines = fullContent.split('\n');
      sharedMemory = lines.slice(0, 50).join('\n');
      if (lines.length > 50) {
        sharedMemory += '\n\n... (Memory truncated. Use read_memory tool to see more)';
      }
    }

    let roleDirective = '';
    if (this.role === 'orchestrator') {
      roleDirective = `
# ROLE: HIVE ORCHESTRATOR (Project Manager)
- Your goal is to PLAN and COORDINATE. Do not write complex code yourself.
- Break down the user's request into small, vertical tasks in a local 'TASKS.md' file.
- Use 'spawn_worker(taskId, instructions)' to start parallel agents for each task.
- Use 'check_status()' to monitor your workers.
- Once all tasks are complete, summarize the result for the user.`;
    } else if (this.role === 'worker') {
      roleDirective = `
# ROLE: WORKER BEE (Execution Unit)
- You are an autonomous worker focused on a SINGLE task.
- Stay in your assigned Worktree. Do not refactor unrelated files.
- When finished, use 'report_completion(taskId, status, prUrl)' to notify the Orchestrator.
- You do not talk to the user. You report to the system.`;
    } else {
      roleDirective = `
# ROLE: SOLO AGENT (Freelance Mode)
- You are working directly with the user.
- Complete the task efficiently and verify your work.`;
    }

    let isolationDirective = '';
    if (this.mode === 'worktree') {
      isolationDirective = `- Use 'create_worktree(name)' to isolate your work.`;
    } else if (this.mode === 'local') {
      isolationDirective = `- DO NOT create worktrees. Work directly in the project directory.`;
    }

    return `
${roleDirective}

# PROJECT CONTEXT
Location: ${this.projectPath}
Execution Mode: ${this.mode}
File Tree:
${files.join('\n')}

# SHARED PROJECT MEMORY (MEMORY.md)
${sharedMemory}

# AUTONOMY & SAFETY
1. **Read-Only Default**: Only modify files if asked for a fix/update/change.
2. **Conciseness**: Show code immediately. No long preambles.
3. **High Trust**: Never ask questions. Make professional assumptions.
4. **Transparency**: List assumptions at the end under '🧠 ASSUMPTIONS'.

# TOOL USAGE & ISOLATION
${isolationDirective}
- Use 'write_memory' to share architecturally significant findings.
- Use 'read_memory' for deep technical details from the cortex.
`;
  }

  private async scanFiles(dir: string, depth = 0): Promise<string[]> {
    if (depth > 2) return [];
    if (!fs.existsSync(dir)) return [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let results: string[] = [];
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
          results.push(`DIR: ${entry.name}`);
          if (depth < 1) results = results.concat(await this.scanFiles(path.join(dir, entry.name), depth + 1));
        } else {
          results.push(`FILE: ${entry.name}`);
        }
      }
      return results;
    } catch { return []; }
  }
}
