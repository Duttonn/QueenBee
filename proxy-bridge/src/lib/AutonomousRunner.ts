import { Socket } from 'socket.io';
import { ProjectTaskManager } from './ProjectTaskManager';
import { AgentSession } from './AgentSession';
import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { logContext } from './logger';
import { sessionManager } from './SessionManager';
import { Roundtable } from './Roundtable';
import fs from 'fs-extra';
import path from 'path';
import { Writable } from 'stream';
import { EventLog } from './EventLog';
import { MemoryStore } from './MemoryStore';
import { PolicyStore } from './PolicyStore';

export type AgentRole = 'solo' | 'orchestrator' | 'worker' | 'architect';

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
  
  private eventLog: EventLog;
  private memoryStore: MemoryStore;
  private policyStore: PolicyStore;
  private lastAttemptToolSignature: string = '';

  private static fileTreeCache = new Map<string, { files: string[]; timestamp: number }>();
  private static CACHE_TTL = 30000; // 30 seconds

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

    this.eventLog = new EventLog(projectPath);
    this.memoryStore = new MemoryStore(projectPath);
    this.policyStore = new PolicyStore(projectPath);
    
    if (agentId?.includes('architect')) {
      this.role = 'architect';
    } else if (agentId?.includes('orchestrator')) {
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
          if (this.threadId) {
            sessionManager.register(this.threadId);
          }
  
          try {
            // BP-15: Greeting Guard
            // If the prompt is just a greeting, respond directly without full context enhancement
            const isGreeting = /^(hello|hi|hey|greetings|hola|yo|good morning|good afternoon|good evening)[.!?]*$/i.test(userPrompt.trim());
            
            if (!this.session) {
                const systemPrompt = isGreeting 
                  ? "You are Queen Bee, a helpful AI assistant. The user is just saying hello. Respond briefly and naturally, and ask how you can help with their project today. Do not use any tools."
                  : await this.getEnhancedContext();
                
                this.session = new AgentSession(this.projectPath, {
                    systemPrompt,
                    maxSteps: isGreeting ? 1 : 15,
                    providerId: this.providerId,
                    threadId: this.threadId,
                    apiKey: this.apiKey || undefined,
                    mode: this.mode,
                    eventLog: this.eventLog,
                    memoryStore: this.memoryStore,
                    policyStore: this.policyStore
                });
  
                this.session.messages = [
                    ...this.session.messages, // System prompt is already here
                    ...history.filter(m => m.role !== 'system').map(m => ({
                        id: m.id, // Ensure IDs are preserved if they exist
                        role: m.role,
                        content: m.content || '',
                        tool_calls: m.tool_calls,
                        tool_call_id: m.tool_call_id,
                        name: m.name
                    }))
                ];
  
                this.session.on('event', (data) => {
                    this.sendEvent(data);
                    
                    // BP-10: Direct socket broadcast for the Agent Execution panel
                    if (data.type === 'tool_start') {
                        this.socket.emit('TOOL_EXECUTION', {
                            tool: data.data.toolName,
                            status: 'running',
                            args: data.data.args,
                            threadId: this.threadId,
                            toolCallId: data.data.toolCallId
                        });
                    } else if (data.type === 'tool_end') {
                        this.socket.emit('TOOL_RESULT', {
                            tool: data.data.toolName,
                            status: 'success',
                            result: data.data.result,
                            threadId: this.threadId,
                            toolCallId: data.data.toolCallId
                        });
                    } else if (data.type === 'tool_error') {
                        this.socket.emit('TOOL_RESULT', {
                            tool: data.data.toolName,
                            status: 'error',
                            error: data.data.error,
                            threadId: this.threadId,
                            toolCallId: data.data.toolCallId
                        });
                    } else if (data.type === 'plan_update') {
                        this.socket.emit('UI_UPDATE', {
                            action: 'SET_ACTIVE_PLAN',
                            payload: { plan: data.data.plan, threadId: this.threadId }
                        });
                    } else if (data.type === 'context_pruned') {
                        this.socket.emit('UI_UPDATE', {
                            action: 'NOTIFY_CONTEXT_PRUNE',
                            payload: { ...data.data, threadId: this.threadId }
                        });
                    }
                });
            }
  
            await this.executeRecursiveLoop(userPrompt, { ...options, composerMode: this.composerMode });
          } finally {
            if (this.threadId) {
              sessionManager.cleanup(this.threadId);
            }
          }
          this.sendEvent({ event: 'agent_finished', threadId: this.threadId });
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
        mode: this.mode,
        eventLog: this.eventLog,
        memoryStore: this.memoryStore,
        policyStore: this.policyStore
      });
      
      this.session.messages = [
        ...this.session.messages,
        ...history.filter(m => m.role !== 'system')
      ];
    }

    return await this.executeRecursiveLoop(userPrompt, { ...options, composerMode: this.composerMode });
  }

  /**
   * Recursive Runner: Plan -> Execute -> Fix
   */
      private async executeRecursiveLoop(userPrompt: string, options?: LLMProviderOptions): Promise<LLMMessage> {
        if (this.threadId && sessionManager.isAborted(this.threadId)) {
          throw new Error("Execution aborted by user (thread deleted)");
        }

        // BP-18: Intent Guard
        // Explicitly inject the user's current goal to prevent "task drift"
        const currentGoalContext = `
# CURRENT USER INTENT
The user wants you to: "${userPrompt}"
STRICT RULE: Do not perform ANY technical actions (benchmarks, refactors, files edits) that are not directly required to fulfill THIS SPECIFIC intent. 
If you finish this task, stop and wait for the next command.`;

        let result = await this.session!.prompt(userPrompt + currentGoalContext, options);

    // Capture tool signature for failure-aware retry
    const currentToolSignature = this.extractToolSignature(this.session!.messages);

    // BP-12: Ensure we ALWAYS have a summary if tools were used, even for solo agents
    const toolsUsed = this.session!.messages.some(m => m.role === 'tool');
    if (!result.content && (result.tool_calls || toolsUsed)) {
      console.log('[RecursiveRunner] Agent ended with tool calls or used tools but no text. Requesting summary...');
      result = await this.session!.prompt("Great. Please provide a brief summary of what you just finished doing for the user.", options);
    }

    // Solo Agent: return immediately after summary
    if (this.role === 'solo') {
      this.lastAttemptToolSignature = currentToolSignature;
      return result;
    }

    // Optimization: If no tool calls were made in the last turn, assume completion and skip verification
    if (!result.tool_calls || result.tool_calls.length === 0) {
      console.log('[RecursiveRunner] Turn ended with no tool calls. Skipping verification.');
      this.lastAttemptToolSignature = currentToolSignature;
      return result;
    }

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount < maxRetries) {
      if (this.threadId && sessionManager.isAborted(this.threadId)) {
        throw new Error("Execution aborted by user (thread deleted)");
      }
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

      // Failure-Aware Retry: Detect if agent is stuck repeating the same approach
      const retryToolSignature = this.extractToolSignature(this.session!.messages);
      let retryPrompt = `Your previous attempt failed verification. Reason: ${verification.reason}. Please fix the issues and verify again.`;

      if (retryToolSignature === this.lastAttemptToolSignature && this.lastAttemptToolSignature !== '') {
        console.warn('[RecursiveRunner] Detected repeated tool pattern. Injecting deep-think reset.');
        retryPrompt = `STOP. You are repeating the same failing approach. Take a completely different approach to solving this problem.\n\nPrevious failure: ${verification.reason}`;
      }
      this.lastAttemptToolSignature = retryToolSignature;

      result = await this.session!.prompt(retryPrompt, options);
    }

    return result;
  }

  /**
   * Extract a signature of recent tool calls for duplicate detection
   */
  private extractToolSignature(messages: LLMMessage[]): string {
    return messages
      .filter(m => m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0)
      .slice(-2)
      .flatMap(m => m.tool_calls || [])
      .map(tc => `${tc.function.name}:${tc.function.arguments}`)
      .join('|');
  }

  /**
   * Automatic Verification Step
   */
  private async verifyTask(lastMessage: LLMMessage): Promise<{ passed: boolean; reason?: string }> {
    console.log('[RecursiveRunner] Starting automatic verification...');
    
    // 1. Check for obvious failure indicators in the message
    let content = '';
    if (typeof lastMessage.content === 'string') {
        content = lastMessage.content.toLowerCase();
    } else if (Array.isArray(lastMessage.content)) {
        content = lastMessage.content
            .filter(p => p.type === 'text')
            .map(p => p.text)
            .join(' ')
            .toLowerCase();
    }
    
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
    const roundtable = new Roundtable(this.projectPath);
    const teamContext = await roundtable.getFormattedContext(10);
    
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
- While you are proactive in implementation, you MUST wait for a user instruction before using tools (write_file, replace, run_shell).
- Minimize conversational filler; prioritize correct, production-ready code.`;
    }

    let roleDirective = '';
    if (this.role === 'architect') {
      roleDirective = `
# ROLE: HIVE ARCHITECT (Swarm Lead)
- Your goal is to lead a SWARM RUSH. You are the strategic lead.
- STEP 1: DEEP ANALYSIS. You must understand the ENTIRE codebase. Use search tools extensively.
- STEP 2: DEFINE GOALS. Discuss objectives, criteria, and KPIs with the user.
- STEP 3: PROPOSE WORKERS. Propose the number and types of workers needed.
- STEP 4: GENERATE PROMPTS. Create well-rendered markdown files for each agent's instructions.
- STEP 5: VALIDATE. Present the plan and prompts to the user and wait for explicit validation.
- STEP 6: ORCHESTRATE. Use 'spawn_worker' only AFTER user validation. 
- You stay in the group chat (Roundtable) to guide workers. They will report to you.`;
    } else if (this.role === 'orchestrator') {
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

    const memories = await this.memoryStore.getAll();
    const highPriorityMemories = memories
      .filter(m => (m.type === 'style' || m.type === 'preference') && m.confidence >= 0.5)
      .map(m => `[${m.type.toUpperCase()}] ${m.content}`)
      .join('\n');

    const structuredMemories = memories
      .filter(m => m.type !== 'style' && m.type !== 'preference' && m.confidence >= 0.7)
      .map(m => `[${m.type.toUpperCase()}] ${m.content}`)
      .join('\n');

    return `
${modeDirective}
${roleDirective}

# USER PREFERENCES & STYLE (CRITICAL)
${highPriorityMemories || 'No personal style preferences recorded yet. I will learn from your corrections.'}

# PROJECT CONTEXT
Location: ${this.projectPath}
Execution Mode: ${this.mode}
File Tree:
${files.join('\n')}

# SHARED PROJECT MEMORY (MEMORY.md)
${sharedMemory}

# STRUCTURED MEMORY (Cortex)
${structuredMemories || 'No structured memories yet.'}

# AUTONOMY & INITIATIVE
1. **Technical Problem Solving**: Be creative and proactive. If a file is too large or in a binary format (like PDF), use your tools to find a workaround (e.g., write a script to extract text, use system tools like 'pdftotext').
2. **Task Completion**: Your goal is to fulfill the user's intent. Do not give up easily or ask the user to perform manual technical steps if you can automate them.
3. **Reference-Aware**: Use TASKS.md and the File Tree to guide your implementation, but always prioritize the user's latest command.
4. **Conciseness**: Show code immediately when a technical task is requested. No long preambles.
5. **Transparency**: List assumptions at the end under '🧠 ASSUMPTIONS'.

# TOOL USAGE & ISOLATION
${isolationDirective}
- Use 'write_memory' to share architecturally significant findings.
- Use 'read_memory' for deep technical details from the cortex.

# STRUCTURED THOUGHT PROTOCOL
Before executing ANY tool, you MUST first output your plan in this format:
<plan>
GOAL: [What the user asked for]
STEPS:
1. [First action] -> [Expected outcome]
2. [Second action] -> [Expected outcome]
CURRENT_STEP: [Which step you are on now]
</plan>

If a tool fails, you MUST update your plan before retrying:
<plan_update>
FAILED: [What failed and why]
NEW_APPROACH: [What you will try instead]
</plan_update>

NEVER retry the exact same command that just failed without changing something.

# TEAM COORDINATION (Roundtable)
The following is the recent history of messages from other agents in this swarm. Use this to guide your work and avoid duplication.
${teamContext}
`;
  }

  private async scanFiles(dir: string, depth = 0): Promise<string[]> {
    if (depth === 0) {
      const cached = AutonomousRunner.fileTreeCache.get(dir);
      if (cached && Date.now() - cached.timestamp < AutonomousRunner.CACHE_TTL) {
        console.log(`[AutonomousRunner] Using cached file tree for ${dir}`);
        return cached.files;
      }
    }

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

      if (depth === 0) {
        AutonomousRunner.fileTreeCache.set(dir, { files: results, timestamp: Date.now() });
      }
      return results;
    } catch { return []; }
  }
}