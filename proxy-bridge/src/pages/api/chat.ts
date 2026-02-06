import type { NextApiRequest, NextApiResponse } from 'next';
import { AutonomousRunner } from '../../lib/AutonomousRunner';
import { logger } from '../../lib/logger';
import { unifiedLLMService } from '../../lib/UnifiedLLMService';
import path from 'path';
import { Paths } from '../../lib/Paths';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream, projectPath: rawPath, threadId, mode, agentId } = req.body;
  const providerId = (req.headers['x-codex-provider'] as string) || 'auto';
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || null;
  
  logger.info(`[Chat] Request received. Provider: ${providerId}, Model: ${model}, Stream: ${stream}, Path: ${rawPath}, Thread: ${threadId}, Mode: ${mode}, Agent: ${agentId}`);

  const projectPath = rawPath 
    ? (path.isAbsolute(rawPath) ? rawPath : path.resolve(Paths.getWorkspaceRoot(), rawPath))
    : Paths.getProxyBridgeRoot();

  // Handle agentic streaming
  if (stream && (mode === 'autonomous' || mode === 'local' || mode === 'solo' || mode === 'worktree' || mode === 'cloud')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const runner = new AutonomousRunner(
        (res as any).socket,
        projectPath,
        providerId,
        threadId,
        apiKey,
        mode,
        agentId
      );
      runner.setWritable(res);
      
      const lastMessage = messages[messages.length - 1];
      const history = messages.slice(0, -1);

      await runner.streamIntermediateSteps(lastMessage.content, history, { model, apiKey });
      
      res.end();
    } catch (error: any) {
      logger.error(`[Chat] Agent Streaming Error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ error: { message: error.message, type: 'AGENT_STREAM_ERROR' } })}\n\n`);
      res.end();
    }
    return;
  }

  // Handle standard LLM streaming
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const streamGenerator = unifiedLLMService.chatStream(providerId, messages, { model, apiKey });
      for await (const chunk of streamGenerator) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.end();
    } catch (error: any) {
      logger.error(`[Chat] LLM Streaming Error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ error: { message: error.message, type: 'LLM_STREAM_ERROR' } })}\n\n`);
      res.end();
    }
    return;
  }

  // Fallback to standard non-streaming call
  try {
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
