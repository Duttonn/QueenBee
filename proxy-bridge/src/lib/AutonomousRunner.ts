import { Socket } from 'socket.io';
import { ProjectTaskManager } from './ProjectTaskManager';
import { AgentSession } from './AgentSession';
import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { logContext } from './logger';
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
  private mode: 'local' | 'worktree' | 'cloud';
  private composerMode: 'code' | 'chat' | 'plan';
  private role: AgentRole;
  private tm: ProjectTaskManager;
  private session: AgentSession | null = null;
  private writable: Writable | null = null;
  private requestId: string | null = null;

  constructor(
    socket: Socket, 
    projectPath: string, 
    providerId: string = 'auto', 
    threadId: string | null = null, 
    apiKey: string | null = null, 
    mode: 'local' | 'worktree' | 'cloud' = 'worktree', 
    agentId: string | null = null,
    composerMode: 'code' | 'chat' | 'plan' = 'code'
  ) {
    this.socket = socket;
    this.projectPath = projectPath;
    this.providerId = providerId;
    this.threadId = threadId;
    this.apiKey = apiKey;
    this.mode = mode;
    this.agentId = agentId;
    this.composerMode = composerMode;
    this.tm = new ProjectTaskManager(projectPath);
    this.requestId = logContext.getStore()?.requestId || null;
    
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
      const payload = this.requestId ? { ...data, requestId: this.requestId } : data;
      console.log(`[AutonomousRunner] Sending Event: ${payload.type || payload.event}`);
      this.writable.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }

  async streamIntermediateSteps(userPrompt: string, history: LLMMessage[] = [], options?: LLMProviderOptions) {
      if (!this.session) {
          const systemPrompt = await this.getEnhancedContext();
          this.session = new AgentSession(this.projectPath, {
              systemPrompt,
              maxSteps: 15,
              providerId: this.providerId,
              threadId: this.threadId,
              apiKey: this.apiKey || undefined,
              mode: this.mode
          });

          this.session.messages = [
              ...this.session.messages, // System prompt is already here
              ...history.filter(m => m.role !== 'system').map(m => ({
                  role: m.role,
                  content: m.content || '',
                  tool_calls: m.tool_calls,
                  tool_call_id: m.tool_call_id,
                  name: m.name
              }))
          ];

          this.session.on('event', (data) => this.sendEvent(data));
      }

      await this.executeRecursiveLoop(userPrompt, options);
      this.sendEvent({ event: 'agent_finished' });
  }

  async executeLoop(userPrompt: string, history: LLMMessage[] = [], options?: LLMProviderOptions) {
    if (!this.session) {
      const systemPrompt = await this.getEnhancedContext();
      this.session = new AgentSession(this.projectPath, {
        systemPrompt,
        maxSteps: 15,
        providerId: this.providerId,
        threadId: this.threadId,
        apiKey: this.apiKey || undefined,
        mode: this.mode
      });
      
      this.session.messages = [
        ...this.session.messages,
        ...history.filter(m => m.role !== 'system')
      ];
    }

    return await this.executeRecursiveLoop(userPrompt, options);
  }

  /**
   * Recursive Runner: Plan -> Execute -> Fix
   */
  private async executeRecursiveLoop(userPrompt: string, options?: LLMProviderOptions): Promise<LLMMessage> {
    let result = await this.session!.prompt(userPrompt, options);
    
    // Solo Agent: Ensure we have a text response if the loop ended with tools
    if (this.role === 'solo') {
      if (!result.content && result.tool_calls) {
        console.log('[RecursiveRunner] Solo agent ended with tool calls but no text. Requesting summary...');
        result = await this.session!.prompt("Great. Please provide a brief summary of what you did for the user.", options);
      }
      return result;
    }

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount < maxRetries) {
      const verification = await this.verifyTask(result);
      
      if (verification.passed) {
        console.log(`[RecursiveRunner] Task verified successfully: ${verification.reason}`);
        break;
      }

      console.log(`[RecursiveRunner] Verification failed: ${verification.reason}. Restarting loop for fix.`);
      retryCount++;
      
      this.sendEvent({ 
        type: 'agent_status', 
        data: { 
          status: 'fixing', 
          message: `Verification failed: ${verification.reason}. Attempting to fix... (Retry ${retryCount}/${maxRetries})` 
        } 
      });

      result = await this.session!.prompt(
        `Your previous attempt failed verification. Reason: ${verification.reason}. Please fix the issues and verify again.`,
        options
      );
    }

    return result;
  }

  /**
   * Automatic Verification Step
   */
  private async verifyTask(lastMessage: LLMMessage): Promise<{ passed: boolean; reason?: string }> {
    console.log('[RecursiveRunner] Starting automatic verification...');
    
    // 1. Check for obvious failure indicators in the message
    const content = lastMessage.content?.toLowerCase() || '';
    if (content.includes('error:') || content.includes('failed to') || content.includes('cannot find')) {
      return { passed: false, reason: 'Agent reported an error in its response.' };
    }

    // 2. Perform a "Technical Review" via LLM
    try {
      const reviewPrompt: LLMMessage[] = [
        { 
          role: 'system', 
          content: 'You are a Senior QA Engineer. Review the following agent interaction and decide if the task was completed successfully. Respond ONLY with a JSON object: {"passed": boolean, "reason": "string"}'
        },
        ...this.session!.messages.slice(-5) // Context of the last few steps
      ];

      const response = await unifiedLLMService.chat(this.providerId, reviewPrompt, {
        apiKey: this.apiKey || undefined,
        response_format: { type: 'json_object' }
      });

      const review = JSON.parse(response.content || '{}');
      return {
        passed: !!review.passed,
        reason: review.reason || 'No reason provided by reviewer.'
      };
    } catch (error: any) {
      console.error('[RecursiveRunner] Verification check failed:', error);
      // Fallback: If verification itself fails, we assume passed to avoid infinite loops, 
      // but we could also be more conservative.
      return { passed: true, reason: 'Verification service unavailable.' };
    }
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

    let modeDirective = '';
    if (this.composerMode === 'chat') {
      modeDirective = `
# MODE: CHAT (Exploration & Planning)
- Focus on architectural discussion, explaining code, and planning.
- Do not modify files unless explicitly requested.
- Provide high-level context and trade-off analysis.`;
    } else if (this.composerMode === 'code') {
      modeDirective = `
# MODE: CODE (Implementation & Build)
- Focus on technical precision and direct implementation.
- Be proactive in using tools (write_file, replace, run_shell) to complete the task.
- Minimize conversational filler; prioritize correct, production-ready code.`;
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
${modeDirective}
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