import type { NextApiRequest, NextApiResponse } from 'next';
import { AutonomousRunner } from '../../lib/AutonomousRunner';
import { logger } from '../../lib/logger';
import { unifiedLLMService } from '../../lib/UnifiedLLMService';
import { LLMMessage } from '../../lib/types/llm';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream, projectPath: rawPath, threadId, mode, agentId } = req.body;
  const providerId = (req.headers['x-codex-provider'] as string) || 'auto';
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || null;
  
  logger.info(`[Chat] Request received. Provider: ${providerId}, Model: ${model}, Stream: ${stream}, Path: ${rawPath}, Thread: ${threadId}, Mode: ${mode}, Agent: ${agentId}`);

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const streamGenerator = unifiedLLMService.chatStream(providerId, messages, { model, apiKey });
      let chunkCounter = 0;
      for await (const chunk of streamGenerator) {
        chunkCounter++;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      logger.info(`[Chat] Stream ended after ${chunkCounter} chunks.`);
      res.end();
    } catch (error: any) {
      logger.error(`[Chat] Streaming Error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ error: { message: error.message, type: 'STREAM_ERROR' } })}\n\n`);
      res.end();
    }
    return;
  }

  // Fallback to non-streaming for agentic loops or specific requests
  try {
    const projectPath = rawPath 
      ? (path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath))
      : process.cwd();
    
    // The AutonomousRunner is not designed for streaming back to the client in this way yet.
    // It uses its own socket events.
    if (mode === 'autonomous' || mode === 'local') {
        const runner = new AutonomousRunner((res as any).socket, projectPath, providerId, threadId, apiKey, mode, agentId);
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage.role === 'user') {
          const history = messages.slice(0, -1);
          // Run in background, don't await
          runner.executeLoop(lastMessage.content, history, { model, stream }).catch(e => logger.error(`[Chat] Autonomous Runner failed: ${e.message}`));
          
          return res.status(202).json({
            status: 'processing',
            message: 'Autonomous agent started. Monitor socket events for updates.',
            threadId: threadId,
          });
        }
    }

    // Standard non-streaming call
    const response = await unifiedLLMService.chat(providerId, messages, { model, apiKey });
    return res.status(200).json({
        choices: [{
            message: {
                role: 'assistant',
                content: response.content,
                tool_calls: response.tool_calls
            }
        }]
    });

  } catch (error: any) {
    logger.error(`[Chat] Non-Streaming Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}