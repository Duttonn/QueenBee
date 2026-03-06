/**
 * P21-01: Circuit Breaker for LLM Providers
 *
 * Prevents hammering failing providers. After N consecutive failures,
 * the circuit "trips" (opens) and rejects requests immediately for a
 * cooldown period. After cooldown, allows a single probe request (half-open).
 * If the probe succeeds, the circuit closes (healthy). If it fails, re-opens.
 *
 * Inspired by MassGen's circuit breaker patterns and Netflix Hystrix.
 *
 * Integration:
 *   - UnifiedLLMService.ts: wrap provider.chat() calls with breaker.call()
 *   - DiagnosticCollector.ts: expose breaker state in health snapshot
 *   - socket-instance.ts: emits CIRCUIT_BREAKER_STATE_CHANGE events
 */

import { broadcast } from './infrastructure/socket-instance';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Failures before tripping (default: 5) */
  failureThreshold: number;
  /** Cooldown before probing in ms (default: 30s) */
  cooldownMs: number;
  /** Sliding window for failure counting in ms (default: 60s) */
  windowMs: number;
  /** Max concurrent half-open probes (default: 1) */
  halfOpenMax: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  trippedAt: number | null;
  totalTrips: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  windowMs: 60_000,
  halfOpenMax: 1,
};

/* ─── CircuitBreaker ────────────────────────────────────────────────── */

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: Array<{ timestamp: number; error: string }> = [];
  private successes = 0;
  private lastFailureAt: number | null = null;
  private lastSuccessAt: number | null = null;
  private trippedAt: number | null = null;
  private totalTrips = 0;
  private halfOpenInFlight = 0;
  private config: CircuitBreakerConfig;
  readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Get current state. */
  getState(): CircuitState {
    // Check if open circuit has cooled down
    if (this.state === 'open' && this.trippedAt) {
      if (Date.now() - this.trippedAt >= this.config.cooldownMs) {
        this.transitionTo('half-open');
      }
    }
    return this.state;
  }

  /** Get stats for diagnostics. */
  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failures: this.getRecentFailureCount(),
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      trippedAt: this.trippedAt,
      totalTrips: this.totalTrips,
    };
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws CircuitOpenError if the circuit is open.
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'open') {
      throw new CircuitOpenError(this.name, this.trippedAt!, this.config.cooldownMs);
    }

    if (currentState === 'half-open') {
      if (this.halfOpenInFlight >= this.config.halfOpenMax) {
        throw new CircuitOpenError(this.name, this.trippedAt!, this.config.cooldownMs);
      }
      this.halfOpenInFlight++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure(error.message || 'Unknown error');
      throw error;
    } finally {
      if (currentState === 'half-open') {
        this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
      }
    }
  }

  /**
   * Check if a request would be allowed (without executing).
   */
  isAllowed(): boolean {
    const state = this.getState();
    if (state === 'closed') return true;
    if (state === 'half-open') return this.halfOpenInFlight < this.config.halfOpenMax;
    return false;
  }

  /** Manually reset the circuit to closed. */
  reset(): void {
    this.transitionTo('closed');
    this.failures = [];
    this.halfOpenInFlight = 0;
  }

  /* ─── Internal ────────────────────────────────────────────────── */

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessAt = Date.now();

    if (this.state === 'half-open') {
      // Probe succeeded — close the circuit
      this.transitionTo('closed');
      this.failures = [];
    }
  }

  private onFailure(errorMessage: string): void {
    const now = Date.now();
    this.failures.push({ timestamp: now, error: errorMessage });
    this.lastFailureAt = now;

    // Prune old failures outside the window
    this.pruneOldFailures();

    if (this.state === 'half-open') {
      // Probe failed — re-open
      this.transitionTo('open');
      return;
    }

    if (this.state === 'closed') {
      if (this.getRecentFailureCount() >= this.config.failureThreshold) {
        this.transitionTo('open');
      }
    }
  }

  private pruneOldFailures(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.failures = this.failures.filter(f => f.timestamp >= cutoff);
  }

  private getRecentFailureCount(): number {
    this.pruneOldFailures();
    return this.failures.length;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) return;

    this.state = newState;

    if (newState === 'open') {
      this.trippedAt = Date.now();
      this.totalTrips++;
    }

    console.log(`[CircuitBreaker:${this.name}] ${oldState} → ${newState} (failures: ${this.getRecentFailureCount()}, trips: ${this.totalTrips})`);

    broadcast('CIRCUIT_BREAKER_STATE_CHANGE', {
      provider: this.name,
      oldState,
      newState,
      failures: this.getRecentFailureCount(),
      totalTrips: this.totalTrips,
      trippedAt: this.trippedAt,
    });
  }
}

/* ─── Error Type ────────────────────────────────────────────────────── */

export class CircuitOpenError extends Error {
  readonly provider: string;
  readonly trippedAt: number;
  readonly cooldownMs: number;
  readonly retryAfterMs: number;

  constructor(provider: string, trippedAt: number, cooldownMs: number) {
    const retryAfterMs = Math.max(0, cooldownMs - (Date.now() - trippedAt));
    super(`Circuit breaker open for provider '${provider}'. Retry after ${Math.round(retryAfterMs / 1000)}s.`);
    this.provider = provider;
    this.trippedAt = trippedAt;
    this.cooldownMs = cooldownMs;
    this.retryAfterMs = retryAfterMs;
  }
}

/* ─── Registry ──────────────────────────────────────────────────────── */

const breakers = new Map<string, CircuitBreaker>();

/** Get or create a circuit breaker for a provider. */
export function getCircuitBreaker(provider: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!breakers.has(provider)) {
    breakers.set(provider, new CircuitBreaker(provider, config));
  }
  return breakers.get(provider)!;
}

/** Get all circuit breaker states (for diagnostics). */
export function getAllBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};
  for (const [name, breaker] of breakers) {
    stats[name] = breaker.getStats();
  }
  return stats;
}

/** Reset a specific breaker (for manual recovery). */
export function resetBreaker(provider: string): boolean {
  const breaker = breakers.get(provider);
  if (breaker) {
    breaker.reset();
    return true;
  }
  return false;
}
