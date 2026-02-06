import type { NextApiRequest, NextApiResponse } from 'next';
import { ToolExecutor } from '../../lib/ToolExecutor';
import { AutonomousRunner } from '../../lib/AutonomousRunner';
import { ProjectTaskManager } from '../../lib/ProjectTaskManager';
import { logger } from '../../lib/logger';
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
    const responseMessage = llmResponse.choices[0].message;

    if (responseMessage.tool_calls) {
        console.log('[ToolCall] Detected:', responseMessage.tool_calls);
        const executor = new ToolExecutor();
        const rawPath = req.body.projectPath || process.cwd(); 
        const projectPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath);

        const toolResults = [];
        for (const toolCall of responseMessage.tool_calls) {
            try {
                const functionArgs = JSON.parse(toolCall.function.arguments);
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
        
        // Send the new conversation back to the LLM
        req.body.messages = newMessages; // Mutate req for the next loop
        // This is a simplified example. In a real scenario, you'd call the handler again.
        // For this task, we will just return the tool call results for simplicity.
        // A more robust implementation would recursively call the main handler.
        return res.status(200).json({ 
          message: 'Tool call executed, resend with updated messages',
          tool_calls: responseMessage.tool_calls,
          tool_results: toolResults
        });
    } else {
        // No tool calls, just return the LLM's response
        return res.status(200).json(llmResponse);
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream, projectPath: rawPath } = req.body;
  logger.info(`[Chat] Request received. Model: ${model}, Stream: ${stream}, Path: ${rawPath}`);

  // 1. Resolve Project Context
  const projectPath = rawPath 
    ? (path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath))
    : process.cwd();
  
  logger.info(`[Chat] Resolved project path: ${projectPath}`);

  // 2. Inject Context (TASK-27)
  let enhancedMessages = [...messages];
  try {
    const runner = new AutonomousRunner((res as any).socket, projectPath);
    const context = await runner.getEnhancedContext();
    enhancedMessages.unshift({ role: 'system', content: context });
  } catch (e) {
    console.warn('[Chat] Context injection failed, proceeding with raw prompt');
  }

  // Prioritized list of providers to try
  // ... (rest of the provider logic remains the same)
  const headerProvider = req.headers['x-codex-provider'] as string;
  const apiKeyHeader = req.headers['authorization']?.split(' ')[1];

  const providersToTry = [];
  if (headerProvider && headerProvider !== 'auto') {
    providersToTry.push({ id: headerProvider, key: apiKeyHeader });
  } else {
    // Auto Strategy: Try Best Available
    if (process.env.NVIDIA_API_KEY) providersToTry.push({ id: 'nvidia', key: process.env.NVIDIA_API_KEY });
    const geminiKey = apiKeyHeader && headerProvider === 'gemini' ? apiKeyHeader : process.env.GEMINI_API_KEY; 
    if (geminiKey) providersToTry.push({ id: 'gemini', key: geminiKey });
    providersToTry.push({ id: 'ollama', key: '' });
    providersToTry.push({ id: 'mock', key: '' });
  }

  console.log(`[CodexProxy] Handling chat request. Strategy: ${providersToTry.map(p => p.id).join(' -> ')}`);

  let lastError = '';

  for (const provider of providersToTry) {
    try {
      console.log(`[CodexProxy] Attempting provider: ${provider.id}`);
      let response;

      if (provider.id === 'mock') {
        return res.status(200).json(getMockResponse(messages, lastError));
      }

      // Common fetch options
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.key}`,
        },
        body: JSON.stringify({
          model: model || (provider.id === 'nvidia' ? 'moonshotai/kimi-k2.5' : 'llama3'),
          messages: enhancedMessages,
          stream
        }),
      };

      if (provider.id === 'nvidia') {
        response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', fetchOptions);
      } else if (provider.id === 'ollama') {
        response = await fetch('http://localhost:11434/v1/chat/completions', {
            ...fetchOptions,
            headers: { 'Content-Type': 'application/json' } // Ollama doesn't need auth
        });
      } else if (provider.id === 'gemini') {
        const apiKey = provider.key || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error('Gemini API Key is missing. Please configure it in Settings.');
        }

        // Map OpenAI messages to Gemini format
        const geminiMessages = enhancedMessages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || '' }]
        }));

        const geminiModel = model || 'gemini-1.5-flash';

                try {

                  logger.info(`[Gemini] Sending ${enhancedMessages.length} messages to model ${geminiModel}`);

                  response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({

                      contents: geminiMessages,

                      generationConfig: {

                        temperature: 0.7,

                        maxOutputTokens: 2048,

                      }

                    })

                  });

        

                  if (response.ok) {

                    const data = await response.json();

                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';

                    logger.info(`[Gemini] Received response (${text.length} chars)`);

                    

                    if (stream) {

        

                        res.writeHead(200, { 

                          'Content-Type': 'text/event-stream',

                          'Cache-Control': 'no-cache',

                          'Connection': 'keep-alive'

                        });

                        // Wrap the full response in a single SSE data block so the frontend reader catches it

                        const sseData = {

                          choices: [{

                            delta: { content: text }

                          }]

                        };

                        res.write(`data: ${JSON.stringify(sseData)}\n\n`);

                        res.end();

                        return;

                      } else {

                        const mockOpenAIResponse = {

                          id: `gemini-${Date.now()}`,

                          choices: [{

                            message: {

                              role: 'assistant',

                              content: text

                            }

                          }]

                        };

                        return executeAndRespond(req, res, messages, mockOpenAIResponse);

                      }

                    }

           else {
            const errBody = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${errBody}`);
          }
        } catch (e: any) {
          console.error('[Gemini] Fetch failed:', e.message);
          throw e;
        }
      }

      if (response && response.ok) {
        if (stream) {
            // Streaming logic as before
            res.writeHead(200, { 'Content-Type': 'text/event-stream' });
            // @ts-ignore
            response.body.pipe(res);
            return;
        } else {
            const data = await response.json();
            return executeAndRespond(req, res, enhancedMessages, data);
        }
      } else {
        const errText = await response?.text();
        throw new Error(`Provider ${provider.id} failed: ${response?.status} ${errText}`);
      }

    } catch (error: any) {
      console.warn(`[CodexProxy] Provider ${provider.id} failed:`, error.message);
      lastError = error.message;
    }
  }

  return res.status(200).json(getMockResponse(messages, lastError));
}
