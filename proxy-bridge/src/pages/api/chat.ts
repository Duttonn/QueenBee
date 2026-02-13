import type { NextApiRequest, NextApiResponse } from 'next';
import { AutonomousRunner } from '../../lib/AutonomousRunner';
import { logger } from '../../lib/logger';
import { unifiedLLMService } from '../../lib/UnifiedLLMService';
import { withLogging } from '../../lib/api-utils';
import { enqueueForSession } from '../../lib/CommandQueue';
import path from 'path';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream, projectPath: rawPath, threadId, mode, agentId, composerMode } = req.body;
  const providerId = (req.headers['x-codex-provider'] as string) || 'auto';
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || null;
  const sessionId = req.headers['x-session-id'] as string | undefined;
  
  logger.info(`[Chat] Request received. Provider: ${providerId}, Model: ${model}, Stream: ${stream}, Path: ${rawPath}, Thread: ${threadId}, Mode: ${mode}, Agent: ${agentId}, Composer: ${composerMode}`);

  const projectPath = rawPath 
    ? (path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath))
    : process.cwd();

  // Handle agentic streaming
  if (stream && mode !== 'raw') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 15000);

    const streamTimeout = setTimeout(() => {
      clearInterval(heartbeat);
      res.write(`data: ${JSON.stringify({ error: { message: 'Stream timeout after 5 minutes', type: 'STREAM_TIMEOUT' } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }, 300000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(streamTimeout);
      // TODO: abort LLM call if possible
    });

    try {
      const sessionLaneId = threadId || `anon-${Date.now()}`;
      await enqueueForSession(sessionLaneId, async () => {
        const runner = new AutonomousRunner(
          (res as any).socket, // still needed for some fallback logic
          projectPath,
          providerId,
          threadId,
          apiKey,
          mode,
          agentId,
          composerMode
        );
        runner.setWritable(res); // Pass the response stream to the runner

        const lastMessage = messages[messages.length - 1];
        const history = messages.slice(0, -1);

        await runner.streamIntermediateSteps(lastMessage.content, history, { model, apiKey });
      }, { warnAfterMs: 5000 });

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      logger.error(`[Chat] Agent Streaming Error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ error: { message: error.message, type: 'AGENT_STREAM_ERROR' } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } finally {
      clearInterval(heartbeat);
      clearTimeout(streamTimeout);
    }
    return;
  }

  // Handle standard LLM streaming
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 15000);

    const streamTimeout = setTimeout(() => {
      clearInterval(heartbeat);
      res.write(`data: ${JSON.stringify({ error: { message: 'Stream timeout after 5 minutes', type: 'STREAM_TIMEOUT' } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }, 300000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(streamTimeout);
      // TODO: abort LLM call if possible
    });

    try {
        const streamGenerator = unifiedLLMService.chatStream(providerId, messages, { model, apiKey, sessionId });
      for await (const chunk of streamGenerator) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      logger.error(`[Chat] LLM Streaming Error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ error: { message: error.message, type: 'LLM_STREAM_ERROR' } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } finally {
      clearInterval(heartbeat);
      clearTimeout(streamTimeout);
    }
    return;
  }

  // Fallback to standard non-streaming call
  try {
      const response = await unifiedLLMService.chat(providerId, messages, { model, apiKey, sessionId });
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

export default withLogging(handler);