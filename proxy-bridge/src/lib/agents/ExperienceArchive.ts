import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * GEA-01: Experience Archive
 * Persistent cross-session evolutionary trace store for Group-Evolving Agents.
 * Based on: Group-Evolving Agents (arXiv:2602.04837, UCSB Feb 2026)
 *
 * Storage: .queenbee/experience-archive.jsonl (append-only)
 * Vocabulary: .queenbee/experience-vocab.json (union of all tools seen)
 */

export interface TraceToolUse {
  tool: string;
  outcome: 'success' | 'fail' | 'timeout';
  durationMs: number;
}

export interface TraceTaskOutcome {
  taskId: string;
  success: boolean;
}

export interface ArchiveEntry {
  id: string;
  agentId: string;
  sessionId: string;
  projectPath: string;
  timestamp: number;
  toolHistory: TraceToolUse[];
  taskOutcomes: TraceTaskOutcome[];
  successRate: number;       // fraction of tasks succeeded (0–1)
  toolVector: number[];      // binary presence vector over vocabulary
  codePatches: string[];     // paths of files written during session
  promptStrategies: string[]; // notable prompt patterns detected
  performanceScore: number;  // set by scorer
  noveltyScore: number;      // cosine distance from population mean
  combinedScore: number;     // performanceScore × √noveltyScore (GEA paper Alg 1)
  parentSessionId?: string;  // session that spawned this one (for lineage)
  cmBonus: number;           // Clade-Metaproductivity bonus (avg descendant delta), default 0
}

const ARCHIVE_FILE = 'experience-archive.jsonl';
const VOCAB_FILE   = 'experience-vocab.json';
const MAX_VOCAB    = 64;

export class ExperienceArchive {
  private archivePath: string;
  private vocabPath: string;

  constructor(projectPath: string) {
    const dir = path.join(projectPath, '.queenbee');
    this.archivePath = path.join(dir, ARCHIVE_FILE);
    this.vocabPath   = path.join(dir, VOCAB_FILE);
  }

  /** Append a completed session trace to the archive */
  async append(entry: Omit<ArchiveEntry, 'id'>): Promise<ArchiveEntry> {
    await fs.ensureDir(path.dirname(this.archivePath));
    const full: ArchiveEntry = { id: uuidv4(), ...entry };
    await fs.appendFile(this.archivePath, JSON.stringify(full) + '\n', 'utf-8');
    return full;
  }

  /** Query archive entries, sorted by combinedScore descending by default */
  async query(options: {
    limit?: number;
    sortBy?: keyof Pick<ArchiveEntry, 'combinedScore' | 'timestamp' | 'performanceScore'>;
  } = {}): Promise<ArchiveEntry[]> {
    const { limit = 20, sortBy = 'combinedScore' } = options;
    if (!(await fs.pathExists(this.archivePath))) return [];

    const raw = await fs.readFile(this.archivePath, 'utf-8');
    const entries: ArchiveEntry[] = raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);

