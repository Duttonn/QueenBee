/**
 * P18-09: SessionSearchIndex — full-text search across all past agent sessions
 *
 * Stores searchable excerpts from sessions in a JSONL file at
 * `.queenbee/session-search.jsonl`. Uses BM25-style TF-IDF scoring for
 * relevance ranking without any external dependencies.
 *
 * Index at session end: tool calls, tool results, agent messages, errors.
 * New `session_search` tool lets agents recall what happened in past sessions.
 *
 * Pattern from hermes-agent + better-hub.
 */

import fs from 'fs-extra';
import path from 'path';
import { LLMMessage } from '../types/llm';
import { Paths } from '../infrastructure/Paths';

export type IndexEntryType = 'message' | 'tool_call' | 'tool_result' | 'error';

export interface IndexEntry {
  sessionId: string;
  timestamp: string;
  type: IndexEntryType;
  content: string;
  toolName?: string;
}

export interface SearchResult {
  sessionId: string;
  timestamp: string;
  type: IndexEntryType;
  toolName?: string;
  excerpt: string;   // ~200 char excerpt around best match
  score: number;
}

const INDEX_FILE = 'session-search.jsonl';
const STOPWORDS = new Set([
  'the','a','an','in','to','of','and','is','for','with','that','it','on','at','by',
  'from','as','be','are','was','were','this','or','but','not','have','has','had',
  'do','does','did','will','would','could','should','may','might','can','i','you',
  'we','they','true','false','null','undefined',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function bm25Score(query: string[], docTokens: string[], avgDocLen: number): number {
  const k1 = 1.5;
  const b = 0.75;
  const docLen = docTokens.length;
  const freqMap = new Map<string, number>();
  for (const t of docTokens) freqMap.set(t, (freqMap.get(t) || 0) + 1);

  let score = 0;
  for (const term of query) {
    const tf = freqMap.get(term) || 0;
    if (tf === 0) continue;
    const idf = Math.log(1 + 1); // simplified IDF = log(2) since we don't have corpus stats
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
    score += idf * (numerator / denominator);
  }
  return score;
}

function makeExcerpt(content: string, queryTerms: string[]): string {
  const lower = content.toLowerCase();
  let bestPos = 0;
  let bestHits = 0;

  for (let i = 0; i < content.length - 100; i += 20) {
    const window = lower.slice(i, i + 200);
    const hits = queryTerms.filter(t => window.includes(t)).length;
    if (hits > bestHits) { bestHits = hits; bestPos = i; }
  }

  const excerpt = content.slice(bestPos, bestPos + 200).replace(/\n+/g, ' ').trim();
  return excerpt.length < content.length ? `...${excerpt}...` : excerpt;
}

export class SessionSearchIndex {
  private indexPath: string;

  constructor(projectPath: string) {
    const configDir = Paths.getProjectConfigDir(projectPath);
    this.indexPath = path.join(configDir, INDEX_FILE);
  }

  /**
   * Index all messages from a completed session.
   * Call this at the end of AgentSession.summarizeSession().
   */
  async indexSession(sessionId: string, messages: LLMMessage[]): Promise<void> {
    await fs.ensureFile(this.indexPath);
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    for (const msg of messages) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
      if (!content || content.length < 10) continue;

      if (msg.role === 'assistant') {
        // Index assistant messages and tool calls
        if (content.trim()) {
          lines.push(JSON.stringify({
            sessionId, timestamp, type: 'message', content: content.slice(0, 1000),
          } as IndexEntry));
        }
        for (const tc of msg.tool_calls || []) {
          lines.push(JSON.stringify({
            sessionId, timestamp, type: 'tool_call',
            content: tc.function.arguments.slice(0, 500),
            toolName: tc.function.name,
          } as IndexEntry));
        }
      } else if (msg.role === 'tool') {
        const isError = content.includes('"error"') || content.startsWith('Error');
        lines.push(JSON.stringify({
          sessionId, timestamp,
          type: isError ? 'error' : 'tool_result',
          content: content.slice(0, 600),
          toolName: msg.name,
        } as IndexEntry));
      }
    }

    if (lines.length > 0) {
      await fs.appendFile(this.indexPath, lines.join('\n') + '\n', 'utf-8');
    }
  }

  /**
   * Search the index for entries matching a query.
   * Returns ranked results with excerpts.
   */
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    if (!(await fs.pathExists(this.indexPath))) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const raw = await fs.readFile(this.indexPath, 'utf-8');
    const entries: IndexEntry[] = raw
      .split('\n')
      .filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);

    if (entries.length === 0) return [];

    // Compute average doc length for BM25
    const avgLen = entries.reduce((s, e) => s + tokenize(e.content).length, 0) / entries.length;

    // Score entries
    const scored = entries.map(entry => {
      const docTokens = tokenize(entry.content);
      const score = bm25Score(queryTokens, docTokens, avgLen);
      return { entry, score };
    });

    // Sort by score, deduplicate by sessionId+content prefix
    scored.sort((a, b) => b.score - a.score);

    const seen = new Set<string>();
    const results: SearchResult[] = [];

    for (const { entry, score } of scored) {
      if (score <= 0) continue;
      const dedupeKey = `${entry.sessionId}:${entry.content.slice(0, 40)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      results.push({
        sessionId: entry.sessionId,
        timestamp: entry.timestamp,
        type: entry.type,
        toolName: entry.toolName,
        excerpt: makeExcerpt(entry.content, queryTokens),
        score: Math.round(score * 100) / 100,
      });

      if (results.length >= limit) break;
    }

    return results;
  }
}
