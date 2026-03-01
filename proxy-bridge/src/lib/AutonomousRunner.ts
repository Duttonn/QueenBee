import { Socket } from 'socket.io';
import { ProjectTaskManager } from './ProjectTaskManager';
import { AgentSession } from './AgentSession';
import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { logContext } from './logger';
import { sessionManager } from './SessionManager';
import { Roundtable } from './Roundtable';
import { AgentCircuitBreaker } from './ByzantineDetector';
import { ContextCompressor } from './ContextCompressor';
import { GEAReflection } from './GEAReflection';
import { WorkflowOptimizer } from './WorkflowOptimizer';
import fs from 'fs-extra';
import path from 'path';
import { Writable } from 'stream';
import { EventLog } from './EventLog';
import { MemoryStore } from './MemoryStore';
import { PolicyStore } from './PolicyStore';
import { CompletionGate } from './CompletionGate';
import { JudgeInput } from './LLMJudge';
import { SkillsManager } from './SkillsManager';
import { IntentClassifier } from './IntentClassifier';

/**
 * Session Lifecycle States (from Composio Agent Orchestrator)
 * Represents the full lifecycle of an agent session from spawn to completion
 */
export enum SessionLifecycleState {
  SPAWNING = 'spawning',       // Creating workspace/runtime/agent
  WORKING = 'working',         // Agent actively processing
  PR_OPEN = 'pr_open',         // PR created, awaiting CI/reviews
  CI_FAILED = 'ci_failed',     // CI checks failed
  REVIEW_PENDING = 'review_pending', // Awaiting review
  CHANGES_REQUESTED = 'changes_requested', // Reviewer requested changes
  APPROVED = 'approved',      // Approved, not yet mergeable
  MERGEABLE = 'mergeable',     // Ready to merge
  MERGED = 'merged',           // Successfully merged
  NEEDS_INPUT = 'needs_input', // Agent blocked waiting for human
  STUCK = 'stuck',            // Agent inactive for too long
  ERRORED = 'errored',        // Agent hit an error
  KILLED = 'killed',          // Session killed
  BUDGET_EXCEEDED = 'budget_exceeded', // P18-05: Per-session cost cap hit
}

/**
 * Activity States (detected from agent introspection)
 */
