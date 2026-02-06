import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { ToolExecutor } from './ToolExecutor';
import { broadcast } from './socket-instance';

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

  constructor(projectPath: string, options: { 
    systemPrompt?: string, 
    maxSteps?: number,
    events?: AgentSessionEvents
  } = {}) {
    this.executor = new ToolExecutor();
    this.projectPath = projectPath;
    this.maxSteps = options.maxSteps || 10;
    this.events = options.events || {};

    if (options.systemPrompt) {
      this.messages.push({ role: 'system', content: options.systemPrompt });
    }
  }

  /**
   * Submit a new user prompt and run the loop until completion or max steps.
   */
  async prompt(text: string, options?: LLMProviderOptions): Promise<LLMMessage> {
    this.messages.push({ role: 'user', content: text });
    return this.runLoop(options);
  }

  /**
   * Core Agentic Loop
   */
  private async runLoop(options?: LLMProviderOptions): Promise<LLMMessage> {
    let stepCount = 0;

    while (stepCount < this.maxSteps) {
      stepCount++;
      
      // 1. THINK Phase
      this.events.onStepStart?.(stepCount);
      broadcast('QUEEN_STATUS', { status: 'thinking', step: stepCount });

      const response: LLMResponse = await unifiedLLMService.chat('auto', this.messages, options);
      
      this.events.onStepEnd?.(stepCount, response);

      const assistantMessage: LLMMessage = { 
        role: 'assistant', 
        content: response.content, 
        tool_calls: response.tool_calls 
      };
      
      this.messages.push(assistantMessage);

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
            arguments: args
          }, this.projectPath);

          this.events.onToolEnd?.(toolName, result);

          // 3. OBSERVE Phase: Push result back
          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify(result)
          });
        } catch (error: any) {
          this.events.onToolError?.(toolName, error);
          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify({ error: error.message })
          });
        }
      }
    }

    if (stepCount >= this.maxSteps) {
      broadcast('QUEEN_STATUS', { status: 'warning', message: 'Maximum agentic steps reached' });
    } else {
      broadcast('QUEEN_STATUS', { status: 'idle' });
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
