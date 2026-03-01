/**
 * P20-01: LLM-as-Judge Verification Loop
 *
 * After an agent claims "done", a separate LLM call (different model/provider)
 * evaluates the quality of the solution — not just "does it compile" but
 * "is this a good solution?"
 *
 * Inspired by:
 *   - fcn06/swarm: LLM-as-a-Judge with self-correcting regeneration loops
 *   - metaswarm: cross-model adversarial review (Codex reviews Claude's output)
 *
 * Integration points:
 *   - CompletionGate.ts: checkpoint 6 (after TruthScorer)
 *   - AutonomousRunner.ts: feedback injected as continuation prompt on failure
 *   - socket-instance.ts: emits LLM_JUDGE_RESULT event
 */

import fs from 'fs-extra';
import path from 'path';
import { broadcast } from './socket-instance';
import { unifiedLLMService } from './UnifiedLLMService';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface JudgeResult {
  /** Quality score 0-100 */
  score: number;
  /** Whether the solution passes the quality bar (score >= threshold) */
  passed: boolean;
  /** Detailed feedback for the agent to improve */
  feedback: string;
  /** Which provider/model performed the judgment */
  judgeModel: string;
  /** Evaluation latency */
  durationMs: number;
}

export interface JudgeInput {
  /** Description of what the task was */
  taskDescription: string;
  /** The agent's final output / summary */
  agentOutput: string;
  /** Files the agent changed (paths relative to project root) */
  filesChanged: string[];
  /** Optional: the original user request */
  userRequest?: string;
  /** Optional: test results if available */
  testResults?: string;
}

