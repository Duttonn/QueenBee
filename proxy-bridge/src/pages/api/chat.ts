import type { NextApiRequest, NextApiResponse } from 'next';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream } = req.body;

  // Prioritized list of providers to try
  // 1. Explicit provider from header
  // 2. NVIDIA (High quality)
  // 3. Ollama (Local)
  // 4. Mock (Fallback)
  const headerProvider = req.headers['x-codex-provider'] as string;
  const apiKeyHeader = req.headers['authorization']?.split(' ')[1];

  const providersToTry = [];
  if (headerProvider && headerProvider !== 'auto') {
    providersToTry.push({ id: headerProvider, key: apiKeyHeader });
  } else {
    // Auto Strategy: Try Best Available
    if (process.env.NVIDIA_API_KEY) providersToTry.push({ id: 'nvidia', key: process.env.NVIDIA_API_KEY });
    // Check for Gemini key in headers or env
    const geminiKey = apiKeyHeader && headerProvider === 'gemini' ? apiKeyHeader : process.env.GEMINI_API_KEY; 
    if (geminiKey) providersToTry.push({ id: 'gemini', key: geminiKey });
    
    providersToTry.push({ id: 'ollama', key: '' }); // Local usually doesn't need key
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

      if (provider.id === 'nvidia') {
        response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.key}`,
          },
          body: JSON.stringify({
            model: model || 'moonshotai/kimi-k2.5',
            messages,
            stream
          }),
        });
      }
      else if (provider.id === 'ollama') {
        response = await fetch('http://localhost:11434/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model || 'llama3', messages, stream }),
        });
      }
      else if (provider.id === 'gemini') {
        const geminiModel = model && model.includes('gemini') ? model : 'gemini-1.5-pro';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${provider.key}`;
        
        // Convert OpenAI-style messages to Gemini format
        const contents = messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });
        
        // Gemini returns a different format, we might need to transform it if the frontend expects OpenAI format
        // For now, let's return it as is or handle basic transformation if it's not streaming
        if (response.ok && !stream) {
            const data = await response.json();
            // Transform Gemini response to OpenAI format
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return res.status(200).json({
                id: `gemini-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: geminiModel,
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content },
                    finish_reason: 'stop'
                }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            });
        }
      }

      if (response && response.ok) {
        if (stream) {
          // Pipe the stream directly to the response
          // This requires installing 'node-fetch' or similar if using Node < 18 native fetch, 
          // but Next.js native fetch returns a web stream.
          // We need to convert it or pipe it.
          // Simple approach: pipe the body.

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          });

          // @ts-ignore
          const body = response.body;
          if (body) {
            // For Node.js ReadableStream (from node-fetch or similar polyfills in Next.js)
            if (typeof body.pipe === 'function') {
              body.pipe(res);
            } else {
              // For Web ReadableStream (standard fetch)
              const reader = body.getReader();
              const pump = async () => {
                const { done, value } = await reader.read();
                if (done) {
                  res.end();
                  return;
                }
                res.write(value);
                await pump();
              };
              await pump();
            }
          }
          return;
        } else {
          const data = await response.json();
          return res.status(200).json(data);
        }
      } else {
        const errText = await response?.text();
        throw new Error(`Provider ${provider.id} failed: ${response?.status} ${errText}`);
      }

    } catch (error: any) {
      console.warn(`[CodexProxy] Provider ${provider.id} failed:`, error.message);
      lastError = error.message;
      // Continue to next provider
    }
  }

  // If all failed
  console.log('[CodexProxy] All providers failed, returning fallback mock.');
  return res.status(200).json(getMockResponse(messages, lastError));
}
