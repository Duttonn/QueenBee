import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { ToolExecutor } from './ToolExecutor';
import { broadcast } from './socket-instance';
import { AGENT_TOOLS } from './ToolDefinitions';

export interface AgentSessionEvents {
  onStepStart?: (step: number) => void;
  onStepEnd?: (step: number, response: LLMResponse) => void;
  onToolStart?: (toolName: string, args: any) => void;
  onToolEnd?: (toolName: string, result: any) => void;
  onToolError?: (toolName: string, error: any) => void;
}

/**
 * AgentSession encapsulates the agentic loop (Think -> Act -> Observe).
 * Inspired by OpenClaw's AgentSession.
 */
export class AgentSession {
  public messages: LLMMessage[] = [];
  private executor: ToolExecutor;
  private projectPath: string;
  private maxSteps: number;
  private events: AgentSessionEvents;
  private providerId: string;
  private threadId: string | null;
  private apiKey: string | null;

  constructor(projectPath: string, options: { 
    systemPrompt?: string, 
    maxSteps?: number,
    events?: AgentSessionEvents,
    providerId?: string,
    threadId?: string,
    apiKey?: string
  } = {}) {
    this.executor = new ToolExecutor();
    this.projectPath = projectPath;
    this.maxSteps = options.maxSteps || 10;
    this.events = options.events || {};
    this.providerId = options.providerId || 'auto';
    this.threadId = options.threadId || null;
    this.apiKey = options.apiKey || null;

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
      // Broadcast user message to ensure UI is in sync if it wasn't already
      broadcast('UI_UPDATE', { 
        action: 'ADD_MESSAGE', 
        payload: { ...userMessage, threadId: this.threadId } 
      });
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
        
        // 1. THINK Phase
        this.events.onStepStart?.(stepCount);
        broadcast('QUEEN_STATUS', { status: 'thinking', step: stepCount });

        const response: LLMResponse = await unifiedLLMService.chat(this.providerId, this.messages, {
          ...options,
          apiKey: this.apiKey || undefined,
          tools: AGENT_TOOLS
        });
        
        this.events.onStepEnd?.(stepCount, response);

        const assistantMessage: LLMMessage = { 
          role: 'assistant', 
          content: response.content, 
          tool_calls: response.tool_calls 
        };
        
        this.messages.push(assistantMessage);
        
        // Broadcast assistant response immediately
        broadcast('UI_UPDATE', { 
          action: 'ADD_MESSAGE', 
          payload: { ...assistantMessage, threadId: this.threadId } 
        });

        // If no tool calls, we are done
        if (!response.tool_calls || response.tool_calls.length === 0) {
          break;
        }

        // 2. ACT Phase: Execute tools
        for (const toolCall of response.tool_calls) {
          const toolName = toolCall.function.name;
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error(`Failed to parse arguments for tool ${toolName}`, toolCall.function.arguments);
          }

          this.events.onToolStart?.(toolName, args);
          
          try {
            const result = await this.executor.execute({
              name: toolName,
              arguments: args,
              id: toolCall.id
            }, {
              projectPath: this.projectPath,
              threadId: this.threadId || undefined,
              agentId: this.threadId, // Using threadId as a proxy for agentId
              toolCallId: toolCall.id
            });

            this.events.onToolEnd?.(toolName, result);

            // 3. OBSERVE Phase: Push result back
            const toolMessage: LLMMessage = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result)
            };
            
            this.messages.push(toolMessage);
            
            // Broadcast tool result
            broadcast('UI_UPDATE', { 
              action: 'ADD_MESSAGE', 
              payload: { ...toolMessage, threadId: this.threadId } 
            });
          } catch (error: any) {
            this.events.onToolError?.(toolName, error);
            const toolErrorMessage: LLMMessage = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify({ error: error.message })
            };
            this.messages.push(toolErrorMessage);
            
            broadcast('UI_UPDATE', { 
              action: 'ADD_MESSAGE', 
              payload: { ...toolErrorMessage, threadId: this.threadId } 
            });
          }
        }
      }

      if (stepCount >= this.maxSteps) {
        broadcast('QUEEN_STATUS', { status: 'warning', message: 'Maximum agentic steps reached' });
      } else {
        broadcast('QUEEN_STATUS', { status: 'idle' });
      }
    } catch (error: any) {
      console.error('[AgentSession] Error in runLoop:', error);
      broadcast('QUEEN_STATUS', { status: 'error', message: error.message });
      
      // Also add the error to the chat so the user sees it
      const errorMessage: LLMMessage = {
        role: 'assistant',
        content: `Error: ${error.message}\n\nPlease check your provider configuration in Settings.`
      };
      this.messages.push(errorMessage);
      broadcast('UI_UPDATE', { 
        action: 'ADD_MESSAGE', 
        payload: { ...errorMessage, threadId: this.threadId } 
      });
      
      throw error;
    }

    return this.messages[this.messages.length - 1];
  }

  /**
   * Reset the session messages (keeping system prompt if present)
   */
  reset() {
    const systemMessage = this.messages.find(m => m.role === 'system');
    this.messages = systemMessage ? [systemMessage] : [];
  }
}
