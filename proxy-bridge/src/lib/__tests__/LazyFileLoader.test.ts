import { describe, it, expect, beforeEach } from 'vitest';
import { LazyFileLoader } from '../LazyFileLoader';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('LazyFileLoader', () => {
  const testProjectPath = path.join(os.tmpdir(), 'test-queenbee-lazy-loader');
  let loader: LazyFileLoader;

  beforeEach(async () => {
    await fs.remove(testProjectPath);
    await fs.ensureDir(testProjectPath);
    loader = new LazyFileLoader(testProjectPath);
  });

  it('should load a file', async () => {
    const testFile = path.join(testProjectPath, 'test.txt');
    await fs.writeFile(testFile, 'Hello World');
    
    const result = await loader.load({ path: testFile });
    
    expect(result.content).toBe('Hello World');
    expect(result.size).toBe(11);
  });

  it('should cache loaded files', async () => {
    const testFile = path.join(testProjectPath, 'test.txt');
    await fs.writeFile(testFile, 'Test content');
    
    await loader.load({ path: testFile });
    const cached = loader.getCached(testFile);
    
    expect(cached).toBeDefined();
    expect(cached?.content).toBe('Test content');
  });

  it('should check if file is cached', async () => {
    const testFile = path.join(testProjectPath, 'test.txt');
    await fs.writeFile(testFile, 'Test');
    
    expect(loader.hasCached(testFile)).toBe(false);
    
    await loader.load({ path: testFile });
    
    expect(loader.hasCached(testFile)).toBe(true);
  });

  it('should invalidate cache', async () => {
    const testFile = path.join(testProjectPath, 'test.txt');
    await fs.writeFile(testFile, 'Original');
    
    await loader.load({ path: testFile });
    expect(loader.hasCached(testFile)).toBe(true);
    
    loader.invalidate(testFile);
    expect(loader.hasCached(testFile)).toBe(false);
  });

  it('should clear cache', async () => {
    const testFile = path.join(testProjectPath, 'test.txt');
    await fs.writeFile(testFile, 'Test');
    
    await loader.load({ path: testFile });
    loader.clearCache();
    
    expect(loader.hasCached(testFile)).toBe(false);
  });

  it('should throw on file too large', async () => {
    const testFile = path.join(testProjectPath, 'large.txt');
    await fs.writeFile(testFile, 'x'.repeat(100));
    
    await expect(loader.load({ path: testFile, maxSize: 50 })).rejects.toThrow('File too large');
  });

  it('should load multiple files', async () => {
    await fs.writeFile(path.join(testProjectPath, 'a.txt'), 'A');
    await fs.writeFile(path.join(testProjectPath, 'b.txt'), 'B');
    
    const results = await loader.loadMultiple([
      { path: path.join(testProjectPath, 'a.txt') },
      { path: path.join(testProjectPath, 'b.txt') },
    ]);
    
    expect(results).toHaveLength(2);
  });

  it('should respect max cache size', async () => {
    const smallLoader = new LazyFileLoader(testProjectPath, { maxCacheSize: 2 });
    
    await fs.writeFile(path.join(testProjectPath, '1.txt'), '1');
    await fs.writeFile(path.join(testProjectPath, '2.txt'), '2');
    await fs.writeFile(path.join(testProjectPath, '3.txt'), '3');
    
    await smallLoader.load({ path: path.join(testProjectPath, '1.txt') });
    await smallLoader.load({ path: path.join(testProjectPath, '2.txt') });
    await smallLoader.load({ path: path.join(testProjectPath, '3.txt') });
    
    expect(smallLoader.getCacheSize()).toBeLessThanOrEqual(2);
  });
});