    entries.sort((a, b) => ((b[sortBy] as number) ?? 0) - ((a[sortBy] as number) ?? 0));
    return entries.slice(0, limit);
  }

  /**
   * P17-03: Query archive, deduplicating by id (keeps last occurrence of each id).
   * This is required because updateCMBonus() appends updated entries as new lines.
   */
  async queryLatest(options: {
    limit?: number;
    sortBy?: keyof Pick<ArchiveEntry, 'combinedScore' | 'timestamp' | 'performanceScore'>;
  } = {}): Promise<ArchiveEntry[]> {
    const { limit = 20, sortBy = 'combinedScore' } = options;
    if (!(await fs.pathExists(this.archivePath))) return [];

    const raw = await fs.readFile(this.archivePath, 'utf-8');
    const all: ArchiveEntry[] = raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);

    // Deduplicate by id — last occurrence wins (newest update)
    const byId = new Map<string, ArchiveEntry>();
    for (const entry of all) {
      byId.set(entry.id, entry);
    }
    const deduped = Array.from(byId.values());

    deduped.sort((a, b) => ((b[sortBy] as number) ?? 0) - ((a[sortBy] as number) ?? 0));
    return deduped.slice(0, limit);
  }

  /**
   * P17-03: Update CMP bonus for a parent session.
   * Called after a child session is archived. Computes the performance delta
   * (child.combinedScore - parent.combinedScore) and averages it into the parent's cmBonus.
   * Uses exponential moving average (alpha=0.3) for smooth updates.
   */
  async updateCMBonus(parentSessionId: string, childCombinedScore: number): Promise<void> {
    if (!(await fs.pathExists(this.archivePath))) return;

    const raw = await fs.readFile(this.archivePath, 'utf-8');
    const all: ArchiveEntry[] = raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);

    // Deduplicate by id to get current state of each entry
    const byId = new Map<string, ArchiveEntry>();
    for (const entry of all) {
      byId.set(entry.id, entry);
    }

    // Find all entries where sessionId matches parentSessionId
    const parentEntries = Array.from(byId.values()).filter(
      e => e.sessionId === parentSessionId
    );

    if (parentEntries.length === 0) return;

    await fs.ensureDir(path.dirname(this.archivePath));
    for (const parent of parentEntries) {
      const delta = childCombinedScore - parent.combinedScore;
      const oldCmBonus = parent.cmBonus ?? 0;
      const newCmBonus = 0.7 * oldCmBonus + 0.3 * delta;
      const updated: ArchiveEntry = { ...parent, cmBonus: newCmBonus };
      await fs.appendFile(this.archivePath, JSON.stringify(updated) + '\n', 'utf-8');
    }
  }

  /**
   * P17-03: CMP-weighted combined score for parent selection.
   * Formula: 0.6 × combinedScore + 0.3 × cmBonus + 0.1 × noveltyScore
   */
  static cmpScore(entry: ArchiveEntry): number {
    const cmBonus = entry.cmBonus ?? 0;
    return 0.6 * entry.combinedScore + 0.3 * cmBonus + 0.1 * entry.noveltyScore;
  }

  /** Get the current tool vocabulary (sorted list of all tool names ever seen) */
  async getToolVocabulary(): Promise<string[]> {
    try {
      return await fs.readJson(this.vocabPath);
    } catch {
      return [];
    }
  }

  /** Merge new tool names into the vocabulary and persist */
  async updateVocabulary(tools: string[]): Promise<string[]> {
    const existing = await this.getToolVocabulary();
    const merged = Array.from(new Set([...existing, ...tools])).slice(0, MAX_VOCAB);
    await fs.ensureDir(path.dirname(this.vocabPath));
    await fs.writeJson(this.vocabPath, merged, { spaces: 2 });
    return merged;
  }

  /** Build a binary tool-presence vector aligned to vocabulary */
  buildToolVector(toolsUsed: string[], vocabulary: string[]): number[] {
    const usedSet = new Set(toolsUsed);
    return vocabulary.map(t => (usedSet.has(t) ? 1 : 0));
  }

  /**
   * GEA-02: Compute novelty score as cosine distance from population mean.
   * Range: 0 (identical to population) → 1 (maximally different).
   */
  computeNovelty(toolVector: number[], recentEntries: ArchiveEntry[]): number {
    if (recentEntries.length === 0) return 1.0; // first entry is maximally novel

    const vecLen = toolVector.length;
    if (vecLen === 0) return 0.5;

    // Build mean vector of recent population
    const meanVec = new Array(vecLen).fill(0) as number[];
    for (const entry of recentEntries) {
      const ev = entry.toolVector;
      for (let i = 0; i < vecLen; i++) {
        meanVec[i] += (ev[i] ?? 0) / recentEntries.length;
      }
    }

    // Cosine similarity → distance
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecLen; i++) {
      dot   += toolVector[i] * meanVec[i];
      normA += toolVector[i] ** 2;
      normB += meanVec[i] ** 2;
    }
    if (normA === 0 || normB === 0) return 0.5;
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, 1 - similarity));
  }

  /**
   * GEA-02: Combined score = performance × √novelty  (GEA paper Algorithm 1).
   * Balances exploitation (high performance) vs exploration (behavioral diversity).
   */
  static combinedScore(performance: number, novelty: number): number {
    return performance * Math.sqrt(Math.max(0, novelty));
  }
}
