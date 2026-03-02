/**
 * P22-03: Lifecycle Phase Hooks
 *
 * Configurable pre/post hooks for AutonomousRunner state transitions.
 * Users define hooks in .queenbee/lifecycle-hooks.yaml. Hooks can:
 *   - Run shell commands (e.g., custom linting before APPROVED)
 *   - Emit events (for TriggerEngine to react to)
 *   - Block transitions (if hook returns non-zero exit code)
 *
 * Inspired by Maestro's lifecycle enforcement hooks.
 *
 * Integration:
 *   - AutonomousRunner.ts: call runHooks() in transitionState()
 *   - .queenbee/lifecycle-hooks.yaml: user configuration
 *   - socket-instance.ts: emits LIFECYCLE_HOOK_* events
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { broadcast } from './socket-instance';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type HookTiming = 'pre' | 'post';

export interface LifecycleHook {
  /** State transition this hook fires on */
  state: string;
  /** Pre or post transition */
  timing: HookTiming;
  /** Shell command to execute */
  command?: string;
  /** Event to emit (for TriggerEngine) */
  emitEvent?: string;
  /** Whether failure blocks the transition (default: false for post, true for pre) */
  blocking?: boolean;
  /** Timeout in ms (default: 30s) */
  timeoutMs?: number;
  /** Human description */
  description?: string;
}

export interface HookResult {
  hook: LifecycleHook;
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
}

/* ─── LifecycleHookManager ──────────────────────────────────────────── */

export class LifecycleHookManager {
  private hooks: LifecycleHook[] = [];
  private projectPath: string;
  private loaded = false;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Load hooks from .queenbee/lifecycle-hooks.yaml.
   */
  async load(): Promise<void> {
    const hookFile = path.join(this.projectPath, '.queenbee', 'lifecycle-hooks.yaml');

    if (!(await fs.pathExists(hookFile))) {
      this.hooks = [];
      this.loaded = true;
      return;
    }

    try {
      const content = await fs.readFile(hookFile, 'utf-8');
      const parsed = yaml.load(content) as LifecycleHook[] | null;

      if (Array.isArray(parsed)) {
        this.hooks = parsed.filter(h => h.state && h.timing);
        console.log(`[LifecycleHooks] Loaded ${this.hooks.length} hooks.`);
      }
    } catch (err: any) {
      console.warn(`[LifecycleHooks] Failed to load hooks: ${err.message}`);
    }

    this.loaded = true;
  }

  /**
   * Run all hooks for a given state and timing.
   * Returns true if all blocking hooks passed.
   */
  async runHooks(state: string, timing: HookTiming, context: Record<string, string> = {}): Promise<{ passed: boolean; results: HookResult[] }> {
    if (!this.loaded) await this.load();

    const matching = this.hooks.filter(h =>
      h.state.toLowerCase() === state.toLowerCase() && h.timing === timing
    );

    if (matching.length === 0) return { passed: true, results: [] };

    const results: HookResult[] = [];
    let allPassed = true;

    for (const hook of matching) {
      const result = await this.executeHook(hook, context);
      results.push(result);

      const isBlocking = hook.blocking ?? (timing === 'pre');
      if (!result.success && isBlocking) {
        allPassed = false;
        console.warn(`[LifecycleHooks] Blocking hook failed for ${timing}:${state}: ${result.error}`);
      }
    }

    return { passed: allPassed, results };
  }

  /**
   * Execute a single hook.
   */
  private async executeHook(hook: LifecycleHook, context: Record<string, string>): Promise<HookResult> {
    const start = Date.now();

    // Emit event if specified
    if (hook.emitEvent) {
      broadcast(hook.emitEvent, {
        state: hook.state,
        timing: hook.timing,
        description: hook.description,
        ...context,
      });
    }

    // Run command if specified
    if (hook.command) {
      try {
        const timeout = hook.timeoutMs || 30_000;

        // Inject context as environment variables
        const env = {
          ...process.env,
          QB_STATE: hook.state,
          QB_TIMING: hook.timing,
          QB_PROJECT: this.projectPath,
          ...Object.fromEntries(
            Object.entries(context).map(([k, v]) => [`QB_${k.toUpperCase()}`, v])
          ),
        };

        const output = execSync(hook.command, {
          cwd: this.projectPath,
          timeout,
          encoding: 'utf-8',
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        broadcast('LIFECYCLE_HOOK_RESULT', {
          state: hook.state,
          timing: hook.timing,
          success: true,
          durationMs: Date.now() - start,
        });

        return { hook, success: true, output: output.trim(), durationMs: Date.now() - start };
      } catch (err: any) {
        const error = err.stderr?.toString()?.trim() || err.message;

        broadcast('LIFECYCLE_HOOK_RESULT', {
          state: hook.state,
          timing: hook.timing,
          success: false,
          error,
          durationMs: Date.now() - start,
        });

        return { hook, success: false, error, durationMs: Date.now() - start };
      }
    }

    // Event-only hook — always succeeds
    return { hook, success: true, durationMs: Date.now() - start };
  }

  /** Get all loaded hooks. */
  getHooks(): LifecycleHook[] {
    return [...this.hooks];
  }

  /** Reload hooks from disk. */
  async reload(): Promise<void> {
    this.loaded = false;
    await this.load();
  }
}
