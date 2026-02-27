/**
 * P18-C5: SlidingWindowStats — shared sliding window utility
 *
 * Extracted from the two separate implementations in:
 *  - MetacognitivePlanner.ts (20-entry performance history)
 *  - WorkflowOptimizer.ts (UCB1 arm statistics)
 *
 * Provides a type-safe sliding window with configurable size and built-in
 * statistical summary (mean, variance, trend).
 */

export interface WindowStats {
  count: number;
  mean: number;
  variance: number;
  min: number;
  max: number;
  /** Positive = improving trend, negative = declining trend. */
  trend: number;
}

export class SlidingWindowStats<T extends number = number> {
  private window: T[];
  private readonly maxSize: number;

  constructor(maxSize = 20) {
    this.maxSize = maxSize;
    this.window = [];
  }

  /** Add a value to the window. Evicts oldest if at capacity. */
  push(value: T): void {
    this.window.push(value);
    if (this.window.length > this.maxSize) {
      this.window.shift();
    }
  }

  /** Current number of entries. */
  get size(): number {
    return this.window.length;
  }

  /** All entries in insertion order. */
  get entries(): ReadonlyArray<T> {
    return this.window;
  }

  /** Most recent N entries (or all if N > size). */
  recent(n: number): T[] {
    return this.window.slice(-n);
  }

  /** Compute summary statistics over the current window. */
  stats(): WindowStats {
    const n = this.window.length;
    if (n === 0) {
      return { count: 0, mean: 0, variance: 0, min: 0, max: 0, trend: 0 };
    }

    const mean = this.window.reduce((s, v) => s + v, 0) / n;
    const variance = this.window.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    const min = Math.min(...this.window);
    const max = Math.max(...this.window);

    // Trend: linear regression slope over the last min(10, n) entries
    const recent = this.window.slice(-Math.min(10, n));
    let trend = 0;
    if (recent.length >= 2) {
      const m = recent.length;
      const sumX = (m * (m - 1)) / 2;
      const sumX2 = (m * (m - 1) * (2 * m - 1)) / 6;
      const sumY = recent.reduce((s, v) => s + v, 0);
      const sumXY = recent.reduce((s, v, i) => s + i * v, 0);
      const denom = m * sumX2 - sumX * sumX;
      trend = denom !== 0 ? (m * sumXY - sumX * sumY) / denom : 0;
    }

    return { count: n, mean, variance, min, max, trend };
  }

  /** Returns true if the recent trend is improving (positive slope). */
  isImproving(): boolean {
    return this.stats().trend > 0;
  }

  /** Serialize to plain array for persistence. */
  toJSON(): T[] {
    return [...this.window];
  }

  /** Restore from a plain array. */
  static fromArray<T extends number>(arr: T[], maxSize = 20): SlidingWindowStats<T> {
    const w = new SlidingWindowStats<T>(maxSize);
    w.window = arr.slice(-maxSize);
    return w;
  }

  /** Clear the window. */
  clear(): void {
    this.window = [];
  }
}
