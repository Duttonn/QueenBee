import type { NextApiRequest, NextApiResponse } from 'next';
import { ComparisonRunner } from '../../lib/ComparisonRunner';

/**
 * POST /api/compare
 *
 * Run the same prompt across multiple LLM providers in parallel.
 * Returns side-by-side results with latency and token metrics.
 *
 * Body: {
 *   prompt: string,
 *   providers: string[],       // e.g. ['openai', 'anthropic', 'gemini']
 *   systemPrompt?: string,
 *   maxTokens?: number,
 *   temperature?: number,
 *   timeoutMs?: number
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, providers, systemPrompt, maxTokens, temperature, timeoutMs } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing required field: prompt' });
  }

  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    return res.status(400).json({ error: 'Missing required field: providers (non-empty array)' });
  }

  if (providers.length > 6) {
    return res.status(400).json({ error: 'Maximum 6 providers allowed per comparison' });
  }

  try {
    const summary = await ComparisonRunner.compareAcrossProviders(prompt, providers, {
      systemPrompt,
      maxTokens,
      temperature,
      timeoutMs,
    });

    return res.status(200).json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