export enum ActivityState {
  ACTIVE = 'active',           // Agent processing (thinking, writing)
  READY = 'ready',            // Finished turn, waiting for input
  IDLE = 'idle',              // Inactive for threshold duration
  WAITING_INPUT = 'waiting_input', // Permission prompt or question
  BLOCKED = 'blocked',        // Error encountered
  EXITED = 'exited',          // Process no longer running
}

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
  
  // CO-01: Lifecycle State Machine
  private lifecycleState: SessionLifecycleState = SessionLifecycleState.SPAWNING;
  private previousLifecycleState: SessionLifecycleState | null = null;
  private stateHistory: Array<{ state: SessionLifecycleState; timestamp: number }> = [];
  
  // CO-02: Activity Detection
  private activityState: ActivityState = ActivityState.READY;
  private lastActivityTimestamp: number = Date.now();
  private idleThresholdMs: number = 5 * 60 * 1000; // 5 minutes default
  
  private eventLog: EventLog;
  private memoryStore: MemoryStore;
  private policyStore: PolicyStore;
    private lastAttemptToolSignature: string = '';
    private swarmId: string | undefined;
    private mainProjectPath: string; // Always points to the main project root (not worktree)

    // LS-07: Reflexion error recovery
    private errorTracker = new Map<string, number>(); // error key → count
    private reflectionMemory: string[] = [];          // sliding window of 3 reflections
    private static readonly MAX_REFLECTIONS = 3;
    private static readonly REFLEXION_THRESHOLD = 3;  // trigger after N same errors

    // LS-08: Byzantine circuit breaker
    private circuitBreaker = new AgentCircuitBreaker(100);

    // LS-09: Context compressor
    private contextCompressor = new ContextCompressor(6);

    // P17-01: Goal-conditioned context pruning — last extracted goal from plan blocks
    private lastGoalDescription: string = '';

    private static fileTreeCache = new Map<string, { files: string[]; timestamp: number }>();
    private static CACHE_TTL = 30000; // 30 seconds

    // ============================================
    // CO-01: Lifecycle State Machine Methods
    // ============================================

    /**
     * Transition to a new lifecycle state and emit events
     */
    private transitionState(newState: SessionLifecycleState): void {
      if (this.lifecycleState === newState) return;
      
      const previousState = this.lifecycleState;
      this.previousLifecycleState = previousState;
      this.lifecycleState = newState;
      
      // Record state history
      this.stateHistory.push({ state: newState, timestamp: Date.now() });
      
      // Emit lifecycle event
      this.emitLifecycleEvent(newState, previousState);
      
      console.log(`[AutonomousRunner] State transition: ${previousState} → ${newState}`);
    }

    /**
     * Emit lifecycle state change events
     */
    private emitLifecycleEvent(state: SessionLifecycleState, previousState: SessionLifecycleState | null): void {
      // Send via writable stream
      this.sendEvent({
        type: 'lifecycle_state',
        data: {
          state,
          previousState,
          timestamp: Date.now(),
          threadId: this.threadId,
        }
      });

      // Also emit via socket for real-time UI updates
      this.socket.emit('SESSION_LIFECYCLE', {
        state,
        previousState,
        timestamp: Date.now(),
        threadId: this.threadId,
      });

      // Emit specific events based on state
      switch (state) {
        case SessionLifecycleState.SPAWNING:
          this.socket.emit('session.spawned', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.WORKING:
          this.socket.emit('session.working', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.PR_OPEN:
          this.socket.emit('pr.created', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.CI_FAILED:
          this.socket.emit('ci.failing', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.REVIEW_PENDING:
          this.socket.emit('review.pending', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.CHANGES_REQUESTED:
          this.socket.emit('review.changes_requested', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.APPROVED:
          this.socket.emit('review.approved', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.MERGEABLE:
          this.socket.emit('merge.ready', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.MERGED:
          this.socket.emit('merge.completed', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.NEEDS_INPUT:
          this.socket.emit('session.needs_input', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.STUCK:
          this.socket.emit('session.stuck', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.ERRORED:
          this.socket.emit('session.errored', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.KILLED:
          this.socket.emit('session.killed', { threadId: this.threadId, timestamp: Date.now() });
          break;
        case SessionLifecycleState.BUDGET_EXCEEDED:
          this.socket.emit('session.budget_exceeded', { threadId: this.threadId, timestamp: Date.now() });
          break;
      }
    }

    /**
     * Get current lifecycle state
     */
    public getLifecycleState(): SessionLifecycleState {
      return this.lifecycleState;
    }

    /**
     * Get lifecycle state history
     */
    public getStateHistory(): Array<{ state: SessionLifecycleState; timestamp: number }> {
      return [...this.stateHistory];
    }

    // ============================================
    // CO-02: Activity Detection Methods
    // ============================================

    /**
     * Update activity state and check for idle
     */
    private updateActivityState(newState: ActivityState): void {
      const previousState = this.activityState;
      if (previousState === newState) return;

      this.activityState = newState;
      this.lastActivityTimestamp = Date.now();

      // Emit activity state change
      this.socket.emit('ACTIVITY_STATE', {
        state: newState,
        previousState,
        timestamp: Date.now(),
        threadId: this.threadId,
      });

      console.log(`[AutonomousRunner] Activity: ${previousState} → ${newState}`);
    }

    /**
     * Mark agent as active (processing)
     */
    public markActive(): void {
      this.updateActivityState(ActivityState.ACTIVE);
    }

    /**
     * Mark agent as ready (waiting for input)
     */
    public markReady(): void {
      this.updateActivityState(ActivityState.READY);
    }

    /**
     * Check if agent is idle based on timestamp
     */
    public checkIdle(): boolean {
      const now = Date.now();
      if (this.activityState === ActivityState.READY && 
          now - this.lastActivityTimestamp > this.idleThresholdMs) {
        this.updateActivityState(ActivityState.IDLE);
        return true;
      }
      return false;
    }

    /**
     * Get current activity state
     */
    public getActivityState(): ActivityState {
      return this.activityState;
    }

    /**
     * Set idle threshold (for testing or configuration)
     */
    public setIdleThreshold(ms: number): void {
      this.idleThresholdMs = ms;
    }

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
- Name each file after the worker in lowercase with no underscores: e.g. uibee.md, dbbee.md, apibee.md (use whatever specialist names fit the task)
- Write them into the project root directory.

Each .md file should contain:
- A top-level heading with the worker name (e.g. # UI Bee)
- **Type**: The worker type — use ANY descriptive name (e.g. UI_BEE, LOGIC_BEE, TEST_BEE, DB_BEE, API_BEE, DEPLOY_BEE, SECURITY_BEE). You are NOT limited to predefined types — invent the right specialist for the task.
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
- taskId: Use the worker name as the ID (e.g. "UI_BEE", "DB_BEE", "API_BEE" — any descriptive name). Do NOT use REQ-XX IDs.
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

        // GEA-07: Load active workflow operator from evolved config
        let activeOperator: 'sequential' | 'ensemble' | 'review_revise' = 'sequential';
        try {
          const geaR = new GEAReflection(this.projectPath);
          const evolvedCfg = await geaR.loadEvolvedConfig();
          if (evolvedCfg?.workflowOperator) activeOperator = evolvedCfg.workflowOperator;
        } catch { /* default to sequential */ }

        let result = await this.session!.prompt(userPrompt + currentGoalContext, options);

        // P17-01: Goal-conditioned context pruning
        const lastAssistantContent = result.content ? String(result.content) : '';
        const extractedGoal = ContextCompressor.extractGoalFromPlan(lastAssistantContent);
        if (extractedGoal) this.lastGoalDescription = extractedGoal;
        if (this.lastGoalDescription && this.session) {
          this.session.messages = this.contextCompressor.pruneByGoal(
            this.session.messages,
            this.lastGoalDescription
          );
        }

        // GEA-07: Apply operator post-processing for ensemble / review_revise
        // Only applies to solo/worker roles (not architect which manages multi-turn flow itself)
        if (activeOperator !== 'sequential' && this.role !== 'architect' && result.content) {
          try {
            const baseMessages = this.session!.messages.filter(m => m.role !== 'tool').slice(-8);
            if (activeOperator === 'ensemble') {
              const ensembled = await WorkflowOptimizer.applyEnsemble(baseMessages, this.providerId, { apiKey: this.apiKey || undefined });
              if (ensembled.content) result = { ...result, content: ensembled.content };
            } else if (activeOperator === 'review_revise') {
              const revised = await WorkflowOptimizer.applyReviewRevise(baseMessages, this.providerId, { apiKey: this.apiKey || undefined });
              if (revised.content) result = { ...result, content: revised.content };
            }
          } catch (opErr) {
            console.warn(`[AutonomousRunner] Operator ${activeOperator} failed, using original response:`, opErr);
          }
        }

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

      // LS-07: Reflexion — check if this specific error keeps recurring
      const reflexionPrompt = this.handleToolError('verification', verification.reason || 'unknown');
      if (reflexionPrompt) {
        console.warn('[RecursiveRunner] Reflexion threshold hit — injecting recovery prompt.');
        retryPrompt = reflexionPrompt;
      }

      // LS-08: Byzantine circuit breaker check
      const lastContent = typeof result.content === 'string' ? result.content : JSON.stringify(result.content || '');
      const bCheck = this.circuitBreaker.check('verification_retry', lastContent, retryToolSignature);
      if (!bCheck.ok) {
        if (bCheck.reason === 'BUDGET_EXCEEDED') {
          console.warn('[RecursiveRunner] Agent budget exceeded. Stopping retry loop.');
          break;
        }
        if (bCheck.reason !== 'CIRCUIT_OPEN') {
          console.warn(`[RecursiveRunner] Byzantine fault detected: ${bCheck.reason}. Injecting recovery.`);

          // GEA-05: Group-based self-healing — query healthy peers for a repair directive
          let repairDirective: string | null = null;
          try {
            const geaReflection = new GEAReflection(this.projectPath);
            repairDirective = await geaReflection.repairReflect(
              this.threadId || 'unknown',
              [bCheck.reason || 'UNKNOWN_FAULT'],
              this.providerId,
              this.apiKey || undefined
            );
          } catch { /* ignore repair errors */ }

          retryPrompt = repairDirective
            ? `[GEA REPAIR] Peer analysis: ${repairDirective}`
            : `[SYSTEM] Fault detected: ${bCheck.reason}. You appear to be repeating a pattern. Stop current approach completely. Use request_help if you need assistance.`;
        }
      }

      result = await this.session!.prompt(retryPrompt, options);
    }

    // P18-02: CompletionGate — run quality checks before declaring DONE
    // Only applies to worker/solo roles that make file changes (not pure chat turns).
    // Enhanced: retry loop with max 10 continuation attempts before force-passing.
    if (this.role !== 'architect') {
      const MAX_GATE_RETRIES = 10;
      let gateAttempt = 0;
      let gatePassed = false;

      // Build judge input from session context for LLM-as-Judge (P20-01)
      const resultContent = typeof result === 'string'
        ? result
        : (result as any)?.content || (result as any)?.choices?.[0]?.message?.content || 'Task completed';
      const judgeInput: JudgeInput = {
        taskDescription: userPrompt || 'Agent task',
        agentOutput: resultContent,
        filesChanged: [], // Populated by CompletionGate via filesystem checks
        userRequest: userPrompt,
      };

      while (gateAttempt < MAX_GATE_RETRIES && !gatePassed) {
        try {
          const gate = new CompletionGate(this.projectPath, { timeoutMs: 20_000 });
          const gateResult = await gate.check(undefined, judgeInput);

          if (gateResult.pass) {
            console.log(`[CompletionGate] All checks passed (attempt ${gateAttempt + 1}).`);
            gatePassed = true;
          } else {
            gateAttempt++;
            console.warn(`[CompletionGate] Attempt ${gateAttempt}/${MAX_GATE_RETRIES} — ${gateResult.blockers.length} blocker(s): ${gateResult.blockers.join('; ')}`);

            this.sendEvent({
              type: 'COMPLETION_GATE_FAILED',
              data: {
                attempt: gateAttempt,
                maxAttempts: MAX_GATE_RETRIES,
                blockers: gateResult.blockers,
              }
            });
            this.sendEvent({
              type: 'agent_status',
              data: { status: 'fixing', message: `CompletionGate blockers (attempt ${gateAttempt}): ${gateResult.blockers.join('; ')}` }
            });

            if (gateAttempt >= MAX_GATE_RETRIES) {
              console.warn('[CompletionGate] Max retries exhausted. Proceeding with blockers.');
              break;
            }

            // Re-enter WORKING state for continuation
            this.transitionState(SessionLifecycleState.WORKING);

            const gatePrompt = `COMPLETION GATE FAILED (attempt ${gateAttempt}/${MAX_GATE_RETRIES}) — resolve before finishing:\n${gateResult.blockers.map(b => `- ${b}`).join('\n')}\nFix all issues then report done.`;
            result = await this.session!.prompt(gatePrompt, options);
          }
        } catch (gateErr) {
          console.warn('[CompletionGate] Check error (non-blocking):', gateErr);
          gatePassed = true; // Don't block on gate infrastructure errors
        }
      }
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
  - Worker name and type (any descriptive name — UI_BEE, LOGIC_BEE, DB_BEE, API_BEE, SECURITY_BEE, etc.)
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

    // GEA-04: Load evolved config for this project and inject into system prompt
    let evolvedDirectives = '';
    try {
      const geaReflection = new GEAReflection(this.projectPath);
      const evolvedConfig = await geaReflection.loadEvolvedConfig();
      if (evolvedConfig?.systemPromptAppend) {
        evolvedDirectives = `\n${evolvedConfig.systemPromptAppend}`;
      }
      if (evolvedConfig?.avoidPatterns && evolvedConfig.avoidPatterns.length > 0) {
        evolvedDirectives += `\n# AVOID PATTERNS (learned from past failures)\n` +
          evolvedConfig.avoidPatterns.map((p: string) => `- AVOID: ${p}`).join('\n');
      }
      // P18-12: Inject git history anti-patterns if available
      if (evolvedConfig?.git_history_lessons && evolvedConfig.git_history_lessons.length > 0) {
        evolvedDirectives += `\n# GIT HISTORY LESSONS (anti-patterns from past reverts)\n` +
          evolvedConfig.git_history_lessons.slice(0, 5).map((l: any) => `- AVOID: ${l.antiPattern}`).join('\n');
      }
    } catch { /* no evolved config yet — skip silently */ }

    // P18-11: SkillsManager — seed defaults and inject last-matched skill if set
    try {
      const skillsManager = new SkillsManager(this.projectPath);
      await skillsManager.ensureDefaults();
    } catch { /* non-fatal */ }

    return `
${modeDirective}
${roleDirective}
${evolvedDirectives}

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

# AUTONOMY PROTOCOL (CRITICAL — read carefully)
You are a truly autonomous agent. NEVER say "I can't do this" or "This is outside my capabilities" or "I don't have access to."

When you are stuck, use this decision tree:
1. **Lack knowledge** → call read_memory or read_findings first
2. **Lack a tool capability** → call request_help(problem, capability_needed) to ask teammates
3. **Blocked by dependency** → call check_status, then work on another task or wait
4. **Failed 3+ times on same step** → call request_help with full error context and what you tried
5. **Need deep domain expertise** → call escalate_to_expert(expert_type, problem)

Always make **forward progress**. Paralysis is never acceptable.
If you are completely stuck, write what you know with write_finding, then call request_help.
Do NOT abandon a task — escalate it.
`;
  }

  // LS-07: Reflexion — build recovery prompt after repeated failures
  private buildReflexionRecoveryPrompt(toolName: string, errorMessage: string): string {
    const pastReflections = this.reflectionMemory.length > 0
      ? `\n\nLearnings from past failures:\n${this.reflectionMemory.map((r, i) => `Attempt ${i + 1}: ${r}`).join('\n')}`
      : '';

    return `STOP — You have hit the same error ${AutonomousRunner.REFLEXION_THRESHOLD} times on "${toolName}": "${errorMessage.slice(0, 120)}"${pastReflections}

Do NOT try the same thing again. Instead:
1. Analyze WHY this keeps failing (root cause, not symptoms)
2. Consider using request_help to ask a teammate who has this capability
3. Break the task into smaller, more concrete steps
4. Write your analysis to memory using write_finding before continuing
5. Try a completely different approach

What assumption might be wrong? What have you not tried yet?`;
  }

  // LS-07: Track errors and trigger Reflexion when threshold hit
  private handleToolError(toolName: string, errorMessage: string): string | null {
    const key = `${toolName}:${errorMessage.slice(0, 60)}`;
    const count = (this.errorTracker.get(key) ?? 0) + 1;
    this.errorTracker.set(key, count);

    if (count >= AutonomousRunner.REFLEXION_THRESHOLD) {
      const reflection = `Failed ${toolName}: "${errorMessage.slice(0, 100)}"`;
      this.reflectionMemory.push(reflection);
      if (this.reflectionMemory.length > AutonomousRunner.MAX_REFLECTIONS) {
        this.reflectionMemory.shift();
      }
      this.errorTracker.delete(key); // reset for next round
      return this.buildReflexionRecoveryPrompt(toolName, errorMessage);
    }
    return null;
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