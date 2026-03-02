import { LLMProvider } from './LLMProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { MistralProvider } from './providers/MistralProvider';
import { ClaudeCodeProvider } from './providers/ClaudeCodeProvider';
import { GeminiCliProvider } from './providers/GeminiCliProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { AuthProfileStore } from './auth-profile-store';
import { ConfigManager, ModelConfig } from './config-manager';
import { AuthProfileManager } from './AuthProfileManager';
import { getCircuitBreaker, CircuitOpenError } from './CircuitBreaker';

// Pricing Registry: Cost per 1k tokens (in USD)
const PRICING_REGISTRY: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'default': { input: 0.002, output: 0.002 } // Fallback for OpenAI
  },
  anthropic: {
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    'default': { input: 0.003, output: 0.015 }
  },
  gemini: {
    'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
    'gemini-1.5-flash': { input: 0.00035, output: 0.00105 },
    'default': { input: 0.001, output: 0.001 }
  },
  mistral: {
    'mistral-large-latest': { input: 0.004, output: 0.012 },
    'mistral-small-latest': { input: 0.001, output: 0.003 },
    'default': { input: 0.002, output: 0.006 }
  },
  // CLI subscription providers — billed via subscription, token tracking approximate
  'claude-code': { 'default': { input: 0, output: 0 } },
  'gemini-cli':  { 'default': { input: 0, output: 0 } },
  // OpenRouter — pay-per-use, cost varies by model (approximate average)
  openrouter: {
    'openai/gpt-4o': { input: 0.005, output: 0.015 },
    'anthropic/claude-sonnet-4-6': { input: 0.003, output: 0.015 },
    'google/gemini-2.5-pro': { input: 0.00125, output: 0.01 },
    'meta-llama/llama-3.3-70b-instruct': { input: 0.0002, output: 0.0002 },
    'deepseek/deepseek-r1': { input: 0.0008, output: 0.0024 },
    'default': { input: 0.001, output: 0.002 }
  },
  groq: {
    'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
    'mixtral-8x7b-32768': { input: 0.00027, output: 0.00027 },
    'default': { input: 0.0005, output: 0.0008 }
  },
  xai: {
    'grok-3': { input: 0.003, output: 0.015 },
    'grok-3-mini': { input: 0.0003, output: 0.0005 },
    'default': { input: 0.002, output: 0.01 }
  },
  deepseek: {
    'deepseek-chat': { input: 0.00014, output: 0.00028 },
    'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
    'default': { input: 0.0002, output: 0.0006 }
  },
  together: {
    'meta-llama/Llama-3.3-70B-Instruct-Turbo': { input: 0.00088, output: 0.00088 },
    'default': { input: 0.0006, output: 0.0006 }
  },
  perplexity: {
    'sonar-pro': { input: 0.003, output: 0.015 },
    'sonar': { input: 0.001, output: 0.001 },
    'default': { input: 0.001, output: 0.001 }
  },
  cohere: {
    'command-r-plus': { input: 0.003, output: 0.015 },
    'command-r': { input: 0.0005, output: 0.0015 },
    'default': { input: 0.001, output: 0.002 }
  },
  ollama:    { 'default': { input: 0, output: 0 } },
  lmstudio:  { 'default': { input: 0, output: 0 } },
};

const GLOBAL_DEFAULT_PRICE = { input: 0.002, output: 0.002 };

/**
 * P18-06: Model-aware timeout multipliers.
 * Base timeout is 120s. Heavier/slower models get a longer budget.
 * Match is done by checking if the model name contains the key.
 */
const MODEL_TIMEOUT_MULTIPLIERS: Array<{ pattern: string; multiplier: number }> = [
  { pattern: 'opus',    multiplier: 2.0 },
  { pattern: 'o1',      multiplier: 2.0 },
  { pattern: 'sonnet',  multiplier: 1.3 },
  { pattern: 'gpt-4',   multiplier: 1.3 },
  { pattern: 'haiku',   multiplier: 0.5 },
  { pattern: 'flash',   multiplier: 0.5 },
  { pattern: 'mini',    multiplier: 0.5 },
];
const BASE_TIMEOUT_MS = 120_000;

