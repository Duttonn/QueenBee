import { LLMProvider } from './LLMProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { MistralProvider } from './providers/MistralProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { AuthProfileStore } from './auth-profile-store';
import { ConfigManager, ModelConfig } from './config-manager';

export class UnifiedLLMService {
  private providers: Map<string, LLMProvider> = new Map();
  public ready: Promise<void>;

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

    // 4. Defaults / Locals
    if (!this.providers.has('ollama')) {
      this.providers.set('ollama', new OpenAIProvider('ollama', '', 'http://127.0.0.1:11434/v1'));
    }
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

    // 1. Try to find the provider, reloading if necessary
    let provider = await this.getOrLoadProvider(providerId, options);

    // 2. If not found and it's 'auto', use autoChat
    if (!provider && providerId === 'auto') {
      return this.autoChat(messages, options);
    }

    // 3. Last resort fallback
    if (!provider) {
      console.warn(`[LLMService] Provider '${providerId}' not found. Attempting 'last resort' fallback to any configured provider...`);
      const firstAvailable = Array.from(this.providers.entries())[0];
      if (firstAvailable) {
        console.log(`[LLMService] Falling back to provider: ${firstAvailable[0]}`);
        provider = firstAvailable[1];
      }
    }

    if (!provider) {
      throw new Error(`No AI providers configured. Please add an API key or login in Settings. Available: ${Array.from(this.providers.keys()).join(', ') || 'none'}`);
    }

    // Safety: If the requested model is clearly for another provider, don't pass it
    const safeOptions = { ...options };
    const requestedModel = options?.model?.toLowerCase() || '';

    if (requestedModel.includes('gemini') && provider.id !== 'gemini' && !provider.id.includes('google')) {
      safeOptions.model = undefined; // Let the provider use its own default
    } else if (requestedModel.includes('gpt') && provider.id !== 'openai') {
      safeOptions.model = undefined;
    } else if (requestedModel.includes('claude') && provider.id !== 'anthropic') {
      safeOptions.model = undefined;
    }

    return await provider.chat(messages, safeOptions);
  }

  async *chatStream(providerId: string, messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    await this.ready;

    let provider = await this.getOrLoadProvider(providerId, options);

    if (!provider && providerId === 'auto') {
      // For auto mode in streaming, we'll use the first available provider from priority list
      const priority = ['gemini', 'nvidia', 'ollama'];
      for (const id of priority) {
        provider = this.providers.get(id);
        if (provider) break;
      }
    }

    if (!provider) {
      const firstAvailable = Array.from(this.providers.entries())[0];
      if (firstAvailable) {
        provider = firstAvailable[1];
      }
    }

    if (!provider) {
      throw new Error(`No AI providers configured.`);
    }

    const safeOptions = { ...options };
    const requestedModel = options?.model?.toLowerCase() || '';
    if (requestedModel.includes('gemini') && provider.id !== 'gemini' && !provider.id.includes('google')) {
      safeOptions.model = undefined;
    } else if (requestedModel.includes('gpt') && provider.id !== 'openai') {
      safeOptions.model = undefined;
    }

    if (provider.chatStream) {
      yield* provider.chatStream(messages, safeOptions);
    } else {
      const response = await provider.chat(messages, safeOptions);
      yield response;
    }
  }

  async transcribe(providerId: string, audioBlob: any, options?: { apiKey?: string | null }): Promise<{ text: string }> {
    await this.ready;
    
    let provider = await this.getOrLoadProvider(providerId, { apiKey: options?.apiKey || undefined });

    if (!provider || !(provider as any).transcribe) {
      // Fallback to openai if requested not found or doesn't support transcribe
      provider = this.providers.get('openai');
    }

    if (provider && (provider as any).transcribe) {
      const text = await (provider as any).transcribe(audioBlob);
      return { text };
    }

    throw new Error('No transcription provider available. Please configure OpenAI.');
  }

  private async getOrLoadProvider(providerId: string, options?: LLMProviderOptions): Promise<LLMProvider | undefined> {
    // 1. Check existing providers
    let provider = this.providers.get(providerId);
    if (provider) return provider;

    // 2. Try alias lookup
    const alias = this.providerAliases[providerId];
    if (alias) {
      provider = this.providers.get(alias);
      if (provider) return provider;
    }

    // 3. If an apiKey is passed, create a temporary provider
    if (options?.apiKey) {
      console.log(`[LLMService] Creating temporary provider for '${providerId}' using provided API key.`);
      const type = alias || providerId;
      const newProvider = this.createProviderByType(type, options.apiKey);
      if (newProvider) return newProvider;
    }

    // 4. Try to load from store (in case it was added after startup)
    console.log(`[LLMService] Provider '${providerId}' not found in memory, checking AuthProfileStore...`);
    const profiles = await AuthProfileStore.listProfiles();
    for (const profile of profiles) {
      const pId = profile.id || profile.provider;
      if (pId === providerId || pId === alias || profile.provider === providerId || profile.provider === alias) {
        console.log(`[LLMService] Found matching profile in store: ${pId}. Loading into memory.`);
        this.initFromProfile(profile);
        return this.providers.get(pId);
      }
    }

    // 5. Try pattern match in memory
    for (const [id, p] of this.providers.entries()) {
      if (id.startsWith(`${providerId}:`) || (alias && id.startsWith(`${alias}:`))) {
        return p;
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
    const priority = ['gemini', 'nvidia', 'openai', 'anthropic', 'ollama'];
    let lastError: Error | null = null;

    for (const id of priority) {
      const provider = this.providers.get(id);
      if (provider) {
        try {
          console.log(`[AutoChat] Trying provider: ${id}`);
          return await provider.chat(messages, options);
        } catch (e: any) {
          lastError = e;
          console.warn(`[AutoChat] Fallback: ${id} failed:`, e.message);
        }
      } else {
        // console.log(`[AutoChat] Provider ${id} not configured, skipping.`);
      }
    }

    throw lastError || new Error('No providers available for auto-chat. Please configure at least one provider in Settings.');
  }

  addProvider(provider: LLMProvider) {
    this.providers.set(provider.id, provider);
  }
}

export const unifiedLLMService = new UnifiedLLMService();
