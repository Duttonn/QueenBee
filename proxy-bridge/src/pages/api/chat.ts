import type { NextApiRequest, NextApiResponse } from 'next';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, stream } = req.body;
  const provider = (req.headers['x-codex-provider'] as string) || 'gemini';
  const apiKey = req.headers['authorization']?.split(' ')[1];

  console.log(`[CodexProxy] Routing request to ${provider} (${model})`);

  try {
    let response;

    switch (provider) {
      case 'nvidia':
        // NVIDIA NIM API (OpenAI compatible)
        response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NVIDIA_API_KEY || apiKey}`,
          },
          body: JSON.stringify({ model, messages, stream }),
        });
        break;

      case 'gemini':
        // Google AI Studio / Vertex Bridge logic would go here
        // For now, mirroring or forwarding to a dedicated Gemini endpoint
        return res.status(501).json({ error: 'Gemini adapter in progress' });

      case 'ollama':
        // Local Ollama instance
        response = await fetch('http://localhost:11434/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, stream }),
        });
        break;

      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    const data = await response?.json();
    return res.status(response?.status || 500).json(data);

  } catch (error: any) {
    console.error(`[CodexProxy Error] ${error.message}`);
    return res.status(500).json({ error: 'Proxy communication failed', details: error.message });
  }
}