function getModelTimeout(model?: string): number {
  if (!model) return BASE_TIMEOUT_MS;
  const lower = model.toLowerCase();
  for (const { pattern, multiplier } of MODEL_TIMEOUT_MULTIPLIERS) {
    if (lower.includes(pattern)) return Math.round(BASE_TIMEOUT_MS * multiplier);
  }
  return BASE_TIMEOUT_MS;
}

/** Wrap a promise with a timeout that rejects with a descriptive error. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`LLM timeout after ${ms}ms (${label})`)), ms);
    promise.then(val => { clearTimeout(timer); resolve(val); })
           .catch(err => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Configurable fallback chains per composerMode.
 * Each chain is an ordered list of provider IDs to try in sequence.
 */
export interface FallbackChainConfig {
  code: string[];
  chat: string[];
  plan: string[];
  default: string[];
}

const DEFAULT_FALLBACK_CHAINS: FallbackChainConfig = {
  code:    ['claude-code', 'anthropic', 'openrouter', 'openai', 'deepseek', 'gemini', 'gemini-cli', 'groq', 'mistral', 'ollama', 'lmstudio'],
  chat:    ['gemini-cli', 'gemini', 'openrouter', 'openai', 'anthropic', 'claude-code', 'groq', 'mistral', 'perplexity', 'ollama'],
  plan:    ['claude-code', 'anthropic', 'openai', 'openrouter', 'gemini', 'gemini-cli', 'mistral', 'ollama'],
  default: ['gemini-cli', 'gemini', 'claude-code', 'openrouter', 'openai', 'anthropic', 'groq', 'deepseek', 'mistral', 'ollama', 'lmstudio'],
};

/**
 * P18-21: Two-tier LLM architecture.
 * The exploration tier (Haiku/Flash) is used for cheap scan/explore operations.
 * getExplorationOptions() returns options that force the exploration model.
 */
export const EXPLORATION_MODELS: Record<string, string> = {
  anthropic:    'claude-haiku-4-5-20251001',
  'claude-code':'claude-haiku-4-5-20251001',
  openai:       'gpt-4o-mini',
  google:       'gemini-2.0-flash',
  'gemini-cli': 'gemini-2.0-flash',
  openrouter:   'meta-llama/llama-3.3-70b-instruct:free',
  groq:         'llama-3.3-70b-versatile',
  deepseek:     'deepseek-chat',
  ollama:       'llama3.2',
  lmstudio:     'llama3.2',
};

export class UnifiedLLMService {
  private providers: Map<string, LLMProvider> = new Map();
  public ready: Promise<void>;
  private usageStats: any[] = [];
  public readonly authProfileManager = new AuthProfileManager();
  private fallbackChains: FallbackChainConfig = { ...DEFAULT_FALLBACK_CHAINS };

  /** P18-21: Return LLMProviderOptions with the exploration-tier model for a given provider. */
  getExplorationOptions(providerId: string, baseOptions?: LLMProviderOptions): LLMProviderOptions {
    const normalizedId = providerId.toLowerCase();
    let explorationModel: string | undefined;
    for (const [key, model] of Object.entries(EXPLORATION_MODELS)) {
      if (normalizedId.includes(key)) { explorationModel = model; break; }
    }
    return { ...baseOptions, ...(explorationModel ? { model: explorationModel } : {}) };
  }

