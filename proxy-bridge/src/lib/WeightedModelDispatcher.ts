import { createModelProfileRegistry, ModelProfileRegistry, ModelProfile, ModelCapability } from './ModelProfileRegistry';
import { UnifiedLLMService } from './UnifiedLLMService';
import { LLMMessage } from './types/llm';

export interface TaskContext {
  type: 'code' | 'reasoning' | 'vision' | 'creative' | 'fast' | 'analysis';
  complexity?: 'low' | 'medium' | 'high';
  preferredCapabilities?: ModelCapability[];
}

export interface ModelDispatchResult {
  profile: ModelProfile;
  providerId: string;
  model: string;
}

export class WeightedModelDispatcher {
  private registry: ModelProfileRegistry;
  private llmService: UnifiedLLMService;
  private complexityCache: Map<string, 'low' | 'medium' | 'high'> = new Map();

  constructor(projectPath: string) {
    this.registry = createModelProfileRegistry(projectPath);
    this.llmService = new UnifiedLLMService();
  }

  async dispatch(context: TaskContext): Promise<ModelDispatchResult> {
    await this.registry.initialize();
    let profile: ModelProfile | undefined;
    const config = await this.registry.getConfig();
    if (config.complexityRouting && !context.preferredCapabilities) {
      const complexity = await this.detectComplexity(context.type);
      context.complexity = complexity;
    }
    if (context.preferredCapabilities && context.preferredCapabilities.length > 0) {
      profile = await this.registry.selectModelByCapability(context.preferredCapabilities);
    } else if (context.complexity) {
      const capabilityMap: Record<string, ModelCapability[]> = {
        low: ['fast'],
        medium: ['code'],
        high: ['reasoning', 'analysis'],
      };
      profile = await this.registry.selectModelByCapability(capabilityMap[context.complexity]);
    } else {
      profile = await this.registry.selectModelByWeight();
    }
    if (!profile) {
      throw new Error('No available model profiles. Please configure at least one model in Model Council settings.');
    }
    return {
      profile,
      providerId: profile.provider,
      model: profile.model,
    };
  }

  async dispatchWithFallback(context: TaskContext): Promise<ModelDispatchResult> {
    let lastError: Error | null = null;
    try {
      return await this.dispatch(context);
    } catch (error: any) {
      lastError = error;
      console.warn(`[ModelDispatcher] Primary model failed: ${error.message}`);
    }
    const fallbackProfiles = await this.registry.getFallbackChain(
      (await this.registry.selectModelByWeight())?.id || ''
    );
    for (const fallbackProfile of fallbackProfiles) {
      try {
        console.log(`[ModelDispatcher] Trying fallback: ${fallbackProfile.name}`);
        return {
          profile: fallbackProfile,
          providerId: fallbackProfile.provider,
          model: fallbackProfile.model,
        };
      } catch (error: any) {
        console.warn(`[ModelDispatcher] Fallback ${fallbackProfile.name} failed: ${error.message}`);
        lastError = error;
      }
    }
    throw lastError || new Error('All model fallbacks exhausted');
  }

  private async detectComplexity(taskType: string): Promise<'low' | 'medium' | 'high'> {
    const cached = this.complexityCache.get(taskType);
    if (cached) return cached;
    const complexityMap: Record<string, 'low' | 'medium' | 'high'> = {
      code: 'medium',
      reasoning: 'high',
      vision: 'high',
      creative: 'medium',
      fast: 'low',
      analysis: 'high',
      'fix-bug': 'low',
      'write-test': 'low',
      'refactor': 'medium',
      'implement-feature': 'high',
      'architect': 'high',
      'review': 'medium',
      'debug': 'medium',
      'optimize': 'high',
      'create-component': 'medium',
      'build-api': 'high',
    };
    const complexity = complexityMap[taskType.toLowerCase()] || 'medium';
    this.complexityCache.set(taskType, complexity);
    return complexity;
  }

  async analyzePromptComplexity(prompt: string): Promise<'low' | 'medium' | 'high'> {
    const lowerPrompt = prompt.toLowerCase();
    const highIndicators = ['architect', 'design system', 'redesign', 'migrate', 'performance', 'security', 'authentication', 'refactor', 'complete application', 'multi-page', 'database', 'api design', 'optimize'];
    const lowIndicators = ['fix', 'bug', 'small', 'simple', 'update', 'add test', 'typo', 'format', 'lint', 'comment'];
    let highScore = 0;
    let lowScore = 0;
    for (const indicator of highIndicators) {
      if (lowerPrompt.includes(indicator)) highScore++;
    }
    for (const indicator of lowIndicators) {
      if (lowerPrompt.includes(indicator)) lowScore++;
    }
    const codeBlockCount = (prompt.match(/```/g) || []).length;
    if (codeBlockCount > 3) highScore += 2;
    if (codeBlockCount > 10) highScore += 3;
    const fileCountMatch = prompt.match(/(\d+)\s+files?/i);
    if (fileCountMatch) {
      const count = parseInt(fileCountMatch[1]);
      if (count > 10) highScore += 3;
      else if (count > 5) highScore += 1;
    }
    if (highScore > lowScore + 2) return 'high';
    if (lowScore > highScore + 1) return 'low';
    return 'medium';
  }

  static getCapabilitiesForWorkerType(workerType: string): ModelCapability[] {
    const workerCapabilityMap: Record<string, ModelCapability[]> = {
      'UI_BEE': ['vision', 'creative'],
      'LOGIC_BEE': ['reasoning', 'code', 'analysis'],
      'TEST_BEE': ['code', 'fast'],
      'ARCHITECT': ['reasoning', 'analysis'],
      'REVIEWER': ['analysis', 'code'],
      'BUILDER': ['code', 'reasoning'],
    };
    return workerCapabilityMap[workerType] || ['code'];
  }
}

export function getModelDispatcher(projectPath: string): WeightedModelDispatcher {
  return new WeightedModelDispatcher(projectPath);
}
