import { describe, it, expect, beforeEach } from 'vitest';
import { WeightedModelDispatcher } from '../WeightedModelDispatcher';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('WeightedModelDispatcher', () => {
  const testProjectPath = path.join(os.tmpdir(), 'test-queenbee-dispatcher');
  let dispatcher: WeightedModelDispatcher;

  beforeEach(async () => {
    await fs.remove(testProjectPath);
    await fs.ensureDir(testProjectPath);
    dispatcher = new WeightedModelDispatcher(testProjectPath);
  });

  it('should dispatch with default weight selection', async () => {
    const result = await dispatcher.dispatch({ type: 'code' });
    
    expect(result.profile).toBeDefined();
    expect(result.providerId).toBeDefined();
    expect(result.model).toBeDefined();
  });

  it('should dispatch with capability preference', async () => {
    const result = await dispatcher.dispatch({ 
      type: 'code', 
      preferredCapabilities: ['reasoning'] 
    });
    
    expect(result.profile.capabilities).toContain('reasoning');
  });

  it('should dispatch with complexity', async () => {
    const result = await dispatcher.dispatch({ 
      type: 'code', 
      complexity: 'high' 
    });
    
    expect(result.profile).toBeDefined();
  });

  it('should analyze prompt complexity', async () => {
    const lowComplexity = await dispatcher.analyzePromptComplexity('fix this typo');
    expect(lowComplexity).toBe('low');
    
    const highComplexity = await dispatcher.analyzePromptComplexity('architect a complete application with database and api design');
    expect(highComplexity).toBe('high');
  });

  it('should get capabilities for worker types', async () => {
    const uiCapabilities = WeightedModelDispatcher.getCapabilitiesForWorkerType('UI_BEE');
    expect(uiCapabilities).toContain('vision');
    expect(uiCapabilities).toContain('creative');
    
    const logicCapabilities = WeightedModelDispatcher.getCapabilitiesForWorkerType('LOGIC_BEE');
    expect(logicCapabilities).toContain('reasoning');
    expect(logicCapabilities).toContain('code');
  });
});
