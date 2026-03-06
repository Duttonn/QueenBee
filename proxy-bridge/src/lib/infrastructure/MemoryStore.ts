import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { v4 as uuidv4 } from 'uuid';

/**
 * P18-10: Extended memory type taxonomy.
 * - codebase: architectural decisions, module patterns, API contracts
 * - preference: developer style, avoided patterns, naming conventions
 * - Original types preserved for backward compatibility.
 */
export type MemoryType = 'insight' | 'pattern' | 'lesson' | 'preference' | 'style' | 'codebase';

export type MemorySearchMode = 'keyword' | 'bm25' | 'hybrid';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  confidence: number;
  created_at: string;
  // P17-04: Semantic Graph Memory links
  semanticLinks?: string[];  // IDs of semantically related memories (keyword overlap)
  temporalLinks?: string[];  // IDs of temporally adjacent memories (prev/next 3)
  causalLinks?: string[];    // IDs of causally related memories (keyword-based detection)
}

// P17-04: Stopwords for keyword extraction
const STOPWORDS = new Set([
  'the', 'a', 'in', 'to', 'of', 'and', 'is', 'for', 'with', 'that',
  'this', 'it', 'was', 'are', 'be', 'has', 'have', 'had', 'not', 'but',
  'from', 'by', 'an'
]);

// P17-04: Causal indicator phrases
const CAUSAL_PHRASES = [
  'because',
  'caused by',
  'as a result',
  'therefore',
  'since',
  'due to',
  'led to',
  'resulted in',
  'error:',
  'failed because',
];

export class MemoryStore {
  private configDir: string;
  private filePath: string;

  constructor(projectPath: string) {
    this.configDir = Paths.getProjectConfigDir(projectPath);
    this.filePath = path.join(this.configDir, 'memory.json');
  }

  private async ensureInitialized(): Promise<void> {
    await fs.ensureDir(this.configDir);
    if (!(await fs.pathExists(this.filePath))) {
      await fs.writeJson(this.filePath, [], { spaces: 2 });
    }
  }

  async getBySession(sessionId: string): Promise<MemoryEntry[]> {
    const memories = await this.getAll();
    return memories.filter(m => m.id === sessionId); // Note: Assuming sessionId is stored or linked to entry ID. Adjust logic based on actual storage.
  }

  async getAll(): Promise<MemoryEntry[]> {
    await this.ensureInitialized();
    return await fs.readJson(this.filePath);
  }

  async add(type: MemoryType, content: string, confidence: number = 1.0): Promise<MemoryEntry> {
    const memories = await this.getAll();
    const entry: MemoryEntry = {
      id: uuidv4(),
      type,
      content,
      confidence,
      created_at: new Date().toISOString(),
      semanticLinks: [],
      temporalLinks: [],
      causalLinks: [],
    };
    memories.push(entry);

    // P17-04: Build graph links for the new entry (mutates memories array in place)
    this.linkMemory(entry, memories);

    await fs.writeJson(this.filePath, memories, { spaces: 2 });
    return entry;
  }

  // -------------------------------------------------------------------------
  // P17-04: Private graph-linking helpers
  // -------------------------------------------------------------------------

