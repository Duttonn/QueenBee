import { LLMProvider } from './LLMProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { MistralProvider } from './providers/MistralProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { AuthProfileStore } from './auth-profile-store';
import { ConfigManager, ModelConfig } from './config-manager';
import { AuthProfileManager } from './AuthProfileManager';

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
  }
};

const GLOBAL_DEFAULT_PRICE = { input: 0.002, output: 0.002 };

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
  code: ['anthropic', 'openai', 'gemini', 'mistral', 'ollama'],
  chat: ['gemini', 'openai', 'anthropic', 'mistral', 'ollama'],
  plan: ['openai', 'anthropic', 'gemini', 'mistral', 'ollama'],
  default: ['gemini', 'openai', 'anthropic', 'mistral', 'ollama'],
};

export class UnifiedLLMService {
  private providers: Map<string, LLMProvider> = new Map();
  public ready: Promise<void>;
  private usageStats: any[] = [];
  public readonly authProfileManager = new AuthProfileManager();
  private fallbackChains: FallbackChainConfig = { ...DEFAULT_FALLBACK_CHAINS };

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
    'kimi': 'moonshot'
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
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.providers.set('openai', new OpenAIProvider('openai', openaiKey));
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.providers.set('anthropic', new AnthropicProvider(anthropicKey));
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.providers.set('gemini', new GeminiProvider(geminiKey));
    }

    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey) {
      this.providers.set('mistral', new MistralProvider(mistralKey));
    }

    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      this.providers.set('nvidia', new OpenAIProvider('nvidia', nvidiaKey, 'https://integrate.api.nvidia.com/v1'));
    }
  }

  private initFromProfile(profile: any) {
    const key = profile.apiKey || profile.access || profile.token;
    if (!key) return;

    // Use provider ID or custom name
    const id = profile.id || profile.provider;

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

    console.log(`[LLMService] Chat with provider: ${providerId}, model: ${options?.model || 'default'}`);

    try {
      const response = await provider.chat(messages, options);
      this.authProfileManager.markSuccess(providerId);
      this.recordUsage(providerId, response.model || 'unknown', response.usage);
      return response;
    } catch (error: any) {
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
      // Use autoChat logic for stream — find the right provider
      const modelName = options?.model?.toLowerCase() || '';
      let bestId: string | null = null;
      if (modelName.includes('gemini')) bestId = 'gemini';
      else if (modelName.includes('gpt') || modelName.includes('o1-')) bestId = 'openai';
      else if (modelName.includes('claude')) bestId = 'anthropic';
      else if (modelName.includes('mistral')) bestId = 'mistral';

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
      case 'nvidia':
        return new OpenAIProvider('nvidia', apiKey, 'https://integrate.api.nvidia.com/v1');
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
      if (modelName.includes('gpt') || modelName.includes('o1-')) bestProviderId = 'openai';
      else if (modelName.includes('claude')) bestProviderId = 'anthropic';
      else if (modelName.includes('gemini')) bestProviderId = 'gemini';
      else if (modelName.includes('mistral') || modelName.includes('mixtral')) bestProviderId = 'mistral';
      else if (modelName.includes('lama') || modelName.includes('qwen') || modelName.includes('phi')) bestProviderId = 'ollama';

      if (bestProviderId) {
        const p = this.providers.get(bestProviderId);
        if (p) {
          console.log(`[AutoChat] Smart-routed '${modelName}' to provider '${bestProviderId}'`);
          return await p.chat(messages, options);
        }
      }
    }

    // 1. Simple priority list for auto selection
    const priorityTypes = ['gemini', 'google', 'nvidia', 'openai', 'anthropic', 'ollama'];
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
        try {
          console.log(`[AutoChat] Trying provider: ${id}`);
          const response = await provider.chat(messages, options);
          this.authProfileManager.markSuccess(id);
          return response;
        } catch (e: any) {
          const reason = AuthProfileManager.classifyError(e);
          this.authProfileManager.markFailure(id, reason);
            lastError = e;
            console.error(`[AutoChat] Fallback provider '${id}' failed (${reason}): ${e.message}`);
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
