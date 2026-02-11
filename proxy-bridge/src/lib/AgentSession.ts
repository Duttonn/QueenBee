import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { ToolExecutor } from './ToolExecutor';
import { AGENT_TOOLS } from './ToolDefinitions';
import { sanitizeToolsForProvider } from './ToolSchemaBridge';
import { EventEmitter } from 'events';
import { sessionManager } from './SessionManager';
import { HeartbeatService } from './HeartbeatService';
import { EventLog } from './EventLog';
import { MemoryStore } from './MemoryStore';
import { MemoryDistillation } from './MemoryDistillation';
import { PolicyStore } from './PolicyStore';
import { CostTracker } from './CostTracker';
import { DiffLearner } from './learning/DiffLearner';
import { diagnosticCollector } from './DiagnosticCollector';
import fs from 'fs-extra';
import path from 'path';

/**
 * AgentSession encapsulates the agentic loop (Think -> Act -> Observe).
 * It now emits events to allow for streaming of its internal state.
 */
export class AgentSession extends EventEmitter {
  public messages: LLMMessage[] = [];
  private executor: ToolExecutor;
  private projectPath: string;
  private maxSteps: number;
  private providerId: string;
  private threadId: string | null;
  private apiKey: string | null;
  private mode: string;
  private eventLog?: EventLog;
  private memoryStore?: MemoryStore;
  private policyStore?: PolicyStore;
  private costTracker: CostTracker;
  private distillation: MemoryDistillation | null = null;
  private diffLearner: DiffLearner;
  private failureTracker = new Map<string, number>();
  private sessionFiles: Set<string> = new Set(); // Track files touched in this session
    public blockedTools: Set<string> = new Set(); // Tools that should be blocked and returned as errors
    public swarmId: string | undefined;
    public mainProjectPath: string | undefined; // Main project root for roundtable (not worktree)

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
      mainProjectPath?: string
    } = {}) {
    super();
    this.eventLog = options.eventLog;
    this.memoryStore = options.memoryStore;
    this.policyStore = options.policyStore;
    this.costTracker = new CostTracker(projectPath);
    this.executor = new ToolExecutor(this.eventLog, this.policyStore);
    this.diffLearner = new DiffLearner(projectPath);

    if (this.memoryStore) {
      this.distillation = new MemoryDistillation(this.memoryStore);
    }

    this.projectPath = projectPath;
    this.maxSteps = options.maxSteps || 10;
    this.providerId = options.providerId || 'auto';
    this.threadId = options.threadId || null;
    this.apiKey = options.apiKey || null;
    this.mode = options.mode || 'local';
    this.swarmId = options.swarmId;
    this.mainProjectPath = options.mainProjectPath;
    if (options.blockedTools) {
      this.blockedTools = new Set(options.blockedTools);
    }

    if (options.systemPrompt) {
      this.messages.push({ role: 'system', content: options.systemPrompt });
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
        if (this.threadId) diagnosticCollector.sessionStart(this.threadId);

        try {
          while (stepCount < this.maxSteps) {
            if (this.threadId && sessionManager.isAborted(this.threadId)) {
              throw new Error("Execution aborted by user (thread deleted)");
            }

            // Record heartbeat pulse
            if (this.threadId) {
              HeartbeatService.ping(this.threadId).catch(err => console.error('[AgentSession] Heartbeat failed:', err));
              diagnosticCollector.sessionStep(this.threadId);
            }

            stepCount++;

            // Context Pressure Check
            const estimatedTokens = this.estimateTokens();
            if (estimatedTokens > 80000) {
              console.log(`[AgentSession] Context pressure: ~${estimatedTokens} tokens. Pruning old messages.`);
              this.pruneMessages();
            }

        this.emit('event', { type: 'step_start', data: { step: stepCount, status: 'thinking' } });

        if (this.eventLog) {
          await this.eventLog.emit('step_start', this.threadId || 'unknown', { step: stepCount });
        }

        const sanitizedTools = sanitizeToolsForProvider(AGENT_TOOLS as any, this.providerId);
        const llmStartTime = Date.now();
        const response: LLMResponse = await unifiedLLMService.chat(this.providerId, this.messages, {
          ...options,
          apiKey: this.apiKey || undefined,
          tools: sanitizedTools as any
        });
        
        console.log(`[AgentSession] LLM Response: content length=${response.content?.length || 0}, tool_calls=${response.tool_calls?.length || 0}`);

        if (response.usage) {
          const cost = CostTracker.calculateCost(response.model || 'unknown', response.usage.prompt_tokens, response.usage.completion_tokens);
          this.costTracker.log({
            agentId: this.threadId || 'unknown',
            threadId: this.threadId || 'unknown',
            model: response.model || 'unknown',
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            cost,
            latencyMs: Date.now() - llmStartTime,
          }).catch(err => console.error('[AgentSession] Failed to log cost:', err));
        }

        if (this.eventLog) {
          await this.eventLog.emit('step_end', this.threadId || 'unknown', { 
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
            this.emit('event', { type: 'plan_update', data: { plan, threadId: this.threadId } });
          }
        }

        this.messages.push(assistantMessage);
        this.emit('event', { type: 'message', data: { ...assistantMessage, threadId: this.threadId } });

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
          
            try {
              const result = await this.executor.execute({
                name: toolName,
                arguments: args,
                id: toolCall.id
              }, {
                projectPath: this.projectPath,
                mainProjectPath: this.mainProjectPath,
                threadId: this.threadId || undefined,
                agentId: this.threadId,
                toolCallId: toolCall.id,
                mode: this.mode,
                swarmId: this.swarmId
              });

            if (toolName === 'write_file' && (args as any).path) {
              this.sessionFiles.add((args as any).path);
            }

            this.emit('event', { type: 'tool_end', data: { toolName, result, toolCallId: toolCall.id } });

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
          this.emit('event', { type: 'message', data: { ...toolMessage, threadId: this.threadId } });
        }
      }

      // OP-03: End session tracking
      if (this.threadId) diagnosticCollector.sessionEnd(this.threadId);

      // Memory Flush: Capture technical changes AND conversational instructions
      await this.summarizeSession();

      if (stepCount >= this.maxSteps) {
        this.emit('event', { type: 'agent_status', data: { status: 'warning', message: 'Maximum agentic steps reached' } });
      } else {
        this.emit('event', { type: 'agent_status', data: { status: 'idle' } });
      }
    } catch (error: any) {
      if (this.threadId) diagnosticCollector.sessionEnd(this.threadId);
      console.error('[AgentSession] Error in runLoop:', error);
      this.emit('event', { type: 'agent_status', data: { status: 'error', message: error.message } });
      
      const errorMessage: LLMMessage = {
        role: 'assistant',
        content: `Error: ${error.message}\n\nPlease check your provider configuration in Settings.`
      };
      this.messages.push(errorMessage);
      this.emit('event', { type: 'message', data: { ...errorMessage, threadId: this.threadId } });
      
      throw error;
    }

    return this.messages[this.messages.length - 1];
  }

  private async summarizeSession() {
    // PAI-01: DiffLearner (Learn from user corrections)
    if (this.sessionFiles.size > 0) {
      console.log(`[AgentSession] Checking ${this.sessionFiles.size} files for user corrections...`);
      for (const filePath of this.sessionFiles) {
        try {
          const absolutePath = path.resolve(this.projectPath, filePath);
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
              const rule = await this.diffLearner.learnFromDiff(filePath, lastWrittenContent, currentContent, this.providerId);
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
      await this.distillation.distill(this.providerId, this.messages, this.apiKey || undefined);
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
        const response = await unifiedLLMService.chat(this.providerId, [summaryPrompt, ...history], {
          apiKey: this.apiKey || undefined
        });

        if (response.content) {
          await this.executor.execute({
            name: 'write_memory',
            arguments: {
              category: 'knowledge',
              content: response.content
            }
          }, {
            projectPath: this.projectPath,
            mode: this.mode,
            agentId: 'memory-flush'
          });
        }
      } catch (error) {
        console.error('[AgentSession] Failed to summarize session:', error);
      }
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
}