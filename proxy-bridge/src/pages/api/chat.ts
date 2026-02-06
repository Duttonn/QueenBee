import type { NextApiRequest, NextApiResponse } from 'next';
import { ToolExecutor } from '../../lib/ToolExecutor';
import { AutonomousRunner } from '../../lib/AutonomousRunner';
import { ProjectTaskManager } from '../../lib/ProjectTaskManager';
import { logger } from '../../lib/logger';
import { unifiedLLMService } from '../../lib/UnifiedLLMService';
import path from 'path';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string | null;
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    }
  }[];
};

// Mock responses for testing without a real LLM
function getMockResponse(messages: Message[], prevError?: string): any {
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage?.content || '';

  const fallbackNote = prevError ? `\n\n*(Fallback active due to error: ${prevError})*` : '';

  return {
    id: `mock-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'mock-model',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: `I received your message: "${userContent.slice(0, 50)}..."\n\n**Mock Response**: The Queen Bee assistant is connected.${fallbackNote}`
      },
      finish_reason: 'stop'
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}

async function executeAndRespond(req: NextApiRequest, res: NextApiResponse, messages: Message[], llmResponse: any) {
    const responseMessage = llmResponse.content ? { role: 'assistant', content: llmResponse.content, tool_calls: llmResponse.tool_calls } : { role: 'assistant', content: null, tool_calls: llmResponse.tool_calls };

    if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
        console.log('[ToolCall] Detected:', llmResponse.tool_calls);
        const executor = new ToolExecutor();
        const rawPath = req.body.projectPath || process.cwd(); 
        const projectPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath);

        const toolResults = [];
        for (const toolCall of llmResponse.tool_calls) {
            try {
                const functionArgs = typeof toolCall.function.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
                const result = await executor.execute({
                    name: toolCall.function.name,
                    arguments: functionArgs
                }, projectPath);
                
                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: toolCall.function.name,
                    content: JSON.stringify(result)
                });
            } catch (error: any) {
                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: toolCall.function.name,
                    content: JSON.stringify({ error: error.message })
                });
            }
        }

        // Add the original assistant message and the tool results to the conversation
        const newMessages = [...messages, responseMessage, ...toolResults];
        
        // RECURSION: In a real scenario, we would call the LLM again here.
        // For now, return the tool execution status to the UI.
        return res.status(200).json({ 
          message: 'Tool call executed',
          tool_calls: llmResponse.tool_calls,
          tool_results: toolResults,
          next_messages: newMessages
        });
    } else {
        // No tool calls, just return the content
        return res.status(200).json({
            choices: [{
                message: responseMessage
            }]
        });
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream, projectPath: rawPath } = req.body;
  const headerProvider = req.headers['x-codex-provider'] as string || 'auto';
  
  logger.info(`[Chat] Request received. Provider: ${headerProvider}, Model: ${model}, Path: ${rawPath}`);

  // 1. Resolve Project Context
  const projectPath = rawPath 
    ? (path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath))
    : process.cwd();

  // 2. Inject Context (TASK-27)
  let enhancedMessages = [...messages];
  try {
    const runner = new AutonomousRunner((res as any).socket, projectPath);
    const context = await runner.getEnhancedContext();
    enhancedMessages.unshift({ role: 'system', content: context });
  } catch (e) {
    console.warn('[Chat] Context injection failed', e);
  }

  try {
    const response = await unifiedLLMService.chat(headerProvider, enhancedMessages, {
        model,
        stream
    });

    return executeAndRespond(req, res, enhancedMessages, response);

  } catch (error: any) {
    logger.error(`[Chat] Service failed: ${error.message}`);
    return res.status(200).json(getMockResponse(messages, error.message));
  }
}
