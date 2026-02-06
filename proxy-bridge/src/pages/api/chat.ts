import type { NextApiRequest, NextApiResponse } from 'next';
import { AutonomousRunner } from '../../lib/AutonomousRunner';
import { logger } from '../../lib/logger';
import { unifiedLLMService } from '../../lib/UnifiedLLMService';
import { LLMMessage } from '../../lib/types/llm';
import path from 'path';

// Mock responses for testing without a real LLM
function getMockResponse(messages: any[], prevError?: string): any {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream, projectPath: rawPath, threadId } = req.body;
  const providerId = (req.headers['x-codex-provider'] as string) || 'auto';
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || null;
  
  logger.info(`[Chat] Request received. Provider: ${providerId}, Model: ${model}, Stream: ${stream}, Path: ${rawPath}, Thread: ${threadId}`);

  // Resolve Project Context
  const projectPath = rawPath 
    ? (path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath))
    : process.cwd();
  
  try {
    const runner = new AutonomousRunner((res as any).socket, projectPath, providerId, threadId, apiKey);
    const lastMessage = messages[messages.length - 1];

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      // SSE Stream Loop
      // Note: S-03 will integrate AutonomousRunner for agentic streaming
      const streamGenerator = unifiedLLMService.chatStream(providerId, messages, { model, apiKey });
      for await (const chunk of streamGenerator) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    if (lastMessage.role === 'user') {
      // Use the new agentic loop (Non-streaming)
      const finalAssistantMessage = await runner.executeLoop(lastMessage.content, { model, stream });
      
      return res.status(200).json({
        id: `queen-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model || 'queen-bee-agent',
        choices: [{
          index: 0,
          message: finalAssistantMessage,
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      });
    } else {
        // Fallback for non-user messages
        const response = await unifiedLLMService.chat(providerId, messages, { model, stream });
        return res.status(200).json({
            choices: [{
                message: {
                    role: 'assistant',
                    content: response.content,
                    tool_calls: response.tool_calls
                }
            }]
        });
    }

  } catch (error: any) {
    logger.error(`[Chat] Error: ${error.message}`);
    
    if (stream && res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
      return;
    }

    // If it's a critical failure, we return the mock response to keep the UI from crashing
    return res.status(200).json(getMockResponse(messages, error.message));
  }
}