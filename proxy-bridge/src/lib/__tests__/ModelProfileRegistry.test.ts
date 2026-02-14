import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelProfileRegistry, ModelCapability } from '../ModelProfileRegistry';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ModelProfileRegistry', () => {
  const testProjectPath = path.join(os.tmpdir(), 'test-queenbee-model-registry');
  
  beforeEach(async () => {
    await fs.remove(testProjectPath);
  });

  it('should create with default profiles', async () => {
    const registry = new ModelProfileRegistry(testProjectPath);
    await registry.initialize();
    const config = await registry.getConfig();
    
    expect(config.profiles).toHaveLength(4);
    expect(config.totalWeight).toBe(100);
  });

  it('should select model by weight', async () => {
    const registry = new ModelProfileRegistry(testProjectPath);
    await registry.initialize();
    
    const profile = await registry.selectModelByWeight();
    expect(profile).toBeDefined();
    expect(profile?.enabled).toBe(true);
  });

  it('should select model by capability', async () => {
    const registry = new ModelProfileRegistry(testProjectPath);
    await registry.initialize();
    
    const profile = await registry.selectModelByCapability(['reasoning']);
    expect(profile).toBeDefined();
    expect(profile?.capabilities).toContain('reasoning');
  });

  it('should add new profile', async () => {
    const registry = new ModelProfileRegistry(testProjectPath);
    await registry.initialize();
    
    const newProfile = await registry.addProfile({
      name: 'Test Model',
      provider: 'test',
      model: 'test-model',
      capabilities: ['code'],
      costTier: 'low',
      weight: 10,
      enabled: true,
    });
    
    expect(newProfile.id).toBeDefined();
    expect(newProfile.name).toBe('Test Model');
  });

  it('should update profile weight and rebalance', async () => {
    const registry = new ModelProfileRegistry(testProjectPath);
    await registry.initialize();
    
    const profiles = await registry.getProfiles();
    const firstId = profiles[0].id;
    
    await registry.setWeight(firstId, 50);
    
    const updated = await registry.getProfileById(firstId);
    expect(updated?.weight).toBe(50);
  });

  it('should get fallback chain', async () => {
    const registry = new ModelProfileRegistry(testProjectPath);
    await registry.initialize();
    
    const profiles = await registry.getProfiles();
    const fallback = await registry.getFallbackChain(profiles[0].id);
    
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback[0].id).not.toBe(profiles[0].id);
  });

  it('should delete profile', async () => {
    const registry = new ModelProfileRegistry(testProjectPath);
    await registry.initialize();
    
    const profiles = await registry.getProfiles();
    const initialCount = profiles.length;
    
    await registry.deleteProfile(profiles[0].id);
    
    const updated = await registry.getProfiles();
    expect(updated.length).toBe(initialCount - 1);
  });
});
