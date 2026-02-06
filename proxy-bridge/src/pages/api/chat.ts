import type { NextApiRequest, NextApiResponse } from 'next';
import { AutonomousRunner } from '../../lib/AutonomousRunner';
import { logger } from '../../lib/logger';
import { unifiedLLMService } from '../../lib/UnifiedLLMService';
import { LLMMessage } from '../../lib/types/llm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream, projectPath: rawPath } = req.body;
  const providerId = (req.headers['x-codex-provider'] as string) || 'auto';
  
  logger.info(`[Chat] Request received. Provider: ${providerId}, Model: ${model}, Stream: ${stream}, Path: ${rawPath}`);

  // Resolve Project Context
  const projectPath = rawPath || process.cwd();
  
  try {
    const runner = new AutonomousRunner((res as any).socket, projectPath);
    
    // If it's a simple chat (not an agentic loop start), we could just call unifiedLLMService.chat
    // But since Queen Bee is agentic by design, we use the executeLoop for user messages.
    
    // For now, let's check if the user wants an agentic run or just a response.
    // Usually, the 'AutonomousRunner' is triggered when the user wants an action.
    
    // If we want to maintain the same API behavior:
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role === 'user') {
      const finalAssistantMessage = await runner.executeLoop(lastMessage.content, { model, stream });
      
      // Map back to OpenAI-like response for frontend compatibility
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
        // Fallback for non-user messages if any
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
    return res.status(500).json({ error: error.message });
  }
}