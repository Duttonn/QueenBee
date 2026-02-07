import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { ToolExecutor } from './ToolExecutor';
import { AGENT_TOOLS } from './ToolDefinitions';
import { EventEmitter } from 'events';

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

  constructor(projectPath: string, options: { 
    systemPrompt?: string, 
    maxSteps?: number,
    providerId?: string,
    threadId?: string,
    apiKey?: string,
    mode?: string
  } = {}) {
    super();
    this.executor = new ToolExecutor();
    this.projectPath = projectPath;
    this.maxSteps = options.maxSteps || 10;
    this.providerId = options.providerId || 'auto';
    this.threadId = options.threadId || null;
    this.apiKey = options.apiKey || null;
    this.mode = options.mode || 'local';

    if (options.systemPrompt) {
      this.messages.push({ role: 'system', content: options.systemPrompt });
    }
  }

  /**
   * Submit a new user prompt and run the loop until completion or max steps.
   */
  async prompt(text: string, options?: LLMProviderOptions): Promise<LLMMessage> {
    const lastMsg = this.messages[this.messages.length - 1];
    if (!lastMsg || lastMsg.content !== text || lastMsg.role !== 'user') {
      const userMessage: LLMMessage = { role: 'user', content: text };
      this.messages.push(userMessage);
      this.emit('event', { type: 'message', data: { ...userMessage, threadId: this.threadId } });
    }
    return this.runLoop(options);
  }

  /**
   * Core Agentic Loop
   */
  private async runLoop(options?: LLMProviderOptions): Promise<LLMMessage> {
    let stepCount = 0;

    try {
      while (stepCount < this.maxSteps) {
        stepCount++;
        
        this.emit('event', { type: 'step_start', data: { step: stepCount, status: 'thinking' } });

        const response: LLMResponse = await unifiedLLMService.chat(this.providerId, this.messages, {
          ...options,
          apiKey: this.apiKey || undefined,
          tools: AGENT_TOOLS
        });
        
        const assistantMessage: LLMMessage = { 
          role: 'assistant', 
          content: response.content, 
          tool_calls: response.tool_calls 
        };
        
        this.messages.push(assistantMessage);
        this.emit('event', { type: 'message', data: { ...assistantMessage, threadId: this.threadId } });

        if (!response.tool_calls || response.tool_calls.length === 0) {
          break; // End of loop
        }

        for (const toolCall of response.tool_calls) {
          const toolName = toolCall.function.name;
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error(`Failed to parse arguments for tool ${toolName}`, toolCall.function.arguments);
          }

          this.emit('event', { type: 'tool_start', data: { toolName, args, toolCallId: toolCall.id } });
          
          try {
            const result = await this.executor.execute({
              name: toolName,
              arguments: args,
              id: toolCall.id
            }, {
              projectPath: this.projectPath,
              threadId: this.threadId || undefined,
              agentId: this.threadId,
              toolCallId: toolCall.id,
              mode: this.mode
            });

            this.emit('event', { type: 'tool_end', data: { toolName, result, toolCallId: toolCall.id } });

            const toolMessage: LLMMessage = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result)
            };
            
            this.messages.push(toolMessage);
            this.emit('event', { type: 'message', data: { ...toolMessage, threadId: this.threadId } });
          } catch (error: any) {
            this.emit('event', { type: 'tool_error', data: { toolName, error: error.message, toolCallId: toolCall.id } });
            
            const toolErrorMessage: LLMMessage = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify({ error: error.message })
            };
            this.messages.push(toolErrorMessage);
            this.emit('event', { type: 'message', data: { ...toolErrorMessage, threadId: this.threadId } });
          }
        }
      }

      // Memory Flush (P1-02)
      await this.summarizeSession();

      if (stepCount >= this.maxSteps) {
        this.emit('event', { type: 'agent_status', data: { status: 'warning', message: 'Maximum agentic steps reached' } });
      } else {
        this.emit('event', { type: 'agent_status', data: { status: 'idle' } });
      }
    } catch (error: any) {
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
    console.log('[AgentSession] Performing Memory Flush...');
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

  reset() {
    const systemMessage = this.messages.find(m => m.role === 'system');
    this.messages = systemMessage ? [systemMessage] : [];
  }
}