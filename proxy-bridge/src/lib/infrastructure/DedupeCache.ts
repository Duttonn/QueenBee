/**
 * DedupeCache (OP-05)
 *
 * In-memory cache with TTL and LRU eviction for deduplicating socket events.
 * Prevents duplicate UI updates and double tool executions in multi-agent swarms.
 */

interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

export class DedupeCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs: number = 30000, maxSize: number = 1000) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get a cached value (returns undefined if expired or missing).
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Set a value in the cache. Auto-prunes expired entries and evicts LRU if needed.
   */
  set(key: string, value: T): void {
    // Auto-prune expired entries
    this.prune();

    // LRU eviction: if at max capacity, delete oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    // Delete and re-insert to maintain insertion order (Map preserves insertion order)
    this.cache.delete(key);
    this.cache.set(key, { value, createdAt: Date.now() });
  }

  /**
   * Remove expired entries.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.ttlMs) {
        this.cache.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Current cache size (including possibly expired entries).
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
  }
}
