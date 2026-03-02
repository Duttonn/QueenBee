import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthProfileStore } from '../../../lib/auth-profile-store';
import { unifiedLLMService } from '../../../lib/UnifiedLLMService';
import { OpenAIProvider } from '../../../lib/providers/OpenAIProvider';
import { AnthropicProvider } from '../../../lib/providers/AnthropicProvider';
import { GeminiProvider } from '../../../lib/providers/GeminiProvider';
import { MistralProvider } from '../../../lib/providers/MistralProvider';
import { OpenRouterProvider } from '../../../lib/providers/OpenRouterProvider';
import { OllamaProvider } from '../../../lib/providers/OllamaProvider';

/**
 * POST /api/providers/save
 * Persists a provider API key to the auth-profile-store (survives restarts)
 * and hot-registers the provider in UnifiedLLMService at runtime.
 *
 * Body: { provider: string, apiKey?: string, baseUrl?: string }
 *
 * DELETE /api/providers/save
 * Body: { provider: string } — removes a saved profile
 */

// Map of OpenAI-compatible providers and their base URLs
const OPENAI_COMPAT_PROVIDERS: Record<string, string> = {
  groq:        'https://api.groq.com/openai/v1',
  xai:         'https://api.x.ai/v1',
  deepseek:    'https://api.deepseek.com',
  together:    'https://api.together.xyz/v1',
  perplexity:  'https://api.perplexity.ai',
  cohere:      'https://api.cohere.com/compatibility/v1',
  nvidia:      'https://integrate.api.nvidia.com/v1',
  cerebras:    'https://api.cerebras.ai/v1',
  fireworks:   'https://api.fireworks.ai/inference/v1',
  sambanova:   'https://api.sambanova.ai/v1',
  hyperbolic:  'https://api.hyperbolic.xyz/v1',
  moonshot:    'https://api.moonshot.cn/v1',
  qwen:        'https://dashscope.aliyuncs.com/compatible-mode/v1',
  openai:      'https://api.openai.com/v1',
  lmstudio:    'http://localhost:1234/v1',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ error: 'provider required' });
    await AuthProfileStore.deleteProfile(provider);
    return res.json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, apiKey, baseUrl } = req.body as {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
  };

  if (!provider) {
    return res.status(400).json({ error: 'provider is required' });
  }

  // Persist to auth-profile-store
  const profile: any = {
    id: provider,
    provider,
    mode: 'api_key' as const,
    apiKey,
    apiBase: baseUrl,
  };
  await AuthProfileStore.saveProfile(profile);

  // Hot-register in running UnifiedLLMService instance
  try {
    let llmProvider: any = null;

    if (provider === 'openai' || OPENAI_COMPAT_PROVIDERS[provider]) {
      const url = baseUrl || OPENAI_COMPAT_PROVIDERS[provider] || 'https://api.openai.com/v1';
      llmProvider = new OpenAIProvider(provider, apiKey || '', url);
    } else if (provider === 'anthropic') {
      llmProvider = new AnthropicProvider(apiKey || '');
    } else if (provider === 'gemini') {
      llmProvider = new GeminiProvider(apiKey || '');
    } else if (provider === 'mistral') {
      llmProvider = new MistralProvider(apiKey || '');
    } else if (provider === 'openrouter') {
      llmProvider = new OpenRouterProvider(apiKey || '');
    } else if (provider === 'ollama' || provider === 'lmstudio') {
      llmProvider = new OllamaProvider(baseUrl || 'http://localhost:11434');
    } else if (baseUrl) {
      // Generic OpenAI-compatible
      llmProvider = new OpenAIProvider(provider, apiKey || '', baseUrl);
    }

    if (llmProvider) {
      await unifiedLLMService.ready;
      unifiedLLMService.addProvider(llmProvider);
    }
  } catch (err: any) {
    console.warn('[ProviderSave] Hot-register failed (non-fatal):', err.message);
  }

  return res.json({ ok: true, provider });
}
