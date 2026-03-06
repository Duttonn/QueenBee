import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import { unifiedLLMService } from '../UnifiedLLMService';
import { ToolExecutor } from '../tools/ToolExecutor';
import { AGENT_TOOLS } from '../tools/ToolDefinitions';
import { sanitizeToolsForProvider } from '../tools/ToolSchemaBridge';
import { EventEmitter } from 'events';
import { sessionManager } from './SessionManager';
import { HeartbeatService } from './HeartbeatService';
import { EventLog } from './EventLog';
import { MemoryStore } from '../infrastructure/MemoryStore';
import { MemoryDistillation } from './MemoryDistillation';
import { PolicyStore } from '../infrastructure/PolicyStore';
import { CostTracker } from './CostTracker';
import { DiffLearner } from '../learning/DiffLearner';
import { diagnosticCollector } from './DiagnosticCollector';
import { Roundtable } from './Roundtable';
import { ExperienceArchive, TraceToolUse } from './ExperienceArchive';
import { MetacognitivePlanner } from './MetacognitivePlanner';
import { HealthScorer } from './HealthScorer';
import { ContextCompressor } from './ContextCompressor';
import { SessionSearchIndex } from './SessionSearchIndex';
import { AgentsmdLoader } from './AgentsmdLoader';
import { broadcast } from '../infrastructure/socket-instance';
import { CouncilAutomation } from './CouncilAutomation';
import fs from 'fs-extra';
import path from 'path';

/**
 * AgentSession encapsulates the agentic loop (Think -> Act -> Observe).
 * It now emits events to allow for streaming of its internal state.
 */
import { NotebookSession } from './NotebookSession';
import { ExecutionContext } from './ExecutionContext';

export class AgentSession extends EventEmitter {
  private session: NotebookSession;
  private eventLog?: EventLog;
  private memoryStore?: MemoryStore;
  private policyStore?: PolicyStore;
  private costTracker: CostTracker;
  private distillation: MemoryDistillation | null = null;
  private diffLearner: DiffLearner;
  private failureTracker = new Map<string, number>();

  // GEA-06: Evolutionary trace for Experience Archive
  private traceToolHistory: TraceToolUse[] = [];
  private traceSessionStart = Date.now();
  public blockedTools: Set<string> = new Set();
  public swarmId: string | undefined;
  public mainProjectPath: string | undefined;
  private lastSeenRoundtableTs: string = '';
  public parentSessionId?: string;
  private systemSnapshot?: string;

  constructor(projectPath: string, options: {
    systemPrompt?: string,
    maxSteps?: number,
    providerId?: string,
    threadId?: string,
    apiKey?: string,
    mode?: string,
    eventLog?: EventLog,
    memoryStore?: MemoryStore,
    policyStore?: PolicyStore,
      blockedTools?: string[],
      swarmId?: string,
      mainProjectPath?: string,
      parentSessionId?: string
    } = {}) {
    super();
    this.eventLog = options.eventLog;
    this.memoryStore = options.memoryStore;
    this.policyStore = options.policyStore;
    this.costTracker = new CostTracker(projectPath);
    this.diffLearner = new DiffLearner(projectPath);

    const context: ExecutionContext = {
      messages: options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : [],
      projectPath,
      maxSteps: options.maxSteps || 10,
      threadId: options.threadId || null,
      providerId: options.providerId || 'auto',
      apiKey: options.apiKey || null,
      mode: options.mode || 'local',
      sessionFiles: new Set<string>(),
      contextCompressor: new ContextCompressor(6, projectPath),
      toolExecutor: new ToolExecutor(this.eventLog, this.policyStore)
    };
    
    this.session = new NotebookSession(options.threadId || 'session-default', context);

    this.swarmId = options.swarmId;
    this.mainProjectPath = options.mainProjectPath;
    this.parentSessionId = options.parentSessionId;
    this.lastSeenRoundtableTs = new Date().toISOString();
    if (options.blockedTools) {
      this.blockedTools = new Set(options.blockedTools);
    }
  }

  get context() { return this.session.getContext(); }
  get messages() { return this.context.messages; }
  set messages(val: LLMMessage[]) { this.context.messages = val; }



