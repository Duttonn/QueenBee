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

  const { model, messages, stream, projectPath: rawPath, threadId, mode } = req.body;
  const providerId = (req.headers['x-codex-provider'] as string) || 'auto';
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || null;
  
  logger.info(`[Chat] Request received. Provider: ${providerId}, Model: ${model}, Stream: ${stream}, Path: ${rawPath}, Thread: ${threadId}, Mode: ${mode}`);

  // Resolve Project Context
  const projectPath = rawPath 
    ? (path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath))
    : process.cwd();
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role === 'user' && mode === 'agent') {
      const runner = new AutonomousRunner((res as any).socket, projectPath, providerId, threadId, apiKey);
      const streamGenerator = runner.executeLoopStream(lastMessage.content, { model, stream: true });
      
      for await (const chunk of streamGenerator) {
        sendEvent({
          id: chunk.id,
          object: 'chat.completion.chunk',
          choices: [{
            index: 0,
            delta: { 
              content: chunk.content,
              tool_calls: chunk.tool_calls 
            },
            finish_reason: chunk.finish_reason
          }],
          usage: chunk.usage
        });
      }
      res.end();
    } else {
        // Direct streaming from LLM
        const streamGenerator = unifiedLLMService.chatStream(providerId, messages, { 
          model, 
          stream: true, 
          apiKey: apiKey || undefined 
        });
        
        for await (const chunk of streamGenerator) {
          sendEvent({
            id: chunk.id,
            object: 'chat.completion.chunk',
            choices: [{
              index: 0,
              delta: { 
                content: chunk.content,
                tool_calls: chunk.tool_calls 
              },
              finish_reason: chunk.finish_reason
            }],
            usage: chunk.usage
          });
        }
        res.end();
    }

  } catch (error: any) {
    logger.error(`[Chat] Error: ${error.message}`);
    sendEvent({
      error: error.message,
      choices: [{
        delta: { content: `Error: ${error.message}` },
        finish_reason: 'error'
      }]
    });
    res.end();
  }
}