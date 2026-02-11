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
    private swarmId: string | undefined;
    private mainProjectPath: string; // Always points to the main project root (not worktree)

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
      composerMode: 'code' | 'chat' | 'plan' = 'code',
      swarmId?: string,
      mainProjectPath?: string
    ) {
      this.socket = socket;
      this.projectPath = projectPath;
      this.providerId = providerId;
      this.threadId = threadId;
      this.apiKey = apiKey;
      this.mode = mode;
      this.agentId = agentId;
      this.composerMode = composerMode;
      this.swarmId = swarmId;
      this.mainProjectPath = mainProjectPath || projectPath;
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

    /** Expose session messages for post-completion extraction */
    getSessionMessages(): LLMMessage[] {
      return this.session?.messages || [];
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
            // Store provider/apiKey/model so spawned workers inherit the same model
            sessionManager.setProvider(this.threadId, this.providerId);
            if (this.apiKey) sessionManager.setApiKey(this.threadId, this.apiKey);
            if (options?.model) sessionManager.setModel(this.threadId, options.model);
          }
  
          try {
            // BP-15: Greeting Guard
            // If the prompt is just a greeting, respond directly without full context enhancement
            const isGreeting = /^(hello|hi|hey|greetings|hola|yo|good morning|good afternoon|good evening)[.!?]*$/i.test(userPrompt.trim());
            
            if (!this.session) {
                const systemPrompt = isGreeting 
                  ? "You are Queen Bee, a helpful AI assistant. The user is just saying hello. Respond briefly and naturally, and ask how you can help with their project today. Do not use any tools."
                  : await this.getEnhancedContext();
                
                // Architect phase management: detect approval messages and advance phase
                let currentPhase: 'plan' | 'prompts' | 'launch' = this.threadId ? sessionManager.getArchitectPhase(this.threadId) : 'plan';
                if (this.role === 'architect' && this.threadId) {
                    const lowerPrompt = userPrompt.toLowerCase();
                    console.log(`[AutonomousRunner] Phase check: stored=${currentPhase}, threadId=${this.threadId}, prompt="${userPrompt.substring(0, 60)}"`);
                    if (currentPhase === 'plan' && lowerPrompt.includes('approved')) {
                    // Plan approved → advance to prompts phase
                    currentPhase = 'prompts';
                    sessionManager.setArchitectPhase(this.threadId, 'prompts');
                    console.log('[AutonomousRunner] Architect phase: plan → prompts');
                  } else if (currentPhase === 'prompts' && lowerPrompt.includes('approved') && lowerPrompt.includes('launch')) {
                    // Prompts approved → advance to launch phase
                    currentPhase = 'launch';
                    sessionManager.setArchitectPhase(this.threadId, 'launch');
                    console.log('[AutonomousRunner] Architect phase: prompts → launch');
                  }
                }
                
                const shouldBlockSpawn = this.role === 'architect' && currentPhase !== 'launch';
                this.session = new AgentSession(this.projectPath, {
                    systemPrompt,
                    maxSteps: isGreeting ? 1 : (this.role === 'architect' ? 20 : 15),
                    providerId: this.providerId,
                    threadId: this.threadId,
                    apiKey: this.apiKey || undefined,
                    mode: this.mode,
                    eventLog: this.eventLog,
                    memoryStore: this.memoryStore,
                    policyStore: this.policyStore,
                    blockedTools: shouldBlockSpawn ? ['spawn_worker'] : [],
                    swarmId: this.swarmId || (this.role === 'architect' ? this.threadId || undefined : undefined),
                    mainProjectPath: this.mainProjectPath
                });
                
                // Emit current phase so frontend knows where we are
                if (this.role === 'architect') {
                  this.sendEvent({ type: 'swarm_phase', data: { phase: currentPhase, threadId: this.threadId } });
                }
                
                // Inject phase-specific system messages for architect
                if (this.role === 'architect' && currentPhase === 'prompts') {
                  // After plan approval: tell architect to generate agent prompts, NOT launch
                  history = [...history, {
                    role: 'system' as const,
                    content: `The user has approved your plan. DO NOT call spawn_worker — it is still blocked.

Your next task: Generate a SEPARATE .md file for each worker agent using the write_file tool.

IMPORTANT — file naming convention:
- Name each file after the worker in lowercase with no underscores: e.g. uibee.md, logicbee.md, testbee.md
- Write them into the project root directory.

Each .md file should contain:
- A top-level heading with the worker name (e.g. # UI Bee)
- **Type**: The worker type (UI_BEE, LOGIC_BEE, TEST_BEE, etc.)
- **Files to create/modify**: Full file paths
- **Instructions**: Detailed step-by-step instructions — what to build, patterns to follow, acceptance criteria
- **Dependencies**: Any other workers this one depends on (or "None")

After writing all the files, ask the user to review and approve the agent prompts before launching.`
                  }];
                } else if (this.role === 'architect' && currentPhase === 'launch') {
                  // After prompts approval: unblock and launch
                  history = [...history, {
                    role: 'system' as const,
                    content: `The user has approved your agent prompts. spawn_worker is now UNBLOCKED.

For each worker, call spawn_worker with:
- taskId: Use the worker name as the ID (e.g. "UI_BEE", "LOGIC_BEE", "TEST_BEE"). Do NOT use REQ-XX IDs.
- instructions: Copy the full content of the worker's .md file you wrote earlier.

Call spawn_worker ONCE per worker. Do NOT re-present the plan or prompts. After spawning all workers, output a brief confirmation message listing who was launched.`
                  }];
                }
  
                // Separate injected system messages from conversation history
                const injectedSystemMsgs = history.filter(m => m.role === 'system' && m.content?.includes('approved'));
                const conversationHistory = history.filter(m => m.role !== 'system').map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content || '',
                    tool_calls: m.tool_calls,
                    tool_call_id: m.tool_call_id,
                    name: m.name
                }));
                
                this.session.messages = [
                    ...this.session.messages, // System prompt is already here
                    ...injectedSystemMsgs,    // Phase-transition system messages
                    ...conversationHistory     // User/assistant history
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
          policyStore: this.policyStore,
          blockedTools: [],
          swarmId: this.swarmId,
          mainProjectPath: this.mainProjectPath
        });
      
      this.session.messages = [
        ...this.session.messages,
        ...history.filter(m => m.role !== 'system')
      ];

      // Forward session events to the socket so the frontend can display worker progress
      this.session.on('event', (data) => {
        if (data.type === 'message') {
          this.socket.emit('UI_UPDATE', {
            action: 'WORKER_MESSAGE',
            payload: { ...data.data, threadId: this.threadId }
          });
        } else if (data.type === 'tool_start') {
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
        } else if (data.type === 'agent_status') {
          this.socket.emit('UI_UPDATE', {
            action: 'WORKER_STATUS',
            payload: { ...data.data, threadId: this.threadId }
          });
        }
      });
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
        if (this.role === 'architect') {
          const phase = this.threadId ? sessionManager.getArchitectPhase(this.threadId) : 'plan';
          const spawnCalls = (result.tool_calls || []).filter(tc => tc.function?.name === 'spawn_worker');
          if (phase === 'launch' && spawnCalls.length > 0) {
            const workerNames = spawnCalls
              .map(tc => {
                try {
                  const args = typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function?.arguments;
                  return args?.taskId || 'Worker';
                } catch {
                  return 'Worker';
                }
              })
              .filter(Boolean);
            result = { ...result, content: `Launched workers: ${workerNames.join(', ')}.` };
          } else {
            const nudge = phase === 'plan' 
              ? "You didn't output anything visible to the user. Present the plan with requirements now."
              : phase === 'prompts'
              ? "You didn't output anything visible to the user. Generate the detailed agent prompts (AGENTS.md style) for the user to review."
              : "You didn't output anything visible to the user. Call spawn_worker for each worker now.";
            console.log(`[RecursiveRunner] Architect ended with no text (phase=${phase}). Nudging...`);
            result = await this.session!.prompt(nudge, options);
          }
        } else {
          console.log('[RecursiveRunner] Agent ended with tool calls or used tools but no text. Requesting summary...');
          result = await this.session!.prompt("Great. Please provide a brief summary of what you just finished doing for the user.", options);
        }
      }

    // Solo Agent: return immediately after summary
    if (this.role === 'solo') {
      this.lastAttemptToolSignature = currentToolSignature;
      return result;
    }

    // Architect in launch phase: workers are spawned, nothing to verify — return immediately
    if (this.role === 'architect') {
      const archPhase = this.threadId ? sessionManager.getArchitectPhase(this.threadId) : 'plan';
      if (archPhase === 'launch') {
        console.log('[RecursiveRunner] Architect launch phase complete. Returning without verification.');
        this.lastAttemptToolSignature = currentToolSignature;
        return result;
      }
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
    const roundtable = new Roundtable(this.mainProjectPath);
    const effectiveSwarmId = this.swarmId || (this.role === 'architect' ? this.threadId || undefined : undefined);
    const teamContext = await roundtable.getFormattedContext(10, effectiveSwarmId);
    
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
You are the strategic lead of a swarm. Think like a senior tech lead briefing your team.

## Your 3-phase workflow (CRITICAL — follow exactly)

### Phase 1: PLAN (current phase on first message)
1. **Scout** — silently call 'scout_project' to understand the codebase. Don't narrate this step.
2. **Brief the user** — In ONE concise message, present:
   - A short summary of what you'll build and your approach (2-3 sentences max)
   - Requirements as a checklist: \`- [ ] REQ-01: Description\`  
   - Your proposed worker split: who does what and why
   
   Keep it tight. No fluff, no "Let me explain my thought process". Just the plan.
3. **STOP and wait** — End your message asking if they want to proceed or adjust. Do NOT call spawn_worker. Do NOT generate agent prompts yet.

### Phase 2: AGENT PROMPTS (after user approves the plan)
When the user approves, you will receive a system instruction to generate agent prompts.
- For each worker, write a detailed AGENTS.md-style document with:
  - Worker name and type (UI_BEE, LOGIC_BEE, TEST_BEE)
  - Exact files to create/modify
  - Patterns to follow, acceptance criteria
  - Dependencies between workers
- **STOP and wait** — Ask the user to approve the agent prompts. Do NOT call spawn_worker yet.

### Phase 3: LAUNCH (after user approves the agent prompts)
When the user approves, spawn_worker will be unblocked. Call spawn_worker for each worker using the prompts you generated.

## IMPORTANT CONSTRAINTS
- spawn_worker is BLOCKED until Phase 3. Do not attempt to call it before then.
- Each phase requires explicit user approval before advancing.
- Never re-present the plan or requirements after Phase 1 is complete.

## Communication & Roundtable
- Be direct and confident. You're a lead engineer, not a help desk.
- Don't over-explain or ask permission for obvious decisions.
- Use natural language, not numbered procedures.
- Keep messages SHORT. The requirements card and worker assignments do the heavy lifting.
- Workers report progress and blockers via the **Roundtable** (using the chat_with_team tool). Monitor it to stay aware of swarm status.
- The **USER has ultimate authority**. If the user says something in the Roundtable or chat that contradicts your plan, defer to the user immediately.`;
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
- You are an autonomous worker focused on a SINGLE task assigned by the Hive Architect.
- Stay in your assigned scope. Do not refactor unrelated files.

## Reporting & Communication (CRITICAL)
Use the **chat_with_team** tool for ALL communication. You MUST post at these checkpoints:

1. **On Start** — Post what you're about to implement and which files you'll touch.
2. **On Questions/Doubts** — If ANYTHING is unclear (missing dependency, ambiguous requirement, conflicting patterns), post a question via chat_with_team IMMEDIATELY. Do NOT guess or make assumptions. Tag your message with "[QUESTION]" so the Architect sees it. Wait for a response in the roundtable before proceeding on uncertain items.
3. **On Completion** — Post an **Integration Summary** with:
   - Files created/modified with full paths (e.g. \`frontend/src/components/LoginForm.tsx\`)
   - Key exports, components, functions, and their line numbers (e.g. \`LoginForm component — line 12\`)
   - How other workers should integrate with your work (imports, props, API endpoints)
   - Any setup steps needed (env vars, dependencies installed)
   
   Format example:
   \`\`\`
   [DONE] LoginForm implementation complete.
   Files:
   - frontend/src/components/LoginForm.tsx (new) — exports LoginForm component (line 8)
   - frontend/src/components/LoginPage.module.css (modified) — added .form, .input, .button classes (lines 15-45)
   
   Integration: import { LoginForm } from './LoginForm'; — accepts no props, manages own state.
   \`\`\`

4. **On Blockers** — Post immediately with "[BLOCKED]" prefix explaining what you need.

After posting the completion summary, call **report_completion(taskId, status)** to formally close the task.

## Chain of Command
- The **USER has ultimate authority**. If the user posts a message in the Roundtable that contradicts the Architect's instructions, follow the user's directive.
- The Architect coordinates your work, but the user can override any decision at any time.
- If you receive conflicting instructions, the priority order is: **User > Architect > Your own judgment**.`;
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