  /** P18-03 + P18-19: Build frozen system snapshot with AGENTS.md context. */
  private async initSystemSnapshot(basePrompt: string): Promise<void> {
    try {
      const loader = new AgentsmdLoader(this.context.projectPath);
      const { content: agentsMd, sources } = await loader.load();
      if (agentsMd) {
        this.systemSnapshot = `${basePrompt}\n\n## Project Agent Context (AGENTS.md)\n${agentsMd}`;
        console.log(`[AgentSession] System snapshot built with AGENTS.md from ${sources.length} source(s).`);
      } else {
        this.systemSnapshot = basePrompt;
      }
    } catch {
      this.systemSnapshot = basePrompt;
    }
  }

  /**
   * Submit a new user prompt and run the loop until completion or max steps.
   */
  async prompt(text: string, options?: LLMProviderOptions): Promise<LLMMessage> {
    const lastMsg = this.messages[this.messages.length - 1];
    // Check if the message is already there to avoid duplicates in the message history
    if (!lastMsg || lastMsg.content !== text || lastMsg.role !== 'user') {
      const userMessage: LLMMessage = { 
        id: `msg-user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        role: 'user', 
        content: text 
      };
      this.messages.push(userMessage);
      // We DO NOT emit the 'message' event here for the user message 
      // because the frontend already added it optimistically.
    }
    return this.runLoop(options);
  }

  /**
   * Core Agentic Loop
   */
      private async runLoop(options?: LLMProviderOptions): Promise<LLMMessage> {
        let stepCount = 0;

        // OP-03: Track session in diagnostics
        if (this.context.threadId) diagnosticCollector.sessionStart(this.context.threadId);

        try {
          while (stepCount < this.context.maxSteps) {
            if (this.context.threadId && sessionManager.isAborted(this.context.threadId)) {
              throw new Error("Execution aborted by user (thread deleted)");
            }

            // Record heartbeat pulse
              if (this.context.threadId) {
                HeartbeatService.ping(this.context.threadId).catch(err => console.error('[AgentSession] Heartbeat failed:', err));
                diagnosticCollector.sessionStep(this.context.threadId);
              }

              // Roundtable polling: check for new messages from other agents/user
              // Skip on first iteration (context was already injected via getEnhancedContext)
              if (stepCount > 0) {
                await this.injectNewRoundtableMessages();
              }

              stepCount++;

            // P18-08: 2-Pass Context Pressure Check
            const pressure = await this.context.contextCompressor.estimateContextPressure(this.context.messages);
            if (pressure > 0.75) {
              // Pass 2: hard clear — replace old tool results with 1-line summaries
              const { messages: cleared, ratio } = await this.context.contextCompressor.hardClear(this.context.messages);
              this.context.messages = cleared;
              console.log(`[AgentSession] P2 HardClear at ${(pressure * 100).toFixed(0)}% pressure. Cleared ${(ratio * 100).toFixed(0)}% of content.`);
              this.emit('event', { type: 'context_pruned', data: { pass: 2, pressureRatio: pressure, clearedRatio: ratio } });
            } else if (pressure > 0.4) {
              // Pass 1: soft trim old tool results
              this.context.messages = await this.context.contextCompressor.processHistory(this.context.messages);
              console.log(`[AgentSession] P1 SoftTrim at ${(pressure * 100).toFixed(0)}% pressure.`);
            }

        this.emit('event', { type: 'step_start', data: { step: stepCount, status: 'thinking' } });

        if (this.eventLog) {
          await this.eventLog.emit('step_start', this.context.threadId || 'unknown', { step: stepCount });
        }

        const sanitizedTools = sanitizeToolsForProvider(AGENT_TOOLS as any, this.context.providerId);
        const llmStartTime = Date.now();
        const response: LLMResponse = await unifiedLLMService.chat(this.context.providerId, this.messages, {
          ...options,
          apiKey: this.context.apiKey || undefined,
          tools: sanitizedTools as any,
          // P18-03: Pass frozen snapshot so AnthropicProvider can use prefix caching
          systemSnapshot: this.systemSnapshot,
        });
        
        console.log(`[AgentSession] LLM Response: content length=${response.content?.length || 0}, tool_calls=${response.tool_calls?.length || 0}`);

        if (response.usage) {
          const cost = CostTracker.calculateCost(response.model || 'unknown', response.usage.prompt_tokens, response.usage.completion_tokens);
          await this.costTracker.log({
            agentId: this.context.threadId || 'unknown',
            threadId: this.context.threadId || 'unknown',
            model: response.model || 'unknown',
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            cost,
            latencyMs: Date.now() - llmStartTime,
          }).catch(err => console.error('[AgentSession] Failed to log cost:', err));

          // P18-05: Budget Enforcement — abort if per-session spend exceeds cap
          if (this.policyStore && this.context.threadId) {
            try {
              const budgetLimit: number = await this.policyStore.get('budget_limit_usd') ?? 0;
              if (budgetLimit > 0) {
                const sessionTotal = await this.costTracker.getSessionTotal(this.context.threadId);
                if (sessionTotal >= budgetLimit) {
                  console.warn(`[AgentSession] Budget exceeded: $${sessionTotal.toFixed(4)} >= $${budgetLimit} limit for session ${this.context.threadId}`);
                  this.emit('event', {
                    type: 'agent_status',
                    data: {
                      status: 'budget_exceeded',
                      message: `Session cost $${sessionTotal.toFixed(4)} has exceeded the $${budgetLimit} budget limit. Stopping.`,
                      sessionTotal,
                      budgetLimit,
                    }
                  });
                  throw new Error(`BUDGET_EXCEEDED: Session cost $${sessionTotal.toFixed(4)} exceeded $${budgetLimit} limit.`);
                }
              }
            } catch (budgetErr: any) {
              if (budgetErr.message?.startsWith('BUDGET_EXCEEDED')) throw budgetErr;
              console.error('[AgentSession] Budget check failed:', budgetErr);
            }
          }
        }

        if (this.eventLog) {
          await this.eventLog.emit('step_end', this.context.threadId || 'unknown', { 
            step: stepCount, 
            tool_calls: response.tool_calls?.length || 0 
          });
        }

        const assistantMessage: LLMMessage = { 
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant', 
          content: response.content, 
          tool_calls: response.tool_calls 
        };
        
        // Upgrade 2: Extract and Emit Plan
        if (response.content) {
          const plan = this.extractPlan(response.content);
          if (plan) {
            this.emit('event', { type: 'plan_update', data: { plan, threadId: this.context.threadId } });
          }
        }

        this.messages.push(assistantMessage);
        this.emit('event', { type: 'message', data: { ...assistantMessage, threadId: this.context.threadId } });

        if (!response.tool_calls || response.tool_calls.length === 0) {
          break; // End of loop
        }

          // Execute all tool calls in parallel for better performance
          const toolExecutionPromises = response.tool_calls.map(async (toolCall) => {
            const toolName = toolCall.function.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              console.error(`Failed to parse arguments for tool ${toolName}`, toolCall.function.arguments);
            }

            // Block restricted tools — return an error without executing
            if (this.blockedTools.has(toolName)) {
              console.log(`[AgentSession] Blocked tool '${toolName}' — returning gate error to LLM`);
              this.emit('event', { type: 'tool_end', data: { toolName, result: { error: 'BLOCKED: You must present your plan and wait for user approval before calling this tool.' }, toolCallId: toolCall.id } });
              return {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({ error: 'BLOCKED: spawn_worker is locked until the user approves your plan. You MUST output a message with: 1) Requirements checklist (- [ ] REQ-XX: ...), 2) Worker assignments (who does what). End by asking the user to validate. Do NOT try to call spawn_worker again until they respond.' })
              } as LLMMessage;
            }

            this.emit('event', { type: 'tool_start', data: { toolName, args, toolCallId: toolCall.id } });
            const toolCallStart = Date.now(); // GEA-06: timing

            // P19-15: Council Automation pre-execution gate
            // Estimate diff size from content length (1 line ≈ 60 chars heuristic)
            const councilContentLen = typeof (args as any).content === 'string'
              ? (args as any).content.length
              : 0;
            const councilDiffLines = Math.ceil(councilContentLen / 60);
            if (CouncilAutomation.shouldConvene(toolName, args as Record<string, any>, councilDiffLines)) {
              const proposalSummary = `Tool: ${toolName}\nFile: ${(args as any).path || (args as any).file || 'unknown'}\nEstimated size: ~${councilDiffLines} lines`;
              const contextSummary  = `Thread: ${this.context.threadId || 'unknown'} | Project: ${this.context.projectPath}`;

              try {
                const councilResult = await CouncilAutomation.convene(
                  proposalSummary,
                  contextSummary,
                  { providerId: this.context.providerId, apiKey: this.context.apiKey || undefined }
                );

                if (!councilResult.approved) {
                  const rejectionMsg = `[COUNCIL GATE] Operation blocked by council review (score: ${councilResult.score}/100). Reasoning: ${councilResult.reasoning}`;
                  this.emit('event', { type: 'tool_error', data: { toolName, error: rejectionMsg, toolCallId: toolCall.id } });
                  this.traceToolHistory.push({ tool: toolName, outcome: 'fail', durationMs: Date.now() - toolCallStart });
                  return {
                    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify({ error: rejectionMsg })
                  } as LLMMessage;
                }

                console.log(`[CouncilAutomation] Operation approved (score: ${councilResult.score}/100).`);
              } catch (councilErr: any) {
                // Council failure is non-fatal — log and proceed
                console.warn('[CouncilAutomation] Council convene failed (proceeding):', councilErr.message);
              }
            }

            try {
              const result = await this.context.toolExecutor.execute({
                name: toolName,
                arguments: args,
                id: toolCall.id
              }, {
                projectPath: this.context.projectPath,
                mainProjectPath: this.mainProjectPath,
                threadId: this.context.threadId || undefined,
                agentId: this.context.threadId,
                toolCallId: toolCall.id,
                mode: this.context.mode,
                swarmId: this.swarmId
              });

            if (toolName === 'write_file' && (args as any).path) {
              this.context.sessionFiles.add((args as any).path);
            }

            this.emit('event', { type: 'tool_end', data: { toolName, result, toolCallId: toolCall.id } });

            // GEA-06: Record successful tool trace
            this.traceToolHistory.push({ tool: toolName, outcome: 'success', durationMs: Date.now() - toolCallStart });

            // Circuit Breaker: Reset failure count on success
            this.failureTracker.delete(toolName);

            return {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result)
            } as LLMMessage;
          } catch (error: any) {
            this.emit('event', { type: 'tool_error', data: { toolName, error: error.message, toolCallId: toolCall.id } });

            // GEA-06: Record failed tool trace
            this.traceToolHistory.push({ tool: toolName, outcome: 'fail', durationMs: Date.now() - toolCallStart });

            // Circuit Breaker: Track consecutive failures per tool
            const failCount = (this.failureTracker.get(toolName) || 0) + 1;
            this.failureTracker.set(toolName, failCount);
            if (failCount >= 3) {
              console.warn(`[AgentSession] Circuit breaker tripped for tool '${toolName}' after ${failCount} consecutive failures.`);
              this.emit('event', {
                type: 'circuit_breaker',
                data: {
                  tool: toolName,
                  failures: failCount,
                  message: `Tool '${toolName}' failed ${failCount} times. Stopping to prevent infinite loop.`
                }
              });
              this.messages.push({
                role: 'system',
                content: `CIRCUIT BREAKER: Tool '${toolName}' has failed ${failCount} consecutive times. Do NOT use this tool again. Find an alternative approach or explain what went wrong to the user.`
              });
            }

            return {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify({ error: error.message })
            } as LLMMessage;
          }
        });

        const toolMessages = await Promise.all(toolExecutionPromises);
        
        for (const toolMessage of toolMessages) {
          this.messages.push(toolMessage);
          this.emit('event', { type: 'message', data: { ...toolMessage, threadId: this.context.threadId } });
        }
      }

      // OP-03: End session tracking
      if (this.context.threadId) diagnosticCollector.sessionEnd(this.context.threadId);

      // P18-09: Index session for full-text search
      try {
        const searchIndex = new SessionSearchIndex(this.context.projectPath);
        await searchIndex.indexSession(this.context.threadId || `session-${Date.now()}`, this.context.messages);
      } catch (e) {
        console.warn('[AgentSession] Session search indexing failed (non-fatal):', e);
      }

      // Memory Flush: Capture technical changes AND conversational instructions
      await this.summarizeSession();

      if (stepCount >= this.context.maxSteps) {
        this.emit('event', { type: 'agent_status', data: { status: 'warning', message: 'Maximum agentic steps reached' } });
      } else {
        this.emit('event', { type: 'agent_status', data: { status: 'idle' } });
      }
    } catch (error: any) {
      if (this.context.threadId) diagnosticCollector.sessionEnd(this.context.threadId);
      console.error('[AgentSession] Error in runLoop:', error);
      this.emit('event', { type: 'agent_status', data: { status: 'error', message: error.message } });
      
      const errorMessage: LLMMessage = {
        role: 'assistant',
        content: `Error: ${error.message}\n\nPlease check your provider configuration in Settings.`
      };
      this.messages.push(errorMessage);
      this.emit('event', { type: 'message', data: { ...errorMessage, threadId: this.context.threadId } });
      
      throw error;
    }

    return this.messages[this.messages.length - 1];
  }

  private async summarizeSession() {
    // PAI-01: DiffLearner (Learn from user corrections)
    if (this.context.sessionFiles.size > 0) {
      console.log(`[AgentSession] Checking ${this.context.sessionFiles.size} files for user corrections...`);
      for (const filePath of this.context.sessionFiles) {
        try {
          const absolutePath = path.resolve(this.context.projectPath, filePath);
          if (await fs.pathExists(absolutePath)) {
            const currentContent = await fs.readFile(absolutePath, 'utf-8');
            
            // Find what the agent LAST wrote to this file in the history
            let lastWrittenContent = '';
            for (let i = this.messages.length - 1; i >= 0; i--) {
              const m = this.messages[i];
              if (m.role === 'assistant' && m.tool_calls) {
                const writeCall = m.tool_calls.find(tc => tc.function.name === 'write_file');
                if (writeCall) {
                  const args = JSON.parse(writeCall.function.arguments);
                  if (args.path === filePath) {
                    lastWrittenContent = args.content;
                    break;
                  }
                }
              }
            }

            if (lastWrittenContent && lastWrittenContent !== currentContent) {
              const rule = await this.diffLearner.learnFromDiff(filePath, lastWrittenContent, currentContent, this.context.providerId);
              if (rule) {
                this.emit('event', { type: 'style_learned', data: { file: filePath, rule } });
              }
            }
          }
        } catch (e) {
          console.error(`[AgentSession] Failed to check for corrections in ${filePath}:`, e);
        }
      }
    }

    if (this.distillation) {
      await this.distillation.distill(this.context.providerId, this.context.messages, this.context.apiKey || undefined);
    } else {
      // Fallback to legacy behavior if MemoryStore is not available
      console.log('[AgentSession] Performing Legacy Memory Flush...');
      try {
        const summaryPrompt: LLMMessage = {
          role: 'system',
          content: `Summarize the technical changes, architectural findings, and key facts from this session for the MEMORY.md file. 
          Be extremely concise and professional. Categorize into 'knowledge' or 'architecture' where applicable.`
        };

        const history = this.messages.slice(-10); // Last 10 messages for context
        const response = await unifiedLLMService.chat(this.context.providerId, [summaryPrompt, ...history], {
          apiKey: this.context.apiKey || undefined
        });

        if (response.content) {
          await this.context.toolExecutor.execute({
            name: 'write_memory',
            arguments: {
              category: 'knowledge',
              content: response.content
            }
          }, {
            projectPath: this.context.projectPath,
            mode: this.context.mode,
            agentId: 'memory-flush'
          });
        }
      } catch (error) {
        console.error('[AgentSession] Failed to summarize session:', error);
      }
    }

    // GEA-02 + GEA-06: Score session and persist to ExperienceArchive
    await this.persistExperienceTrace().catch(err =>
      console.error('[AgentSession] GEA trace persistence failed:', err)
    );
  }

  /** GEA-06 + GEA-02: Build trace, score, and append to ExperienceArchive */
  private async persistExperienceTrace(): Promise<void> {
    if (this.traceToolHistory.length === 0) return; // nothing to record

    try {
      const archive = new ExperienceArchive(this.context.projectPath);

      // Update vocabulary with tools used this session
      const toolsUsed = [...new Set(this.traceToolHistory.map(t => t.tool))];
      const vocabulary = await archive.updateVocabulary(toolsUsed);
      const toolVector = archive.buildToolVector(toolsUsed, vocabulary);

      // Collect task outcomes from PLAN.md via simple parse
      const taskOutcomes = await this.collectTaskOutcomes();
      const successRate = taskOutcomes.length > 0
        ? taskOutcomes.filter(t => t.success).length / taskOutcomes.length
        : (this.traceToolHistory.filter(t => t.outcome === 'success').length /
           Math.max(1, this.traceToolHistory.length));

      // P17-05: Record task outcomes in MetacognitivePlanner for LP tracking
      if (taskOutcomes.length > 0) {
        try {
          const planner = new MetacognitivePlanner(this.context.projectPath);
          await planner.load();
          // Use the first user message as the task description for keyword detection
          const taskDescription = this.messages.find(m => m.role === 'user')?.content;
          const descStr = typeof taskDescription === 'string'
            ? taskDescription
            : (Array.isArray(taskDescription)
              ? taskDescription.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ')
              : '');
          for (const outcome of taskOutcomes) {
            // Combine task ID + session description for richer type detection
            planner.recordOutcome(`${outcome.taskId} ${descStr}`, outcome.success);
          }
          await planner.save();
        } catch (plannerErr) {
          console.warn('[AgentSession] MetacognitivePlanner recordOutcome failed:', plannerErr);
        }
      }

      // P18-17/20: Compute code quality delta from HealthScorer
      let codeQualityDelta = 0;
      if (this.context.sessionFiles.size > 0) {
        try {
          const healthScorer = new HealthScorer(this.context.projectPath);
          const absolutePaths = [...this.context.sessionFiles].map(f => path.resolve(this.context.projectPath, f));
          const healthSnapshot = await healthScorer.scoreFiles(absolutePaths);
          codeQualityDelta = await healthScorer.computeDeltaAndSave(healthSnapshot);
        } catch (healthErr) {
          console.warn('[AgentSession] HealthScorer failed:', healthErr);
        }
      }

      // Compute novelty vs recent population
      const recentEntries = await archive.query({ limit: 20, sortBy: 'timestamp' });
      const noveltyScore  = archive.computeNovelty(toolVector, recentEntries);
      // P18-20: lenientScore = base performance; strictScore penalises health degradation
      const lenientScore     = Math.max(0, Math.min(1, successRate));
      const healthPenalty    = codeQualityDelta < 0 ? Math.abs(codeQualityDelta) / 100 * 0.1 : 0;
      const performanceScore = Math.max(0, lenientScore - healthPenalty);
      const combinedScore    = ExperienceArchive.combinedScore(performanceScore, noveltyScore);

      const entry = await archive.append({
        agentId:          this.context.threadId || 'unknown',
        sessionId:        this.context.threadId || `session-${Date.now()}`,
        projectPath:      this.context.projectPath,
        timestamp:        this.traceSessionStart,
        toolHistory:      this.traceToolHistory,
        taskOutcomes,
        successRate,
        toolVector,
        codePatches:      [...this.context.sessionFiles],
        promptStrategies: [],
        performanceScore,
        noveltyScore,
        combinedScore,
        parentSessionId:  this.parentSessionId ?? undefined,
        cmBonus:          0,
      });

      // P17-03: CMP lineage — update parent's cmBonus with this child's score
      if (this.parentSessionId) {
        await archive.updateCMBonus(this.parentSessionId, combinedScore);
        console.log(`[GEA/CMP] Updated cmBonus for parent session ${this.parentSessionId} with child score ${combinedScore.toFixed(3)}`);
      }

      // Broadcast score to dashboard
      broadcast('EXPERIENCE_SCORED', {
        sessionId:       entry.sessionId,
        performance:     performanceScore,
        lenientScore,
        novelty:         noveltyScore,
        combined:        combinedScore,
        codeQualityDelta,
        projectPath:     this.context.projectPath,
      });

      console.log(`[GEA] Session trace archived — perf=${performanceScore.toFixed(2)} novelty=${noveltyScore.toFixed(2)} combined=${combinedScore.toFixed(3)}`);
    } catch (err) {
      console.error('[AgentSession] Failed to persist GEA trace:', err);
    }
  }

  /** Collect task outcomes from PLAN.md for this session */
  private async collectTaskOutcomes(): Promise<{ taskId: string; success: boolean }[]> {
    try {
      const planPath = path.join(this.context.projectPath, 'PLAN.md');
      if (!(await fs.pathExists(planPath))) return [];
      const content = await fs.readFile(planPath, 'utf-8');
      const done    = (content.match(/^- \[(?:x|DONE)\] `([^`]+)`/gm) || [])
        .map(l => { const m = l.match(/`([^`]+)`/); return m ? { taskId: m[1], success: true } : null; })
        .filter(Boolean) as { taskId: string; success: boolean }[];
      const inProg  = (content.match(/^- \[IN PROGRESS.*?\] `([^`]+)`/gm) || [])
        .map(l => { const m = l.match(/`([^`]+)`/); return m ? { taskId: m[1], success: false } : null; })
        .filter(Boolean) as { taskId: string; success: boolean }[];
      return [...done, ...inProg];
    } catch {
      return [];
    }
  }

  private estimateTokens(): number {
    return this.messages.reduce((sum, m) => {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return sum + Math.ceil((content?.length || 0) / 4);
    }, 0);
  }

  private extractPlan(content: string): string | null {
      const planMatch = content.match(/<plan>([\s\S]*?)<\/plan>/);
      if (planMatch) return planMatch[1].trim();
      
      const updateMatch = content.match(/<plan_update>([\s\S]*?)<\/plan_update>/);
      if (updateMatch) return updateMatch[1].trim();
      
      return null;
    }

    /**
     * Check for new roundtable messages since last check and inject them as system context.
     * This allows agents to react to user/team messages mid-execution.
     */
    private async injectNewRoundtableMessages() {
      const roundtablePath = this.mainProjectPath || this.context.projectPath;
      if (!roundtablePath) return;

      try {
        const roundtable = new Roundtable(roundtablePath);
        const recentMessages = await roundtable.getRecentMessages(20, this.swarmId);
        
        if (recentMessages.length === 0) return;

        // Filter to only messages we haven't seen yet
        const newMessages = this.lastSeenRoundtableTs
          ? recentMessages.filter(m => m.timestamp > this.lastSeenRoundtableTs)
          : []; // On first call after init, don't inject (getEnhancedContext already did)

        // Update the watermark
        this.lastSeenRoundtableTs = recentMessages[recentMessages.length - 1].timestamp;

        if (newMessages.length === 0) return;

        // Don't inject our own messages back
        const externalMessages = newMessages.filter(m => m.agentId !== this.context.threadId && m.threadId !== this.context.threadId);
        if (externalMessages.length === 0) return;

        const formatted = externalMessages
          .map(m => `[${m.agentId}] (${m.role}): ${m.content}`)
          .join('\n');

        console.log(`[AgentSession] Injecting ${externalMessages.length} new roundtable message(s) for ${this.context.threadId}`);

        this.messages.push({
          role: 'system',
          content: `[ROUNDTABLE UPDATE] New messages from your team:\n${formatted}\n\nIf someone asked you a question or gave you instructions, respond via chat_with_team. The USER has ultimate authority — follow their directives immediately.`
        });
      } catch (err: any) {
        console.error(`[AgentSession] Failed to poll roundtable:`, err.message);
      }
    }

  /**
   * Turn-based history limiting (OC-05).
   * Counts user turns from the end and keeps only the last N turns.
   * A "turn" = one user message + all assistant/tool messages until the next user message.
   */
  private pruneMessages() {
    const maxTurns = 8; // Keep last 8 user turns (configurable via policies later)
    const systemMsgs = this.messages.filter(m => m.role === 'system');
    const nonSystemMsgs = this.messages.filter(m => m.role !== 'system');

    // Count user turns from the end
    let turnCount = 0;
    let cutIndex = 0;
    for (let i = nonSystemMsgs.length - 1; i >= 0; i--) {
      if (nonSystemMsgs[i].role === 'user') {
        turnCount++;
        if (turnCount >= maxTurns) {
          cutIndex = i;
          break;
        }
      }
    }

    const keptMessages = turnCount >= maxTurns ? nonSystemMsgs.slice(cutIndex) : nonSystemMsgs;
    const prunedCount = nonSystemMsgs.length - keptMessages.length;

    if (prunedCount <= 0) return; // Nothing to prune

    const pruneNotice: LLMMessage = {
      role: 'system',
      content: `[Context pruned: ${prunedCount} older messages removed (kept last ${maxTurns} turns). Focus on the most recent context.]`
    };
    this.messages = [
      ...systemMsgs,
      pruneNotice,
      ...keptMessages
    ];
    this.emit('event', { type: 'context_pruned', data: { prunedCount, turnsKept: maxTurns, estimatedTokens: this.estimateTokens() } });
  }

  reset() {
    const systemMessage = this.messages.find(m => m.role === 'system');
    this.messages = systemMessage ? [systemMessage] : [];
    this.failureTracker.clear();
  }

  // ============================================================
  // LS-07: Checkpoint save / restore
  // ============================================================

  /**
   * Save agent checkpoint to .queenbee/checkpoints/{sessionId}-step-{n}.json
   * Call after each completed tool batch for long-horizon tasks.
   */
  async saveCheckpoint(
    taskId: string,
    stepCount: number,
    extras?: { reflectionMemory?: string[]; artifacts?: string[] }
  ): Promise<void> {
    if (!this.context.projectPath) return;
    const dir = path.join(this.context.projectPath, '.queenbee', 'checkpoints');
    await fs.ensureDir(dir);

    const completedSteps = this.messages
      .filter(m => m.role === 'tool')
      .slice(-20)
      .map((m, i) => ({
        stepId: `step-${i}`,
        action: 'tool_result',
        result: String(m.content || '').slice(0, 200),
        timestamp: new Date().toISOString(),
      }));

    const checkpoint = {
      sessionId: this.context.threadId || 'unknown',
      taskId,
      checkpointId: `${taskId}-step-${stepCount}`,
      timestamp: new Date().toISOString(),
      completedSteps,
      lastSuccessfulStep: stepCount,
      reflectionMemory: extras?.reflectionMemory || [],
      artifacts: extras?.artifacts || [],
      messageCount: this.messages.length,
    };

    const key = `${taskId}-step-${String(stepCount).padStart(4, '0')}.json`;
    await fs.writeJson(path.join(dir, key), checkpoint, { spaces: 2 });
    console.log(`[AgentSession] Checkpoint saved: ${key}`);
  }

  /**
   * Restore the most recent checkpoint for a given taskId.
   * Returns null if no checkpoint exists.
   */
  static async restoreCheckpoint(
    projectPath: string,
    taskId: string
  ): Promise<{
    checkpointId: string;
    lastSuccessfulStep: number;
    reflectionMemory: string[];
    artifacts: string[];
    messageCount: number;
  } | null> {
    const dir = path.join(projectPath, '.queenbee', 'checkpoints');
    const exists = await fs.pathExists(dir);
    if (!exists) return null;

    const files = await fs.readdir(dir);
    const taskFiles = files.filter(f => f.startsWith(taskId)).sort();
    if (!taskFiles.length) return null;

    const latest = taskFiles.at(-1)!;
    try {
      const data = await fs.readJson(path.join(dir, latest));
      console.log(`[AgentSession] Checkpoint found: ${latest} (step ${data.lastSuccessfulStep})`);
      return data;
    } catch {
      return null;
    }
  }
}