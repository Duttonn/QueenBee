import fs from 'fs-extra';
import path from 'path';

export interface FileLoadRequest {
  path: string;
  encoding?: BufferEncoding;
  maxSize?: number;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  loadedAt: string;
}

export class LazyFileLoader {
  private cache: Map<string, FileContent> = new Map();
  private maxCacheSize: number;
  private projectPath: string;

  constructor(projectPath: string, options?: { maxCacheSize?: number }) {
    this.projectPath = projectPath;
    this.maxCacheSize = options?.maxCacheSize || 50;
  }

  async load(request: FileLoadRequest): Promise<FileContent> {
    const cacheKey = this.getCacheKey(request.path);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const resolvedPath = path.isAbsolute(request.path) ? request.path : path.join(this.projectPath, request.path);
    const stats = await fs.stat(resolvedPath);
    if (request.maxSize && stats.size > request.maxSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${request.maxSize})`);
    }
    const content = await fs.readFile(resolvedPath, request.encoding || 'utf-8');
    const fileContent: FileContent = {
      path: resolvedPath,
      content,
      size: stats.size,
      loadedAt: new Date().toISOString(),
    };
    this.addToCache(cacheKey, fileContent);
    return fileContent;
  }

  async loadMultiple(requests: FileLoadRequest[]): Promise<FileContent[]> {
    return Promise.all(requests.map(req => this.load(req)));
  }

  async loadDirectory(dirPath: string, extensions?: string[]): Promise<FileContent[]> {
    const resolvedPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.projectPath, dirPath);
    const files: string[] = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    };
    await walk(resolvedPath);
    return this.loadMultiple(files.map(f => ({ path: f })));
  }

  private getCacheKey(filePath: string): string {
    return path.normalize(filePath);
  }

  private addToCache(key: string, content: FileContent): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, content);
  }

  getCached(path: string): FileContent | undefined {
    return this.cache.get(this.getCacheKey(path));
  }

  hasCached(path: string): boolean {
    return this.cache.has(this.getCacheKey(path));
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidate(path: string): void {
    this.cache.delete(this.getCacheKey(path));
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0,
    };
  }
}

export function createLazyFileLoader(projectPath: string, options?: { maxCacheSize?: number }): LazyFileLoader {
  return new LazyFileLoader(projectPath, options);
}