  /**
   * Extracts meaningful keywords from a content string.
   * Splits on spaces/punctuation, lowercases, and removes stopwords.
   */
  private extractKeywords(content: string): Set<string> {
    const words = content
      .toLowerCase()
      .split(/[\s\p{P}]+/u)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));
    return new Set(words);
  }

  /**
   * Computes Jaccard-style overlap ratio between two keyword sets.
   * Returns shared_keywords / total_unique_keywords.
   */
  private keywordOverlap(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let shared = 0;
    for (const w of a) {
      if (b.has(w)) shared++;
    }
    const union = new Set([...a, ...b]).size;
    return union === 0 ? 0 : shared / union;
  }

  /**
   * P17-04: Links a newly inserted entry to existing entries via semantic,
   * temporal, and causal graph edges. Mutates the memories array in place
   * so bidirectional links are reflected before the array is persisted.
   */
  private linkMemory(newEntry: MemoryEntry, memories: MemoryEntry[]): void {
    const existing = memories.filter(m => m.id !== newEntry.id);

    // Ensure link arrays are initialised on newEntry
    if (!newEntry.semanticLinks) newEntry.semanticLinks = [];
    if (!newEntry.temporalLinks) newEntry.temporalLinks = [];
    if (!newEntry.causalLinks) newEntry.causalLinks = [];

    const newKeywords = this.extractKeywords(newEntry.content);

    // ------------------------------------------------------------------
    // Semantic links: keyword overlap > 0.25 in last 50 existing entries
    // ------------------------------------------------------------------
    const recentForSemantic = existing.slice(-50);
    for (const other of recentForSemantic) {
      const otherKeywords = this.extractKeywords(other.content);
      const overlap = this.keywordOverlap(newKeywords, otherKeywords);
      if (overlap > 0.25) {
        // Bidirectional
        if (!newEntry.semanticLinks.includes(other.id)) {
          newEntry.semanticLinks.push(other.id);
        }
        if (!other.semanticLinks) other.semanticLinks = [];
        if (!other.semanticLinks.includes(newEntry.id)) {
          other.semanticLinks.push(newEntry.id);
        }
      }
    }

    // ------------------------------------------------------------------
    // Temporal links: 3 most recently added entries (by timestamp)
    // ------------------------------------------------------------------
    const sortedByTime = [...existing].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const recentThree = sortedByTime.slice(0, 3);
    for (const other of recentThree) {
      // Bidirectional
      if (!newEntry.temporalLinks.includes(other.id)) {
        newEntry.temporalLinks.push(other.id);
      }
      if (!other.temporalLinks) other.temporalLinks = [];
      if (!other.temporalLinks.includes(newEntry.id)) {
        other.temporalLinks.push(newEntry.id);
      }
    }

    // ------------------------------------------------------------------
    // Causal links: detect causal phrases, extract cause signature,
    // search existing entries for those words
    // ------------------------------------------------------------------
    const lowerContent = newEntry.content.toLowerCase();
    let causeSignatureWords: string[] = [];

    for (const phrase of CAUSAL_PHRASES) {
      const idx = lowerContent.indexOf(phrase);
      if (idx !== -1) {
        // Extract up to 5 words after the causal phrase
        const afterPhrase = lowerContent.slice(idx + phrase.length).trim();
        const words = afterPhrase
          .split(/[\s\p{P}]+/u)
          .filter(w => w.length > 1 && !STOPWORDS.has(w))
          .slice(0, 5);
        causeSignatureWords = causeSignatureWords.concat(words);
      }
    }

    if (causeSignatureWords.length > 0) {
      const causeSet = new Set(causeSignatureWords);
      for (const other of existing) {
        const otherKeywords = this.extractKeywords(other.content);
        // Check if any cause signature word appears in the other entry
        let hasMatch = false;
        for (const w of causeSet) {
          if (otherKeywords.has(w)) {
            hasMatch = true;
            break;
          }
        }
        if (hasMatch) {
          // Bidirectional
          if (!newEntry.causalLinks!.includes(other.id)) {
            newEntry.causalLinks!.push(other.id);
          }
          if (!other.causalLinks) other.causalLinks = [];
          if (!other.causalLinks.includes(newEntry.id)) {
            other.causalLinks.push(newEntry.id);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // P17-04: Graph traversal retrieval
  // -------------------------------------------------------------------------

  /**
   * P17-04: Graph-aware memory retrieval.
   * Returns the memory + its linked memories (1-hop traversal).
   * @param id - memory entry ID
   * @param depth - 0 = just the entry, 1 = entry + all linked entries
   */
  async getWithLinks(id: string, depth = 1): Promise<MemoryEntry[]> {
    const memories = await this.getAll();
    const byId = new Map<string, MemoryEntry>(memories.map(m => [m.id, m]));
    const root = byId.get(id);
    if (!root) return [];
    if (depth === 0) return [root];

    const resultIds = new Set<string>([id]);

    // Collect all linked IDs (1 hop)
    const linkedIds = [
      ...(root.semanticLinks ?? []),
      ...(root.temporalLinks ?? []),
      ...(root.causalLinks ?? []),
    ];
    for (const linkedId of linkedIds) {
      resultIds.add(linkedId);
    }

    const result: MemoryEntry[] = [];
    for (const rid of resultIds) {
      const entry = byId.get(rid);
      if (entry) result.push(entry);
    }
    return result;
  }

  /**
   * P17-04: Returns a formatted string of linked context for injection
   * into agent prompts. Used when agent calls read_memory with a specific ID.
   */
  async getLinkedContext(id: string): Promise<string> {
    const memories = await this.getAll();
    const byId = new Map<string, MemoryEntry>(memories.map(m => [m.id, m]));
    const root = byId.get(id);
    if (!root) return '';

    const lines: string[] = [];

    const semanticEntries = (root.semanticLinks ?? [])
      .map(lid => byId.get(lid))
      .filter((e): e is MemoryEntry => e !== undefined);

    if (semanticEntries.length > 0) {
      lines.push('[SEMANTIC CONTEXT]');
      for (const e of semanticEntries) {
        lines.push(`- ${e.content}`);
      }
    }

    const temporalEntries = (root.temporalLinks ?? [])
      .map(lid => byId.get(lid))
      .filter((e): e is MemoryEntry => e !== undefined);

    if (temporalEntries.length > 0) {
      lines.push('[TEMPORAL CONTEXT]');
      for (const e of temporalEntries) {
        lines.push(`- ${e.content}`);
      }
    }

    const causalEntries = (root.causalLinks ?? [])
      .map(lid => byId.get(lid))
      .filter((e): e is MemoryEntry => e !== undefined);

    if (causalEntries.length > 0) {
      lines.push('[CAUSAL CONTEXT]');
      for (const e of causalEntries) {
        lines.push(`- ${e.content}`);
      }
    }

    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // Existing methods (unchanged)
  // -------------------------------------------------------------------------

  /** Original keyword search (substring match). */
  async search(query: string): Promise<MemoryEntry[]> {
    return this.hybridSearch(query, 20, 'keyword');
  }

  /**
   * P18-10: Hybrid search over memories.
   * - keyword: simple substring match (original behavior)
   * - bm25: BM25-style TF-IDF ranking over tokenized memories
   * - hybrid: merge keyword exact matches with BM25-ranked results
   *
   * @param query - search query
   * @param limit - max results (default 20)
   * @param mode  - search mode (default 'hybrid')
   */
  async hybridSearch(
    query: string,
    limit = 20,
    mode: MemorySearchMode = 'hybrid'
  ): Promise<MemoryEntry[]> {
    const memories = await this.getAll();
    if (memories.length === 0) return [];

    if (mode === 'keyword') {
      const lowQuery = query.toLowerCase();
      return memories
        .filter(m => m.content.toLowerCase().includes(lowQuery) || m.type.toLowerCase().includes(lowQuery))
        .slice(0, limit);
    }

    // Tokenize query
    const queryTokens = query
      .toLowerCase()
      .split(/[\s\W]+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w));

    if (queryTokens.length === 0) return memories.slice(0, limit);

    // BM25 scoring
    const k1 = 1.5, b = 0.75;
    const avgLen = memories.reduce((s, m) => s + m.content.split(/\s+/).length, 0) / memories.length;

    const scored = memories.map(mem => {
      const tokens = mem.content.toLowerCase().split(/[\s\W]+/).filter(w => w.length > 2);
      const freqMap = new Map<string, number>();
      for (const t of tokens) freqMap.set(t, (freqMap.get(t) || 0) + 1);

      let score = 0;
      for (const term of queryTokens) {
        const tf = freqMap.get(term) || 0;
        if (tf === 0) continue;
        const idf = Math.log(1 + memories.length / (1 + memories.filter(m => m.content.toLowerCase().includes(term)).length));
        const num = tf * (k1 + 1);
        const den = tf + k1 * (1 - b + b * (tokens.length / avgLen));
        score += idf * (num / den);
      }

      // Confidence boost for high-confidence memories
      score *= (0.5 + mem.confidence * 0.5);

      return { mem, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const bm25Results = scored.filter(s => s.score > 0).map(s => s.mem);

    if (mode === 'bm25') return bm25Results.slice(0, limit);

    // Hybrid: merge exact matches first, then BM25
    const lowQuery = query.toLowerCase();
    const exactIds = new Set(
      memories
        .filter(m => m.content.toLowerCase().includes(lowQuery))
        .map(m => m.id)
    );

    const merged: MemoryEntry[] = [];
    const seenIds = new Set<string>();

    // Exact matches first
    for (const m of memories) {
      if (exactIds.has(m.id)) {
        merged.push(m);
        seenIds.add(m.id);
        if (merged.length >= limit) break;
      }
    }

    // Then BM25 results
    for (const m of bm25Results) {
      if (!seenIds.has(m.id)) {
        merged.push(m);
        seenIds.add(m.id);
        if (merged.length >= limit) break;
      }
    }

    return merged.slice(0, limit);
  }

  async prune(minConfidence: number = 0.5): Promise<void> {
    const memories = await this.getAll();
    const filtered = memories.filter(m => m.confidence >= minConfidence);
    await fs.writeJson(this.filePath, filtered, { spaces: 2 });
  }

  /**
   * SI-05: Confidence-Based Memory Decay
   * Reduce confidence when a memory leads to task failure
   * @param memoryIds - IDs of memories involved in the failed task
   * @param decayRate - Percentage to decay (default 0.2 = 20%)
   */
  async decayConfidence(memoryIds: string[], decayRate: number = 0.2): Promise<void> {
    const memories = await this.getAll();
    let pruned = false;

    for (const mem of memories) {
      if (memoryIds.includes(mem.id)) {
        mem.confidence *= (1 - decayRate);
        console.log(`[MemoryStore] Decayed memory ${mem.id} to ${mem.confidence.toFixed(2)}`);

        // Auto-prune if below threshold
        if (mem.confidence < 0.3) {
          console.log(`[MemoryStore] Pruning memory ${mem.id} - confidence below threshold`);
          pruned = true;
        }
      }
    }

    if (pruned) {
      const filtered = memories.filter(m => m.confidence >= 0.3);
      await fs.writeJson(this.filePath, filtered, { spaces: 2 });
    } else {
      await fs.writeJson(this.filePath, memories, { spaces: 2 });
    }
  }

  /**
   * SI-05: Reinforce confidence when memory leads to success
   * @param memoryIds - IDs of memories involved in the successful task
   * @param boostRate - Percentage to boost (default 0.1 = 10%)
   */
  async reinforceConfidence(memoryIds: string[], boostRate: number = 0.1): Promise<void> {
    const memories = await this.getAll();

    for (const mem of memories) {
      if (memoryIds.includes(mem.id)) {
        mem.confidence = Math.min(1.0, mem.confidence * (1 + boostRate));
        console.log(`[MemoryStore] Reinforced memory ${mem.id} to ${mem.confidence.toFixed(2)}`);
      }
    }

    await fs.writeJson(this.filePath, memories, { spaces: 2 });
  }

  /**
   * SI-05: Auto-prune memories below confidence threshold
   */
  async autoPruneLowConfidence(threshold: number = 0.3): Promise<number> {
    const memories = await this.getAll();
    const before = memories.length;
    const filtered = memories.filter(m => m.confidence >= threshold);
    const removed = before - filtered.length;

    if (removed > 0) {
      console.log(`[MemoryStore] Auto-pruned ${removed} low-confidence memories`);
      await fs.writeJson(this.filePath, filtered, { spaces: 2 });
    }

    return removed;
  }
}
