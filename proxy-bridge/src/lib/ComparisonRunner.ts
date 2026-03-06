/**
 * P20-02: Parallel Comparison Mode (Multi-LLM Side-by-Side)
 *
 * Runs the same prompt through multiple LLM providers simultaneously,
 * returning results side-by-side with latency and token metrics.
 *
 * Inspired by Puzld.ai's multi-LLM comparison interface.
 *
 * Integration points:
 *   - /api/compare endpoint
 *   - UnifiedLLMService for provider dispatch
 *   - socket-instance for live streaming results
 */

import { broadcast } from './infrastructure/socket-instance';
import { unifiedLLMService } from './UnifiedLLMService';
import { LLMMessage, LLMProviderOptions } from './types/llm';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface ComparisonResult {
  provider: string;
  response: string;
  latencyMs: number;
  tokenCount: number;
  model?: string;
  error?: string;
}

export interface ComparisonSummary {
  /** All provider results (including failures) */
  results: ComparisonResult[];
  /** Total wall-clock time */
  totalMs: number;
  /** Number of successful responses */
  successCount: number;
  /** Number of failed providers */
  failCount: number;
}

export interface ComparisonOptions {
  /** Max tokens for each provider call */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
  /** System prompt to prepend */
  systemPrompt?: string;
  /** Timeout per provider in ms */
  timeoutMs?: number;
}

/* ─── ComparisonRunner ──────────────────────────────────────────────── */

export class ComparisonRunner {
  /**
   * Run the same prompt across multiple providers in parallel.
   * Returns all results with timing metrics.
   */
  static async compareAcrossProviders(
    prompt: string,
    providers: string[],
    options: ComparisonOptions = {}
  ): Promise<ComparisonSummary> {
    const {
      maxTokens = 2048,
      temperature = 0.7,
      systemPrompt,
      timeoutMs = 30_000,
    } = options;

    const totalStart = Date.now();

    // Build messages
    const messages: LLMMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const llmOptions: LLMProviderOptions = {
      maxTokens,
      temperature,
    };

    // Run all providers in parallel
    const promises = providers.map(async (provider): Promise<ComparisonResult> => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          unifiedLLMService.chat(provider, messages, llmOptions),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);

        const latencyMs = Date.now() - start;
        const content = typeof result === 'string'
          ? result
          : (result as any)?.content || (result as any)?.choices?.[0]?.message?.content || '';
        const tokenCount = (result as any)?.usage?.total_tokens || Math.ceil(content.length / 4);
        const model = (result as any)?.model;

        const compResult: ComparisonResult = {
          provider,
          response: content,
          latencyMs,
          tokenCount,
          model,
        };

        // Emit per-provider result as it completes (for live streaming)
        broadcast('COMPARISON_PROVIDER_RESULT', compResult);

        return compResult;
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        return {
          provider,
          response: '',
          latencyMs,
          tokenCount: 0,
          error: err.message,
        };
      }
    });

    const results = await Promise.allSettled(promises);
    const totalMs = Date.now() - totalStart;

    const comparisonResults: ComparisonResult[] = results.map(r =>
      r.status === 'fulfilled' ? r.value : {
        provider: 'unknown',
        response: '',
        latencyMs: 0,
        tokenCount: 0,
        error: (r as PromiseRejectedResult).reason?.message || 'Unknown error',
      }
    );

    const successCount = comparisonResults.filter(r => !r.error).length;
    const failCount = comparisonResults.filter(r => !!r.error).length;

    const summary: ComparisonSummary = {
      results: comparisonResults,
      totalMs,
      successCount,
      failCount,
    };

    // Emit final comparison result
    broadcast('COMPARISON_RESULT', {
      totalMs,
      successCount,
      failCount,
      providers: comparisonResults.map(r => ({
        provider: r.provider,
        latencyMs: r.latencyMs,
        tokenCount: r.tokenCount,
        model: r.model,
        hasError: !!r.error,
      })),
    });

    return summary;
  }
}
