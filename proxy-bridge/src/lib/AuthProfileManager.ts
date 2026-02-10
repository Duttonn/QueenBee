/**
 * AuthProfileManager — Provider rotation & cooldown system (OC-01)
 *
 * Inspired by OpenClaw's auth-profiles/usage.ts pattern.
 * Tracks per-provider failure stats, applies exponential backoff cooldowns,
 * and provides automatic failover to the next available provider.
 */

export type AuthProfileFailureReason = 'auth' | 'rate_limit' | 'billing' | 'timeout' | 'format' | 'connection_error' | 'unknown';

export interface ProfileUsageStats {
  lastUsed?: number;
  cooldownUntil?: number;
  disabledUntil?: number;
  disabledReason?: AuthProfileFailureReason;
  errorCount: number;
  failureCounts: Partial<Record<AuthProfileFailureReason, number>>;
  lastFailureAt?: number;
}

interface CooldownConfig {
  billingBackoffMs: number;
  billingMaxMs: number;
  failureWindowMs: number;
}

const DEFAULT_COOLDOWN_CONFIG: CooldownConfig = {
  billingBackoffMs: 5 * 60 * 60 * 1000,   // 5 hours base for billing
  billingMaxMs: 24 * 60 * 60 * 1000,       // 24 hours max for billing
  failureWindowMs: 24 * 60 * 60 * 1000,    // Reset error count after 24h of no failures
};

export class AuthProfileManager {
  private profiles: Map<string, ProfileUsageStats> = new Map();

  /**
   * Calculate cooldown duration using exponential backoff.
   * Progression: 1min → 5min → 25min → 1h max
   */
  static calculateCooldownMs(errorCount: number): number {
    const normalized = Math.max(1, errorCount);
    return Math.min(
      60 * 60 * 1000, // 1 hour max
      60 * 1000 * Math.pow(5, Math.min(normalized - 1, 3))
    );
  }

  /**
   * Calculate billing-specific disable duration (longer backoff).
   * Uses doubling: base * 2^(errors-1), capped at max.
   */
  private static calculateBillingDisableMs(errorCount: number, baseMs: number, maxMs: number): number {
    const normalized = Math.max(1, errorCount);
    const safeBase = Math.max(60_000, baseMs);
    const safeMax = Math.max(safeBase, maxMs);
    const exponent = Math.min(normalized - 1, 10);
    const raw = safeBase * Math.pow(2, exponent);
    return Math.min(safeMax, raw);
  }

  private getOrCreateStats(providerId: string): ProfileUsageStats {
    let stats = this.profiles.get(providerId);
    if (!stats) {
      stats = { errorCount: 0, failureCounts: {} };
      this.profiles.set(providerId, stats);
    }
    return stats;
  }

  /**
   * Check if a provider is currently in cooldown.
   */
  isInCooldown(providerId: string): boolean {
    const stats = this.profiles.get(providerId);
    if (!stats) return false;

    const now = Date.now();
    const unusableUntil = this.getUnusableUntil(stats);
    return unusableUntil !== null && now < unusableUntil;
  }

  /**
   * Get the timestamp until which a provider is unusable (max of cooldown and disabled).
   */
  private getUnusableUntil(stats: ProfileUsageStats): number | null {
    const values = [stats.cooldownUntil, stats.disabledUntil]
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
    if (values.length === 0) return null;
    return Math.max(...values);
  }

  /**
   * Mark a provider as successfully used. Resets error count and cooldowns.
   */
  markSuccess(providerId: string): void {
    const stats = this.getOrCreateStats(providerId);
    stats.lastUsed = Date.now();
    stats.errorCount = 0;
    stats.cooldownUntil = undefined;
    stats.disabledUntil = undefined;
    stats.disabledReason = undefined;
    stats.failureCounts = {};
  }