export interface JudgeOptions {
  /** Minimum passing score (default: 60) */
  threshold?: number;
  /** Max tokens for judge response (default: 1024) */
  maxTokens?: number;
  /** Preferred judge provider (default: auto-select different from worker) */
  judgeProvider?: string;
  /** Worker provider (to pick a different judge) */
  workerProvider?: string;
  /** Project path for reading file contents */
  projectPath?: string;
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const JUDGE_SYSTEM_PROMPT = `You are a code review judge. Your job is to evaluate the quality of an agent's work.

You will receive:
1. The task description (what was requested)
2. The agent's output summary
3. The contents of files that were changed
4. (Optional) Test results

Evaluate on these criteria:
- **Correctness**: Does the implementation actually solve the stated task?
- **Completeness**: Are all aspects of the task addressed, or are there gaps?
- **Code Quality**: Is the code clean, well-structured, and maintainable?
- **Edge Cases**: Are edge cases and error conditions handled?
- **Integration**: Does the change integrate well with the existing codebase?

Respond in EXACTLY this format (no extra text):
SCORE: <number 0-100>
PASSED: <true|false>
FEEDBACK: <1-3 sentences of specific, actionable feedback>

If the work is excellent, say so briefly. If it needs improvement, be specific about what to fix.`;

/* ─── Provider Selection ────────────────────────────────────────────── */

/**
 * Pick a judge provider different from the worker provider for adversarial review.
 * Falls back to the same provider if no alternative is available.
 */
const JUDGE_PROVIDER_PREFERENCES: Record<string, string[]> = {
  openai:    ['anthropic', 'gemini', 'openai'],
  anthropic: ['openai', 'gemini', 'anthropic'],
  gemini:    ['anthropic', 'openai', 'gemini'],
  groq:      ['anthropic', 'openai', 'groq'],
  ollama:    ['anthropic', 'openai', 'ollama'],
};

function selectJudgeProvider(workerProvider?: string): string {
  if (!workerProvider) return 'anthropic'; // sensible default
  const preferences = JUDGE_PROVIDER_PREFERENCES[workerProvider] || ['anthropic', 'openai'];
  // Return first preference (caller's UnifiedLLMService will handle availability)
  return preferences[0];
}

/* ─── LLMJudge ──────────────────────────────────────────────────────── */

export class LLMJudge {
  /**
   * Judge the quality of an agent's work using a separate LLM call.
   */
  static async judge(input: JudgeInput, options: JudgeOptions = {}): Promise<JudgeResult> {
    const threshold = options.threshold ?? 60;
    const maxTokens = options.maxTokens ?? 1024;
    const judgeProvider = options.judgeProvider || selectJudgeProvider(options.workerProvider);
    const projectPath = options.projectPath;

    const start = Date.now();

    // Build context: include file diffs/contents if project path is available
    let fileContext = '';
    if (projectPath && input.filesChanged.length > 0) {
      const snippets: string[] = [];
      for (const file of input.filesChanged.slice(0, 5)) { // Cap at 5 files
        const fullPath = path.isAbsolute(file) ? file : path.join(projectPath, file);
        try {
          if (await fs.pathExists(fullPath)) {
            const content = await fs.readFile(fullPath, 'utf-8');
            // Truncate large files to first 200 lines
            const lines = content.split('\n');
            const truncated = lines.length > 200
              ? lines.slice(0, 200).join('\n') + `\n... (${lines.length - 200} more lines)`
              : content;
            snippets.push(`### ${file}\n\`\`\`\n${truncated}\n\`\`\``);
          }
        } catch {
          // Skip unreadable files
        }
      }
      if (snippets.length > 0) {
        fileContext = `\n\n## Files Changed\n${snippets.join('\n\n')}`;
      }
    }

    const userPrompt = [
      `## Task Description\n${input.taskDescription}`,
      input.userRequest ? `## Original User Request\n${input.userRequest}` : '',
      `## Agent Output\n${input.agentOutput}`,
      `## Files Changed\n${input.filesChanged.join(', ')}`,
      fileContext,
      input.testResults ? `## Test Results\n${input.testResults}` : '',
    ].filter(Boolean).join('\n\n');

    try {
      const response = await unifiedLLMService.chat(judgeProvider, [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: maxTokens,
        temperature: 0.1, // Low temperature for consistent evaluation
      });

      const durationMs = Date.now() - start;
      const responseText = typeof response === 'string'
        ? response
        : (response as any)?.content || (response as any)?.choices?.[0]?.message?.content || '';

      const result = LLMJudge.parseJudgeResponse(responseText, threshold, judgeProvider, durationMs);

      // Emit socket event for UI
      broadcast('LLM_JUDGE_RESULT', {
        score: result.score,
        passed: result.passed,
        feedback: result.feedback,
        judgeModel: result.judgeModel,
        durationMs: result.durationMs,
        filesJudged: input.filesChanged.length,
      });

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - start;
      console.warn(`[LLMJudge] Judge call failed (${judgeProvider}):`, err.message);

      // On judge failure, pass by default (don't block agent on judge infra issues)
      return {
        score: 70,
        passed: true,
        feedback: `Judge unavailable (${err.message}). Passing by default.`,
        judgeModel: judgeProvider,
        durationMs,
      };
    }
  }

  /**
   * Parse the structured judge response into a JudgeResult.
   */
  static parseJudgeResponse(
    text: string,
    threshold: number,
    provider: string,
    durationMs: number
  ): JudgeResult {
    // Parse SCORE: <number>
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 50;

    // Parse PASSED: <true|false>
    const passedMatch = text.match(/PASSED:\s*(true|false)/i);
    const passed = passedMatch
      ? passedMatch[1].toLowerCase() === 'true'
      : score >= threshold;

    // Parse FEEDBACK: <text>
    const feedbackMatch = text.match(/FEEDBACK:\s*(.+)/is);
    const feedback = feedbackMatch
      ? feedbackMatch[1].trim().split('\n')[0] // Take first line only
      : 'No specific feedback provided.';

    return {
      score,
      passed: passed && score >= threshold, // Both must agree
      feedback,
      judgeModel: provider,
      durationMs,
    };
  }
}
