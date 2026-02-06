import { LLMProvider } from './LLMProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { MistralProvider } from './providers/MistralProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';
import { AuthProfileStore } from './auth-profile-store';

export class UnifiedLLMService {
  private providers: Map<string, LLMProvider> = new Map();
  public ready: Promise<void>;

  constructor() {
    this.ready = this.initializeProviders();
  }

  private async initializeProviders() {
    const profiles = await AuthProfileStore.listProfiles();
    
    // 1. Initialize from Environment Variables (Priority)
    this.initFromEnv();

    // 2. Initialize from Stored Profiles
    for (const profile of profiles) {
      this.initFromProfile(profile);
    }

    // 3. Defaults / Locals
    if (!this.providers.has('ollama')) {
        this.providers.set('ollama', new OpenAIProvider('ollama', '', 'http://localhost:11434/v1'));
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

    if (this.providers.has(profile.provider)) return; // Don't override ENV

    switch (profile.provider) {
      case 'openai':
        this.providers.set('openai', new OpenAIProvider('openai', key));
        break;
      case 'anthropic':
        this.providers.set('anthropic', new AnthropicProvider(key));
        break;
      case 'google':
      case 'gemini':
        this.providers.set('gemini', new GeminiProvider(key));
        break;
      case 'mistral':
        this.providers.set('mistral', new MistralProvider(key));
        break;
    }
  }

  async chat(providerId: string, messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    await this.ready;
    const provider = this.providers.get(providerId);
    if (!provider) {
      // Fallback to auto-selection or error
      if (providerId === 'auto') {
        return this.autoChat(messages, options);
      }
      throw new Error(`Provider ${providerId} not found or not configured.`);
    }

    return await provider.chat(messages, options);
  }

  private async autoChat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    await this.ready;
    // Simple priority list for auto selection
    const priority = ['nvidia', 'gemini', 'ollama'];
    let lastError: Error | null = null;

    for (const id of priority) {
      const provider = this.providers.get(id);
      if (provider) {
        try {
          return await provider.chat(messages, options);
        } catch (e: any) {
          lastError = e;
          console.warn(`Auto-chat fallback: ${id} failed, trying next...`, e.message);
        }
      }
    }

    throw lastError || new Error('No providers available for auto-chat.');
  }

  addProvider(provider: LLMProvider) {
    this.providers.set(provider.id, provider);
  }
}

export const unifiedLLMService = new UnifiedLLMService();