  /**
   * Mark a provider as failed. Applies appropriate cooldown based on failure reason.
   */
  markFailure(providerId: string, reason: AuthProfileFailureReason, config?: Partial<CooldownConfig>): void {
    const stats = this.getOrCreateStats(providerId);
    const now = Date.now();
    const cfg = { ...DEFAULT_COOLDOWN_CONFIG, ...config };

    // Check if failure window has expired — reset counters if so
    const windowExpired = typeof stats.lastFailureAt === 'number'
      && stats.lastFailureAt > 0
      && (now - stats.lastFailureAt) > cfg.failureWindowMs;

    if (windowExpired) {
      stats.errorCount = 0;
      stats.failureCounts = {};
    }

    stats.errorCount += 1;
    stats.failureCounts[reason] = (stats.failureCounts[reason] ?? 0) + 1;
    stats.lastFailureAt = now;

    if (reason === 'billing') {
      const billingCount = stats.failureCounts.billing ?? 1;
      const backoffMs = AuthProfileManager.calculateBillingDisableMs(
        billingCount, cfg.billingBackoffMs, cfg.billingMaxMs
      );
      stats.disabledUntil = now + backoffMs;
      stats.disabledReason = 'billing';
    } else {
      const backoffMs = AuthProfileManager.calculateCooldownMs(stats.errorCount);
      stats.cooldownUntil = now + backoffMs;
    }

    console.log(
      `[AuthProfileManager] Provider '${providerId}' failed (${reason}). ` +
      `Error count: ${stats.errorCount}. Cooldown until: ${new Date(stats.cooldownUntil || stats.disabledUntil || 0).toISOString()}`
    );
  }

  /**
   * Get the next available provider from a priority list, skipping those in cooldown.
   * Returns the provider ID or null if all are in cooldown.
   */
  getNextAvailable(preferredId: string, allProviderIds: string[]): string | null {
    // Try preferred first
    if (!this.isInCooldown(preferredId) && allProviderIds.includes(preferredId)) {
      return preferredId;
    }

    // Try others in order
    for (const id of allProviderIds) {
      if (id === preferredId) continue;
      if (!this.isInCooldown(id)) {
        return id;
      }
    }

    // All in cooldown — find the one that expires soonest
    let soonestId: string | null = null;
    let soonestTime = Infinity;
    for (const id of allProviderIds) {
      const stats = this.profiles.get(id);
      if (!stats) return id; // No stats means never failed
      const unusable = this.getUnusableUntil(stats);
      if (unusable !== null && unusable < soonestTime) {
        soonestTime = unusable;
        soonestId = id;
      }
    }

    return soonestId;
  }

  /**
   * Clear cooldown for a provider (manual reset).
   */
  resetProfile(providerId: string): void {
    this.profiles.delete(providerId);
  }

  /**
   * Get stats for a provider (for diagnostics/UI).
   */
  getStats(providerId: string): ProfileUsageStats | undefined {
    return this.profiles.get(providerId);
  }

  /**
   * Get all provider stats (for diagnostics/UI).
   */
  getAllStats(): Record<string, ProfileUsageStats> {
    const result: Record<string, ProfileUsageStats> = {};
    for (const [id, stats] of this.profiles) {
      result[id] = { ...stats };
    }
    return result;
  }

  /**
   * Classify an error into a failure reason by inspecting message/status.
   */
  static classifyError(error: any): AuthProfileFailureReason {
    const message = (error?.message || '').toLowerCase();
    const status = error?.status || error?.statusCode || 0;

    if (status === 401 || status === 403 || message.includes('auth') || message.includes('api key') || message.includes('unauthorized')) {
      return 'auth';
    }
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests') || message.includes('quota')) {
      return 'rate_limit';
    }
    if (status === 402 || message.includes('billing') || message.includes('insufficient') || message.includes('payment') || message.includes('credit')) {
      return 'billing';
    }
    if (message.includes('timeout') || message.includes('timed out') || message.includes('econnaborted') || message.includes('etimeout')) {
      return 'timeout';
    }
    if (status === 400 || message.includes('invalid') || message.includes('format') || message.includes('schema')) {
      return 'format';
    }
    if (message.includes('econnrefused') || message.includes('econnreset') || message.includes('enotfound') || message.includes('enetunreach')) {
      return 'connection_error';
    }
    return 'unknown';
  }
}
