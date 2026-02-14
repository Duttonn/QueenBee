import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { v4 as uuidv4 } from 'uuid';

export type ModelCapability = 'reasoning' | 'code' | 'fast' | 'vision' | 'creative' | 'analysis';
export type CostTier = 'low' | 'medium' | 'high';

export interface ModelProfile {
  id: string;
  name: string;
  provider: string;
  model: string;
  capabilities: ModelCapability[];
  costTier: CostTier;
  weight: number;
  enabled: boolean;
  apiKeyRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelCouncilConfig {
  profiles: ModelProfile[];
  totalWeight: number;
  fallbackEnabled: boolean;
  complexityRouting: boolean;
}

const DEFAULT_PROFILES: ModelProfile[] = [
  {
    id: 'default-reasoning',
    name: 'Opus 4.6',
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    capabilities: ['reasoning', 'code', 'analysis'],
    costTier: 'high',
    weight: 40,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-gemini',
    name: 'Gemini 2 Pro',
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    capabilities: ['reasoning', 'vision', 'creative'],
    costTier: 'medium',
    weight: 20,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-codex',
    name: 'GPT-5 Codex',
    provider: 'openai',
    model: 'gpt-4o',
    capabilities: ['code', 'fast'],
    costTier: 'medium',
    weight: 10,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-haiku',
    name: 'Claude Haiku',
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    capabilities: ['fast'],
    costTier: 'low',
    weight: 30,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_CONFIG: ModelCouncilConfig = {
  profiles: DEFAULT_PROFILES,
  totalWeight: 100,
  fallbackEnabled: true,
  complexityRouting: false,
};

export class ModelProfileRegistry {
  private configDir: string;
  private filePath: string;
  private config: ModelCouncilConfig;

  constructor(projectPath: string) {
    this.configDir = Paths.getProjectConfigDir(projectPath);
    this.filePath = path.join(this.configDir, 'model-council.json');
    this.config = { ...DEFAULT_CONFIG };
  }

  private async ensureInitialized(): Promise<void> {
    await fs.ensureDir(this.configDir);
    if (!(await fs.pathExists(this.filePath))) {
      await this.save();
    } else {
      await this.load();
    }
  }

  private async load(): Promise<void> {
    try {
      const data = await fs.readJson(this.filePath);
      this.config = { ...DEFAULT_CONFIG, ...data };
    } catch (error) {
      console.error('[ModelProfileRegistry] Failed to load config, using defaults:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  private async save(): Promise<void> {
    await fs.writeJson(this.filePath, this.config, { spaces: 2 });
  }

  async initialize(): Promise<void> {
    await this.ensureInitialized();
  }

  async getConfig(): Promise<ModelCouncilConfig> {
    await this.ensureInitialized();
    return this.config;
  }

  async getProfiles(): Promise<ModelProfile[]> {
    await this.ensureInitialized();
    return this.config.profiles.filter(p => p.enabled);
  }

  async getProfileById(id: string): Promise<ModelProfile | undefined> {
    await this.ensureInitialized();
    return this.config.profiles.find(p => p.id === id);
  }

  async addProfile(profile: Omit<ModelProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelProfile> {
    await this.ensureInitialized();
    const newProfile: ModelProfile = {
      ...profile,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.config.profiles.push(newProfile);
    await this.rebalanceWeights();
    await this.save();
    return newProfile;
  }

  async updateProfile(id: string, updates: Partial<ModelProfile>): Promise<ModelProfile | undefined> {
    await this.ensureInitialized();
    const index = this.config.profiles.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    this.config.profiles[index] = {
      ...this.config.profiles[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.rebalanceWeights();
    await this.save();
    return this.config.profiles[index];
  }

  async deleteProfile(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const index = this.config.profiles.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.config.profiles.splice(index, 1);
    await this.rebalanceWeights();
    await this.save();
    return true;
  }

  async setWeight(id: string, weight: number): Promise<void> {
    await this.ensureInitialized();
    const profile = this.config.profiles.find(p => p.id === id);
    if (!profile) return;
    profile.weight = Math.max(0, Math.min(100, weight));
    profile.updatedAt = new Date().toISOString();
    const otherProfiles = this.config.profiles.filter(p => p.id !== id && p.enabled);
    const remainingWeight = 100 - profile.weight;
    const otherTotalWeight = otherProfiles.reduce((sum, p) => sum + p.weight, 0);
    for (const other of otherProfiles) {
      if (otherTotalWeight > 0) {
        other.weight = Math.round((other.weight / otherTotalWeight) * remainingWeight);
      } else {
        other.weight = Math.round(remainingWeight / otherProfiles.length);
      }
    }
    await this.save();
  }

  private async rebalanceWeights(): Promise<void> {
    const enabledProfiles = this.config.profiles.filter(p => p.enabled);
    const totalEnabled = enabledProfiles.reduce((sum, p) => sum + p.weight, 0);
    if (totalEnabled !== 100 && enabledProfiles.length > 0) {
      for (const profile of enabledProfiles) {
        profile.weight = Math.round((profile.weight / totalEnabled) * 100);
      }
    }
    this.config.totalWeight = this.config.profiles.filter(p => p.enabled).reduce((sum, p) => sum + p.weight, 0);
  }

  async setComplexityRouting(enabled: boolean): Promise<void> {
    await this.ensureInitialized();
    this.config.complexityRouting = enabled;
    await this.save();
  }

  async setFallbackEnabled(enabled: boolean): Promise<void> {
    await this.ensureInitialized();
    this.config.fallbackEnabled = enabled;
    await this.save();
  }

  async selectModelByWeight(): Promise<ModelProfile | undefined> {
    await this.ensureInitialized();
    const enabledProfiles = this.config.profiles.filter(p => p.enabled);
    if (enabledProfiles.length === 0) return undefined;
    const totalWeight = enabledProfiles.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    for (const profile of enabledProfiles) {
      random -= profile.weight;
      if (random <= 0) return profile;
    }
    return enabledProfiles[enabledProfiles.length - 1];
  }

  async selectModelByCapability(required: ModelCapability[]): Promise<ModelProfile | undefined> {
    await this.ensureInitialized();
    const enabledProfiles = this.config.profiles.filter(p => p.enabled && required.some(cap => p.capabilities.includes(cap)));
    if (enabledProfiles.length === 0) return this.selectModelByWeight();
    const totalScore = enabledProfiles.reduce((sum, p) => {
      const matchCount = required.filter(cap => p.capabilities.includes(cap)).length;
      return sum + (p.weight * matchCount);
    }, 0);
    let random = Math.random() * totalScore;
    for (const profile of enabledProfiles) {
      const matchCount = required.filter(cap => profile.capabilities.includes(cap)).length;
      random -= (profile.weight * matchCount);
      if (random <= 0) return profile;
    }
    return enabledProfiles[0];
  }

  async getFallbackChain(failedModelId: string): Promise<ModelProfile[]> {
    await this.ensureInitialized();
    if (!this.config.fallbackEnabled) return [];
    return this.config.profiles.filter(p => p.enabled && p.id !== failedModelId).sort((a, b) => b.weight - a.weight);
  }
}

export const createModelProfileRegistry = (projectPath: string) => new ModelProfileRegistry(projectPath);