  private calculateCost(providerId: string, model: string, usage: any): number {
    if (!usage) return 0;
    
    // Normalize provider and model
    const normalizedProvider = providerId.toLowerCase().includes('google') ? 'gemini' : providerId.toLowerCase();
    const providerPricing = PRICING_REGISTRY[normalizedProvider];
    
    // Find precise model match or partial match
    let pricing = GLOBAL_DEFAULT_PRICE;
    
    if (providerPricing) {
        // 1. Exact Match
        if (providerPricing[model]) {
            pricing = providerPricing[model];
        } 
        // 2. Partial Match (e.g. gpt-4o-2024-05-13 -> gpt-4o)
        else {
            const matchedKey = Object.keys(providerPricing).find(k => model.includes(k));
            if (matchedKey) {
                pricing = providerPricing[matchedKey];
            } else {
                pricing = providerPricing['default'] || GLOBAL_DEFAULT_PRICE;
            }
        }
    }

    const inputCost = (usage.prompt_tokens / 1000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * pricing.output;
    
    return inputCost + outputCost;
  }

  private recordUsage(providerId: string, model: string, usage: any) {
    if (!usage) return;
    
    const cost = this.calculateCost(providerId, model, usage);

    this.usageStats.push({
      timestamp: new Date().toISOString(),
      providerId,
      model,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      cost
    });
    if (this.usageStats.length > 1000) this.usageStats.shift();
  }

  getUsage() {
    return this.usageStats;
  }

  private providerAliases: Record<string, string> = {
    'gemini': 'google',
    'claude': 'anthropic',
    'codex': 'openai-codex',
    'kimi': 'moonshot',
    'moonshot-v1': 'moonshot',
    'qwen-turbo': 'qwen',
    'qwen-plus': 'qwen',
    'qwen-max': 'qwen',
  };

  constructor() {
    this.ready = this.initializeProviders();
  }

  private async initializeProviders() {
    // 1. Initialize from Environment Variables (Low Priority)
    this.initFromEnv();

    // 2. Initialize from Stored Profiles (Medium Priority)
    const profiles = await AuthProfileStore.listProfiles();
    for (const profile of profiles) {
      this.initFromProfile(profile);
    }

    // 3. Initialize from Global Config (High Priority - Overrides everything)
    const config = await ConfigManager.getConfig();
    if (config.models) {
      for (const modelConfig of config.models) {
        this.initFromModelConfig(modelConfig);
      }
    }

    // 4. Defaults / Locals — only register ollama if explicitly configured via env or profile
    // (removed auto-registration of ollama with empty key)
  }

  private initFromEnv() {
    // ── Standard API-key providers ─────────────────────────────────────────
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) this.providers.set('openai', new OpenAIProvider('openai', openaiKey));

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) this.providers.set('anthropic', new AnthropicProvider(anthropicKey));

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) this.providers.set('gemini', new GeminiProvider(geminiKey));

    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey) this.providers.set('mistral', new MistralProvider(mistralKey));

    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) this.providers.set('nvidia', new OpenAIProvider('nvidia', nvidiaKey, 'https://integrate.api.nvidia.com/v1'));

    const moonshotKey = process.env.MOONSHOT_API_KEY;
    if (moonshotKey) this.providers.set('moonshot', new OpenAIProvider('moonshot', moonshotKey, 'https://api.moonshot.cn/v1'));

    const qwenKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (qwenKey) this.providers.set('qwen', new OpenAIProvider('qwen', qwenKey, 'https://dashscope.aliyuncs.com/compatible-mode/v1'));

    // ── OpenRouter — 200+ models with a single key ──────────────────────────
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) this.providers.set('openrouter', new OpenRouterProvider(openRouterKey));

    // ── Groq — ultra-fast inference, generous free tier ─────────────────────
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) this.providers.set('groq', new OpenAIProvider('groq', groqKey, 'https://api.groq.com/openai/v1'));

    // ── xAI (Grok) ──────────────────────────────────────────────────────────
    const xaiKey = process.env.XAI_API_KEY;
    if (xaiKey) this.providers.set('xai', new OpenAIProvider('xai', xaiKey, 'https://api.x.ai/v1'));

    // ── DeepSeek ─────────────────────────────────────────────────────────────
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) this.providers.set('deepseek', new OpenAIProvider('deepseek', deepseekKey, 'https://api.deepseek.com'));

    // ── Together AI — open-weight models at low cost ─────────────────────────
    const togetherKey = process.env.TOGETHER_API_KEY;
    if (togetherKey) this.providers.set('together', new OpenAIProvider('together', togetherKey, 'https://api.together.xyz/v1'));

    // ── Perplexity — real-time web search + LLM ──────────────────────────────
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    if (perplexityKey) this.providers.set('perplexity', new OpenAIProvider('perplexity', perplexityKey, 'https://api.perplexity.ai'));

    // ── Cohere — Command R+ series ───────────────────────────────────────────
    const cohereKey = process.env.COHERE_API_KEY;
    if (cohereKey) this.providers.set('cohere', new OpenAIProvider('cohere', cohereKey, 'https://api.cohere.com/compatibility/v1'));

    // ── Cerebras — fast inference ────────────────────────────────────────────
    const cerebrasKey = process.env.CEREBRAS_API_KEY;
    if (cerebrasKey) this.providers.set('cerebras', new OpenAIProvider('cerebras', cerebrasKey, 'https://api.cerebras.ai/v1'));

    // ── Fireworks AI — fast open-weight serving ──────────────────────────────
    const fireworksKey = process.env.FIREWORKS_API_KEY;
    if (fireworksKey) this.providers.set('fireworks', new OpenAIProvider('fireworks', fireworksKey, 'https://api.fireworks.ai/inference/v1'));

    // ── Sambanova — fast inference ───────────────────────────────────────────
    const sambanovaKey = process.env.SAMBANOVA_API_KEY;
    if (sambanovaKey) this.providers.set('sambanova', new OpenAIProvider('sambanova', sambanovaKey, 'https://api.sambanova.ai/v1'));

    // ── Hyperbolic ───────────────────────────────────────────────────────────
    const hyperbolicKey = process.env.HYPERBOLIC_API_KEY;
    if (hyperbolicKey) this.providers.set('hyperbolic', new OpenAIProvider('hyperbolic', hyperbolicKey, 'https://api.hyperbolic.xyz/v1'));

    // ── Local providers — no auth, no data leaves machine ────────────────────
    // Ollama (auto-detect: if no explicit OLLAMA_HOST env, try localhost)
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const ollamaProvider = new OllamaProvider(ollamaHost);
    this.providers.set('ollama', ollamaProvider);

    // LM Studio — local OpenAI-compatible server
    const lmStudioHost = process.env.LMSTUDIO_HOST || 'http://localhost:1234';
    this.providers.set('lmstudio', new OpenAIProvider('lmstudio', 'lm-studio', `${lmStudioHost}/v1`));

    // ── CLI subscription providers — uses installed CLI auth, no API key ──────
    const claudeCodeProvider = new ClaudeCodeProvider();
    if (claudeCodeProvider.hasKey()) {
      this.providers.set('claude-code', claudeCodeProvider);
      console.log('[LLMService] Claude Code subscription detected — claude-code provider enabled');
    }

    const geminiCliProvider = new GeminiCliProvider();
    if (geminiCliProvider.hasKey()) {
      this.providers.set('gemini-cli', geminiCliProvider);
      console.log('[LLMService] Gemini CLI OAuth credentials detected — gemini-cli provider enabled');
    }
  }

  private initFromProfile(profile: any) {
    const key = profile.apiKey || profile.access || profile.token;
    const id = profile.id || profile.provider;

    // CLI providers don't need an API key — they use local credentials
    if (profile.provider === 'claude-code') {
      const p = new ClaudeCodeProvider();
      if (p.hasKey()) this.providers.set(id, p);
      return;
    }
    if (profile.provider === 'gemini-cli') {
      const p = new GeminiCliProvider();
      if (p.hasKey()) this.providers.set(id, p);
      return;
    }
    // Ollama / LM Studio — no key required
    if (profile.provider === 'ollama') {
      this.providers.set(id, new OllamaProvider(profile.apiBase || 'http://localhost:11434'));
      return;
    }
    if (profile.provider === 'lmstudio') {
      const base = profile.apiBase || 'http://localhost:1234';
      this.providers.set(id, new OpenAIProvider(id, 'lm-studio', `${base}/v1`));
      return;
    }

    if (!key) return;

    switch (profile.provider) {
      case 'openai':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase));
        break;
      case 'anthropic':
        this.providers.set(id, new AnthropicProvider(key));
        break;
      case 'google':
      case 'gemini':
        this.providers.set(id, new GeminiProvider(key));
        break;
      case 'mistral':
        this.providers.set(id, new MistralProvider(key));
        break;
      case 'openrouter':
        this.providers.set(id, new OpenRouterProvider(key));
        break;
      case 'groq':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://api.groq.com/openai/v1'));
        break;
      case 'xai':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://api.x.ai/v1'));
        break;
      case 'deepseek':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://api.deepseek.com'));
        break;
      case 'together':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://api.together.xyz/v1'));
        break;
      case 'perplexity':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://api.perplexity.ai'));
        break;
      case 'cohere':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://api.cohere.com/compatibility/v1'));
        break;
      case 'moonshot':
      case 'kimi':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://api.moonshot.cn/v1'));
        break;
      case 'qwen':
        this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase || 'https://dashscope.aliyuncs.com/compatible-mode/v1'));
        break;
      default:
        // Generic OpenAI-compatible with custom base URL
        if (profile.apiBase) {
          this.providers.set(id, new OpenAIProvider(id, key, profile.apiBase));
        }
    }
  }

  private initFromModelConfig(config: ModelConfig) {
    const key = config.requestOptions?.headers?.Authorization?.replace('Bearer ', '') || '';
    const id = config.name; // Use model name as provider ID for now

    switch (config.provider) {
      case 'openai':
      case 'mistral':
      case 'ollama':
        // Most enterprise/local models follow OpenAI format
        this.providers.set(id, new OpenAIProvider(id, key, config.apiBase));
        break;
      case 'anthropic':
        this.providers.set(id, new AnthropicProvider(key));
        break;
      case 'gemini':
        this.providers.set(id, new GeminiProvider(key));
        break;
    }
  }

  async chat(providerId: string, messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    await this.ready;

    // For 'auto' mode, use autoChat which has smart routing + failover
    if (providerId === 'auto') {
      return this.autoChat(messages, options);
    }

    // Specific provider requested — use ONLY that provider, no fallback
    const provider = await this.getOrLoadProvider(providerId, options);
    if (!provider || !provider.hasKey()) {
      throw new Error(
        `Provider '${providerId}' is not configured or has no API key. Please add an API key in Settings.`
      );
    }

    const timeoutMs = getModelTimeout(options?.model);
    console.log(`[LLMService] Chat with provider: ${providerId}, model: ${options?.model || 'default'}, timeout: ${timeoutMs}ms`);

    // P21-01: Circuit breaker wraps the provider call
    const breaker = getCircuitBreaker(providerId);
    try {
      const response = await breaker.call(() =>
        withTimeout(
          provider.chat(messages, options),
          timeoutMs,
          `${providerId}/${options?.model || 'default'}`
        )
      );
      this.authProfileManager.markSuccess(providerId);
      this.recordUsage(providerId, response.model || 'unknown', response.usage);
      return response;
    } catch (error: any) {
      if (error instanceof CircuitOpenError) {
        console.warn(`[LLMService] Circuit breaker open for '${providerId}': ${error.message}`);
        throw error;
      }
      const reason = AuthProfileManager.classifyError(error);
      this.authProfileManager.markFailure(providerId, reason);
      console.error(`[LLMService] Provider '${providerId}' failed (${reason}): ${error.message}`);
      throw error;
    }
  }

  async *chatStream(providerId: string, messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    await this.ready;

    // For 'auto', try smart routing then fallback
    if (providerId === 'auto') {
      const modelName = options?.model?.toLowerCase() || '';
      let bestId: string | null = null;
      if (modelName.includes('/') && this.providers.has('openrouter')) bestId = 'openrouter';
      else if (modelName.includes('gemini')) bestId = this.providers.has('gemini-cli') ? 'gemini-cli' : 'gemini';
      else if (modelName.includes('gpt') || modelName.includes('o1-') || modelName.includes('o3-')) bestId = 'openai';
      else if (modelName.includes('claude')) bestId = this.providers.has('claude-code') ? 'claude-code' : 'anthropic';
      else if (modelName.includes('grok')) bestId = 'xai';
      else if (modelName.includes('deepseek')) bestId = 'deepseek';
      else if (modelName.includes('sonar')) bestId = 'perplexity';
      else if (modelName.includes('mistral') || modelName.includes('mixtral')) bestId = this.providers.has('groq') ? 'groq' : 'mistral';
      else if (modelName.includes('moonshot') || modelName.includes('kimi')) bestId = 'moonshot';
      else if (modelName.includes('qwen')) bestId = 'qwen';
      else if (modelName.includes('llama') || modelName.includes('phi')) bestId = this.providers.has('groq') ? 'groq' : 'ollama';

      if (bestId) {
        const p = await this.getOrLoadProvider(bestId, options);
        if (p && p.hasKey()) {
          providerId = bestId;
        }
      }

      // If still auto, pick first available
      if (providerId === 'auto') {
        for (const [id, p] of this.providers.entries()) {
          if (p.hasKey()) { providerId = id; break; }
        }
      }

      if (providerId === 'auto') {
        throw new Error('No AI providers configured. Please add an API key in Settings.');
      }
    }

    // Specific provider — use ONLY that provider
    const provider = await this.getOrLoadProvider(providerId, options);
    if (!provider || !provider.hasKey()) {
      throw new Error(`Provider '${providerId}' is not configured or has no API key.`);
    }

    console.log(`[LLMService] chatStream with provider: ${providerId}, model: ${options?.model || 'default'}`);

    try {
      if (provider.chatStream) {
        yield* provider.chatStream(messages, options);
      } else {
        const response = await provider.chat(messages, options);
        yield response;
      }
      this.authProfileManager.markSuccess(providerId);
    } catch (error: any) {
      const reason = AuthProfileManager.classifyError(error);
      this.authProfileManager.markFailure(providerId, reason);
      console.error(`[LLMService] chatStream failed for ${providerId}: ${error.message}`);
      throw error;
    }
  }

  async transcribe(providerId: string, audioBlob: any, options?: { apiKey?: string | null; sessionId?: string }): Promise<{ text: string }> {
    await this.ready;
    
    // 1. Try requested provider
    let provider = await this.getOrLoadProvider(providerId, { apiKey: options?.apiKey || undefined, sessionId: options?.sessionId });

    if (provider && (provider as any).transcribe) {
      const text = await (provider as any).transcribe(audioBlob);
      return { text };
    }

    // 2. Fallback: Loop through priority list to find ANY provider that supports transcribe
    // Ensure we try to load them if they aren't in memory
    const priority = ['gemini', 'openai']; 
    
    for (const id of priority) {
      if (id === providerId) continue; // Already tried
      
      const p = await this.getOrLoadProvider(id, { sessionId: options?.sessionId }); // Ensure it's loaded
      if (p && (p as any).transcribe) {
        console.log(`[Transcribe] Falling back to provider: ${id}`);
        try {
            const text = await (p as any).transcribe(audioBlob);
            return { text };
        } catch (e) {
            console.warn(`[Transcribe] Fallback provider ${id} failed:`, e);
            // Continue to next provider
        }
      }
    }

    throw new Error('No transcription provider available. Please configure OpenAI or Gemini.');
  }

  private async getOrLoadProvider(providerId: string, options?: LLMProviderOptions): Promise<LLMProvider | undefined> {
    const checkKey = (p: LLMProvider | undefined) => {
      if (!p) return undefined;
      if (p.hasKey()) return p;
      return undefined;
    };

    // 1. Check existing providers
    let provider = this.providers.get(providerId);
    if (provider) return checkKey(provider);

    // 2. Try alias lookup
    const alias = this.providerAliases[providerId];
    if (alias) {
      provider = this.providers.get(alias);
      if (provider) return checkKey(provider);
    }

    // 3. If an apiKey is passed, create a temporary provider
    if (options?.apiKey) {
      console.log(`[LLMService] Creating temporary provider for '${providerId}' using provided API key.`);
      const type = alias || providerId;
      const newProvider = this.createProviderByType(type, options.apiKey);
      if (newProvider) return checkKey(newProvider);
    }

    // 4. Try to load from store (in case it was added after startup)
    const profiles = await AuthProfileStore.listProfiles(options?.sessionId);
    for (const profile of profiles) {
      const pId = profile.id || profile.provider;
      if (pId === providerId || pId === alias || profile.provider === providerId || profile.provider === alias) {
        console.log(`[LLMService] Found matching profile in store: ${pId}. Loading into memory.`);
        this.initFromProfile(profile);
        return checkKey(this.providers.get(pId));
      }
    }

    // 5. Check Environment Variables (Last Resort for lazy loading)
    if (providerId === 'gemini' || alias === 'gemini') {
        const key = process.env.GEMINI_API_KEY;
        if (key) {
            this.providers.set('gemini', new GeminiProvider(key));
            return checkKey(this.providers.get('gemini'));
        }
    }
    if (providerId === 'openai' || alias === 'openai') {
        const key = process.env.OPENAI_API_KEY;
        if (key) {
            this.providers.set('openai', new OpenAIProvider('openai', key));
            return checkKey(this.providers.get('openai'));
        }
    }

    // 6. Try pattern match in memory
    for (const [id, p] of this.providers.entries()) {
      if (id.startsWith(`${providerId}:`) || (alias && id.startsWith(`${alias}:`))) {
        return checkKey(p);
      }
    }

    return undefined;
  }

  private createProviderByType(type: string, apiKey: string): LLMProvider | undefined {
    switch (type) {
      case 'openai':
      case 'openai-codex':
        return new OpenAIProvider(type, apiKey);
      case 'anthropic':
        return new AnthropicProvider(apiKey);
      case 'google':
      case 'gemini':
        return new GeminiProvider(apiKey);
      case 'mistral':
        return new MistralProvider(apiKey);
      case 'openrouter':
        return new OpenRouterProvider(apiKey);
      case 'groq':
        return new OpenAIProvider('groq', apiKey, 'https://api.groq.com/openai/v1');
      case 'xai':
        return new OpenAIProvider('xai', apiKey, 'https://api.x.ai/v1');
      case 'deepseek':
        return new OpenAIProvider('deepseek', apiKey, 'https://api.deepseek.com');
      case 'together':
        return new OpenAIProvider('together', apiKey, 'https://api.together.xyz/v1');
      case 'perplexity':
        return new OpenAIProvider('perplexity', apiKey, 'https://api.perplexity.ai');
      case 'cohere':
        return new OpenAIProvider('cohere', apiKey, 'https://api.cohere.com/compatibility/v1');
      case 'cerebras':
        return new OpenAIProvider('cerebras', apiKey, 'https://api.cerebras.ai/v1');
      case 'fireworks':
        return new OpenAIProvider('fireworks', apiKey, 'https://api.fireworks.ai/inference/v1');
      case 'sambanova':
        return new OpenAIProvider('sambanova', apiKey, 'https://api.sambanova.ai/v1');
      case 'hyperbolic':
        return new OpenAIProvider('hyperbolic', apiKey, 'https://api.hyperbolic.xyz/v1');
      case 'nvidia':
        return new OpenAIProvider('nvidia', apiKey, 'https://integrate.api.nvidia.com/v1');
      case 'moonshot':
      case 'kimi':
        return new OpenAIProvider(type, apiKey, 'https://api.moonshot.cn/v1');
      case 'qwen':
        return new OpenAIProvider('qwen', apiKey, 'https://dashscope.aliyuncs.com/compatible-mode/v1');
      case 'ollama':
        return new OllamaProvider();
      case 'lmstudio':
        return new OpenAIProvider('lmstudio', 'lm-studio', 'http://localhost:1234/v1');
      case 'claude-code': {
        const p = new ClaudeCodeProvider();
        return p.hasKey() ? p : undefined;
      }
      case 'gemini-cli': {
        const p = new GeminiCliProvider();
        return p.hasKey() ? p : undefined;
      }
      default:
        return undefined;
    }
  }

  private async autoChat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    await this.ready;

    // 0. Smart Routing based on Model Name
    const modelName = options?.model?.toLowerCase();
    if (modelName) {
      let bestProviderId: string | null = null;
      // OpenRouter model names contain a slash (provider/model)
      if (modelName.includes('/') && this.providers.has('openrouter')) bestProviderId = 'openrouter';
      else if (modelName.includes('gpt') || modelName.includes('o1-') || modelName.includes('o3-')) bestProviderId = 'openai';
      else if (modelName.includes('claude')) bestProviderId = this.providers.has('claude-code') ? 'claude-code' : 'anthropic';
      else if (modelName.includes('gemini')) bestProviderId = this.providers.has('gemini-cli') ? 'gemini-cli' : 'gemini';
      else if (modelName.includes('grok')) bestProviderId = 'xai';
      else if (modelName.includes('deepseek')) bestProviderId = 'deepseek';
      else if (modelName.includes('sonar')) bestProviderId = 'perplexity';
      else if (modelName.includes('command')) bestProviderId = 'cohere';
      else if (modelName.includes('llama') || modelName.includes('mistral') || modelName.includes('mixtral') || modelName.includes('phi') || modelName.includes('qwen')) {
        // Prefer Groq for speed if available, then Together, then Ollama
        bestProviderId = this.providers.has('groq') ? 'groq'
          : this.providers.has('together') ? 'together'
          : 'ollama';
      }

      if (bestProviderId) {
        const p = this.providers.get(bestProviderId);
        if (p) {
          console.log(`[AutoChat] Smart-routed '${modelName}' to provider '${bestProviderId}'`);
          return await p.chat(messages, options);
        }
      }
    }

    // 1. Priority list for auto selection (subscription/free providers first)
    const priorityTypes = [
      'gemini-cli', 'claude-code',                   // subscription CLI providers (free-to-use)
      'gemini', 'google',                             // API-key Gemini
      'openrouter',                                   // multi-model hub
      'groq',                                         // fast + free tier
      'openai', 'anthropic',                          // flagship API providers
      'deepseek', 'together', 'perplexity', 'cohere', // specialized
      'nvidia', 'cerebras', 'fireworks',              // inference providers
      'ollama', 'lmstudio',                           // local
    ];
    const candidates: { id: string, provider: LLMProvider }[] = [];

    for (const [id, p] of this.providers.entries()) {
      if (p.hasKey()) {
        candidates.push({ id, provider: p });
      }
    }

    let lastError: Error | null = null;

    // Try in order of priority types
    for (const type of priorityTypes) {
      const typeCandidates = candidates.filter(c => 
        c.id.toLowerCase().includes(type) || 
        c.provider.id.toLowerCase().includes(type) ||
        (type === 'gemini' && c.id.toLowerCase().includes('google'))
      );

      for (const { id, provider } of typeCandidates) {
        if (this.authProfileManager.isInCooldown(id)) {
          console.log(`[AutoChat] Skipping '${id}' (in cooldown)`);
          continue;
        }
        // P21-01: Skip providers with open circuit breakers
        const breaker = getCircuitBreaker(id);
        if (!breaker.isAllowed()) {
          console.log(`[AutoChat] Skipping '${id}' (circuit breaker open)`);
          continue;
        }
        try {
          console.log(`[AutoChat] Trying provider: ${id}`);
          const response = await breaker.call(() => provider.chat(messages, options));
          this.authProfileManager.markSuccess(id);
          return response;
        } catch (e: any) {
          if (!(e instanceof CircuitOpenError)) {
            const reason = AuthProfileManager.classifyError(e);
            this.authProfileManager.markFailure(id, reason);
          }
          lastError = e;
          console.error(`[AutoChat] Fallback provider '${id}' failed: ${e.message}`);
        }
      }
    }

    throw lastError || new Error('No providers available for auto-chat. Please configure at least one provider in Settings.');
  }

  addProvider(provider: LLMProvider) {
    this.providers.set(provider.id, provider);
  }

  /**
   * Update fallback chains at runtime (e.g., from PolicyStore config).
   */
  setFallbackChains(chains: Partial<FallbackChainConfig>): void {
    this.fallbackChains = { ...DEFAULT_FALLBACK_CHAINS, ...chains };
    console.log('[LLMService] Fallback chains updated:', JSON.stringify(this.fallbackChains));
  }

  /**
   * Get the ordered fallback chain for a composerMode.
   * Filters to only providers that are loaded and have keys, respecting cooldowns.
   */
  private getChainForMode(composerMode: string | undefined, allProviderIds: string[]): string[] {
    const mode = (composerMode || 'default') as keyof FallbackChainConfig;
    const chain = this.fallbackChains[mode] || this.fallbackChains.default;

    // Resolve chain entries to actual provider IDs (handles aliases like 'gemini' → 'google:default')
    const resolved: string[] = [];
    for (const chainEntry of chain) {
      // Exact match
      if (allProviderIds.includes(chainEntry)) {
        resolved.push(chainEntry);
        continue;
      }
      // Alias/prefix match (e.g., 'gemini' matches 'google:default' or 'gemini-pro')
      const alias = this.providerAliases[chainEntry];
      if (alias && allProviderIds.includes(alias)) {
        resolved.push(alias);
        continue;
      }
      // Partial match
      const partial = allProviderIds.find(id =>
        id.toLowerCase().includes(chainEntry) ||
        (alias && id.toLowerCase().includes(alias))
      );
      if (partial) {
        resolved.push(partial);
      }
    }

    // Append any providers not in the chain (so we never miss a valid provider)
    for (const id of allProviderIds) {
      if (!resolved.includes(id)) {
        resolved.push(id);
      }
    }

    return resolved;
  }
}

export const unifiedLLMService = new UnifiedLLMService();
