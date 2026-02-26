/**
 * ContextCompressor: Prevents context window overflow on long-horizon tasks.
 *
 * Based on SWE-agent's ACI history processor (NeurIPS 2024) and
 * context-folding pattern (arXiv:2510.11967).
 *
 * Two mechanisms:
 *   1. processHistory() — keep last N messages in full; collapse older to summaries
 *   2. foldSubtask()    — compress completed subtask to outcome + decisions + artifacts
 */

import { LLMMessage } from './types/llm';

export interface FoldedSubtask {
  goal: string;
  outcome: string;       // 1-sentence summary
  keyDecisions: string[]; // ≤3 bullet points
  artifacts: string[];    // files/functions changed
  timestamp: string;
}

function truncateMessage(msg: LLMMessage, seenErrors: Set<string>): LLMMessage {
  if (msg.role === 'tool' || msg.role === 'user') {
    const content = String(msg.content || '');
    // Deduplicate repeated errors
    if (content.includes('Error') || content.includes('error')) {
      const key = content.slice(0, 60);
      if (seenErrors.has(key)) {
        return { ...msg, content: '[duplicate error omitted]' };
      }
      seenErrors.add(key);
    }
    // Truncate long tool results to first line
    if (content.length > 300) {
      const firstLine = content.split('\n')[0];
      return { ...msg, content: `[truncated] ${firstLine}...` };
    }
  }
  if (msg.role === 'assistant' && String(msg.content || '').length > 300) {
    return { ...msg, content: String(msg.content).slice(0, 300) + '...[truncated]' };
  }
  return msg;
}

export class ContextCompressor {
  private foldedHistory: FoldedSubtask[] = [];
  private readonly KEEP_RECENT: number;

  constructor(keepRecent = 6) {
    this.KEEP_RECENT = keepRecent;
  }

  /**
   * History processor (SWE-agent style):
   * - Keep last KEEP_RECENT messages in full
   * - Collapse older messages to single-line summaries
   * - Deduplicate repeated error messages
   */
  processHistory(messages: LLMMessage[]): LLMMessage[] {
    if (messages.length <= this.KEEP_RECENT) return messages;

    const recent = messages.slice(-this.KEEP_RECENT);
    const old = messages.slice(0, -this.KEEP_RECENT);

    const seenErrors = new Set<string>();
    const collapsed = old.map(msg => truncateMessage(msg, seenErrors));

    return [...collapsed, ...recent];
  }

  /**
   * Context folding: compress a completed subtask history to ~50 tokens.
   * Call this after each subtask completes to keep active context lean.
   */
  foldSubtask(goal: string, activeMessages: LLMMessage[]): void {
    // Build a summary from the trajectory without calling LLM
    // (calling LLM would require async; callers can do async version if needed)
    const actions = activeMessages
      .filter(m => m.role === 'assistant')
      .map(m => String(m.content || '').slice(0, 80))
      .slice(0, 5);

    const artifacts = activeMessages
      .filter(m => m.role === 'tool')
      .map(m => String(m.content || ''))
      .filter(c => c.includes('success') || c.includes('written') || c.includes('created'))
      .map(c => c.split('\n')[0].slice(0, 60))
      .slice(0, 3);

    this.foldedHistory.push({
      goal,
      outcome: actions[actions.length - 1] || 'Completed',
      keyDecisions: actions.slice(0, 3),
      artifacts,
      timestamp: new Date().toISOString(),
    });
  }

  /** Build a context header summarizing all folded subtasks */
  buildContextHeader(): string {
    if (!this.foldedHistory.length) return '';
    const lines = this.foldedHistory.map(f =>
      `[✓ ${f.goal}] ${f.outcome}${f.artifacts.length ? ` | changed: ${f.artifacts.join(', ')}` : ''}`
    );
    return `## Completed Work Summary\n${lines.join('\n')}\n\n`;
  }

  getFoldedHistory(): FoldedSubtask[] {
    return [...this.foldedHistory];
  }

  reset() {
    this.foldedHistory = [];
  }

  /**
   * P17-01: Goal-conditioned relevance pruning.
   * Scores each message against a goal description using lightweight TF-IDF-style
   * keyword overlap (no external embeddings needed — pure text matching).
   * Messages below threshold are collapsed to a single "[pruned: low relevance to current goal]" token.
   *
   * Based on SWE-Pruner (arXiv:2601.16746) + ContextEvolve (arXiv:2602.02597).
   *
   * @param messages - message array (call after processHistory)
   * @param goalDescription - e.g. "Fix race condition in TaskManager.claimTask()"
   * @param threshold - overlap score below which messages are pruned (default 0.15)
   */
  pruneByGoal(messages: LLMMessage[], goalDescription: string, threshold = 0.15): LLMMessage[] {
    const STOPWORDS = new Set([
      'the', 'a', 'an', 'in', 'to', 'of', 'and', 'is', 'for', 'with', 'that',
      'it', 'on', 'at', 'by', 'from', 'as', 'be', 'are', 'was', 'were', 'this',
      'or', 'but', 'not', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'we', 'they',
    ]);

    // Tokenize goal into meaningful keywords
    const goalKeywords = goalDescription
      .toLowerCase()
      .split(/[\s\p{P}]+/u)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));

    if (goalKeywords.length === 0) return messages;

    const goalKeywordSet = new Set(goalKeywords);

    const scoreMessage = (msg: LLMMessage): number => {
      // System messages: always keep
      if (msg.role === 'system') return 1;

      // Assistant messages with tool_calls: always keep
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) return 1;

      // Score remaining messages by keyword overlap
      const text = String(msg.content || '').toLowerCase();
      if (!text) return 0;

      let matches = 0;
      for (const kw of goalKeywordSet) {
        if (text.includes(kw)) matches++;
      }
      return matches / goalKeywordSet.size;
    };

    // Always keep the last 3 messages regardless of score
    const alwaysKeepThreshold = Math.max(0, messages.length - 3);

    return messages.map((msg, idx): LLMMessage => {
      if (idx >= alwaysKeepThreshold) return msg;
      const score = scoreMessage(msg);
      if (score < threshold) {
        return { ...msg, content: '[pruned: low relevance to current goal]' };
      }
      return msg;
    });
  }

  /**
   * P17-01: Extract the GOAL line from a <plan>GOAL: ...</plan> block
   * in an assistant message. Returns null if no match found.
   *
   * @param content - raw assistant message content string
   */
  static extractGoalFromPlan(content: string): string | null {
    const planMatch = content.match(/<plan>([\s\S]*?)<\/plan>/i);
    if (!planMatch) return null;
    const planBody = planMatch[1];
    const goalMatch = planBody.match(/^GOAL:\s*(.+)$/im);
    if (!goalMatch) return null;
    return goalMatch[1].trim() || null;
  }
}
