/**
 * ByzantineDetector: Detects loop, stall, and garbage-output failure modes
 * in autonomous agent sessions. Based on MAST failure taxonomy (2025).
 *
 * 5 signals:
 *   1. Output hash repetition
 *   2. Action n-gram loop (window=6)
 *   3. Stall (same state for >60s)
 *   4. Low token entropy (<3 bits = repetitive garbage)
 *   5. Token explosion (>3x expected max)
 */

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

function computeEntropy(text: string): number {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length < 5) return 10; // not enough data, assume fine
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / tokens.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export class ByzantineDetector {
  private actionHistory: string[] = [];
  private outputHashes: Set<string> = new Set();
  private lastProgressTime: Date = new Date();
  private lastStateSnapshot: string = '';

  /** Signal 1: exact output repetition */
  detectOutputLoop(output: string): boolean {
    const hash = simpleHash(output.slice(0, 200));
    if (this.outputHashes.has(hash)) return true;
    this.outputHashes.add(hash);
    return false;
  }

  /** Signal 2: action n-gram repetition (window = 6) */
  detectActionLoop(newAction: string): boolean {
    this.actionHistory.push(newAction);
    const W = 6;
    if (this.actionHistory.length < W * 2) return false;
    const recent = JSON.stringify(this.actionHistory.slice(-W));
    const prior  = JSON.stringify(this.actionHistory.slice(-W * 2, -W));
    return recent === prior;
  }

  /** Signal 3: no-progress stall (>60s same state) */
  detectStall(currentStateSnapshot: string, thresholdMs = 60_000): boolean {
    if (currentStateSnapshot === this.lastStateSnapshot) {
      return Date.now() - this.lastProgressTime.getTime() > thresholdMs;
    }
    this.lastStateSnapshot = currentStateSnapshot;
    this.lastProgressTime = new Date();
    return false;
  }

  /** Signal 4: low entropy (repetitive garbage — <3 bits) */
  detectLowEntropy(output: string): boolean {
    const tokens = output.split(/\s+/).filter(Boolean);
    if (tokens.length < 20) return false; // not enough data
    return computeEntropy(output) < 3.0;
  }

  /** Signal 5: token explosion (>3× expected max) */
  detectTokenExplosion(tokenCount: number, expectedMax = 2000): boolean {
    return tokenCount > expectedMax * 3;
  }

  reset() {
    this.actionHistory = [];
    this.outputHashes.clear();
    this.lastProgressTime = new Date();
    this.lastStateSnapshot = '';
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitCheckResult {
  ok: boolean;
  reason?: string;
}

/**
 * AgentCircuitBreaker: wraps ByzantineDetector with a state-machine
 * that opens on repeated faults and recovers after a backoff window.
 */
export class AgentCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private readonly THRESHOLD = 3;
  private readonly RESET_MS = 30_000;
  private lastFailureTime?: Date;
  private stepCount = 0;
  private readonly MAX_STEPS: number;
  private detector = new ByzantineDetector();

  constructor(maxSteps = 100) {
    this.MAX_STEPS = maxSteps;
  }

  check(toolName: string, output: string, actionKey: string): CircuitCheckResult {
    this.stepCount++;

    if (this.stepCount > this.MAX_STEPS) {
      return { ok: false, reason: 'BUDGET_EXCEEDED' };
    }

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureTime?.getTime() ?? 0);
      if (elapsed < this.RESET_MS) {
        return { ok: false, reason: 'CIRCUIT_OPEN' };
      }
      this.state = 'HALF_OPEN';
    }

    const checks: [boolean, string][] = [
      [this.detector.detectOutputLoop(output),     'OUTPUT_LOOP'],
      [this.detector.detectActionLoop(actionKey),   'ACTION_LOOP'],
      [this.detector.detectLowEntropy(output),      'LOW_ENTROPY_GARBAGE'],
    ];

    for (const [detected, reason] of checks) {
      if (detected) {
        this.failureCount++;
        this.lastFailureTime = new Date();
        if (this.failureCount >= this.THRESHOLD) {
          this.state = 'OPEN';
        }
        return { ok: false, reason };
      }
    }

    // Success — reset
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') this.state = 'CLOSED';
    return { ok: true };
  }

  getState(): CircuitState { return this.state; }
  getStepCount(): number   { return this.stepCount; }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.stepCount = 0;
    this.lastFailureTime = undefined;
    this.detector.reset();
  }
}
