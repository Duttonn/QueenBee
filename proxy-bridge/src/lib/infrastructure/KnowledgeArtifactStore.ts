/**
 * P20-07: Knowledge Artifact Synthesis (Orchestrator-Directed Discovery)
 *
 * Workers produce structured knowledge artifacts (typed JSON) instead of
 * free-form summaries. The architect requests specific artifact types and
 * subsequent workers' context injection includes relevant artifacts.
 *
 * Artifact types:
 *   - discovery: filesDiscovered, patternsFound, dependenciesIdentified
 *   - implementation: filesCreated, filesModified, exportsAdded, testsNeeded
 *   - test_result: testsPassed, testsFailed, coverage, regressions
 *   - review: concerns, suggestions, approvals, blockers
 *
 * Inspired by Danau5tin's multi-agent-coding-system (#13 TerminalBench).
 *
 * Integration:
 *   - Roundtable.ts: workers post artifacts with `artifactType` metadata
 *   - AutonomousRunner.ts: architect prompt requests specific artifacts
 *   - Persisted to .queenbee/artifacts.jsonl
 */

import fs from 'fs-extra';
import path from 'path';
import { broadcast } from './socket-instance';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type ArtifactType = 'discovery' | 'implementation' | 'test_result' | 'review';

export interface DiscoveryArtifact {
  filesDiscovered: string[];
  patternsFound: string[];
  dependenciesIdentified: string[];
  apiEndpoints?: string[];
  configFiles?: string[];
}

export interface ImplementationArtifact {
  filesCreated: string[];
  filesModified: string[];
  exportsAdded: Array<{ file: string; name: string; type: 'function' | 'class' | 'interface' | 'type' | 'const' }>;
  testsNeeded: string[];
  breakingChanges?: string[];
}

export interface TestResultArtifact {
  testsPassed: number;
  testsFailed: number;
  coverage?: number;
  regressions: string[];
  newTests: string[];
}

export interface ReviewArtifact {
  concerns: string[];
  suggestions: string[];
  approvals: string[];
  blockers: string[];
  score?: number;
}

export type ArtifactData = DiscoveryArtifact | ImplementationArtifact | TestResultArtifact | ReviewArtifact;

export interface KnowledgeArtifact {
  id: string;
  type: ArtifactType;
  data: ArtifactData;
  agentId: string;
  taskId: string;
  swarmId?: string;
  timestamp: string;
  /** Free-form summary for human readability */
  summary?: string;
}

export interface ArtifactQuery {
  type?: ArtifactType;
  agentId?: string;
  taskId?: string;
  swarmId?: string;
  limit?: number;
}

/* ─── KnowledgeArtifactStore ────────────────────────────────────────── */

export class KnowledgeArtifactStore {
  private filePath: string;

  constructor(projectPath: string) {
    this.filePath = path.join(projectPath, '.queenbee', 'artifacts.jsonl');
  }

  /**
   * Store a knowledge artifact from a worker.
   */
  async store(artifact: Omit<KnowledgeArtifact, 'id' | 'timestamp'>): Promise<KnowledgeArtifact> {
    await fs.ensureDir(path.dirname(this.filePath));

    const full: KnowledgeArtifact = {
      id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...artifact,
    };

    await fs.appendFile(this.filePath, JSON.stringify(full) + '\n');

    broadcast('KNOWLEDGE_ARTIFACT', {
      id: full.id,
      type: full.type,
      agentId: full.agentId,
      taskId: full.taskId,
      summary: full.summary,
    });

    return full;
  }

  /**
   * Query artifacts with optional filters.
   */
  async query(query: ArtifactQuery = {}): Promise<KnowledgeArtifact[]> {
    if (!(await fs.pathExists(this.filePath))) return [];

    const content = await fs.readFile(this.filePath, 'utf-8');
    let artifacts: KnowledgeArtifact[] = content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);

    if (query.type) artifacts = artifacts.filter(a => a.type === query.type);
    if (query.agentId) artifacts = artifacts.filter(a => a.agentId === query.agentId);
    if (query.taskId) artifacts = artifacts.filter(a => a.taskId === query.taskId);
    if (query.swarmId) artifacts = artifacts.filter(a => a.swarmId === query.swarmId);

    const limit = query.limit || 50;
    return artifacts.slice(-limit);
  }

  /**
   * Get artifacts formatted for context injection into a worker's prompt.
   * Filters by relevance and formats as readable text.
   */
  async getContextForWorker(
    workerType: string,
    swarmId?: string,
    limit = 10
  ): Promise<string> {
    const artifacts = await this.query({ swarmId, limit });
    if (artifacts.length === 0) return '';

    // Filter by relevance to worker type
    const relevant = this.filterRelevant(artifacts, workerType);
    if (relevant.length === 0) return '';

    const formatted = relevant.map(a => {
      const header = `[${a.type.toUpperCase()}] from ${a.agentId} (task: ${a.taskId})`;
      const body = this.formatArtifactData(a);
      return `${header}\n${body}`;
    }).join('\n---\n');

    return `\n## Knowledge Artifacts from Team\n${formatted}`;
  }

  /**
   * Filter artifacts by relevance to a worker type.
   */
  private filterRelevant(artifacts: KnowledgeArtifact[], workerType: string): KnowledgeArtifact[] {
    const upper = workerType.toUpperCase();

    // Test workers care about implementation artifacts (what to test)
    if (upper.includes('TEST') || upper.includes('QA')) {
      return artifacts.filter(a => a.type === 'implementation' || a.type === 'discovery');
    }

    // UI workers care about discovery (what APIs exist) and implementation (backend exports)
    if (upper.includes('UI') || upper.includes('FRONTEND')) {
      return artifacts.filter(a => a.type === 'discovery' || a.type === 'implementation');
    }

    // Review workers see everything
    if (upper.includes('REVIEW') || upper.includes('SECURITY') || upper.includes('ARCHITECT')) {
      return artifacts;
    }

    // Default: show discovery and implementation artifacts
    return artifacts.filter(a => a.type === 'discovery' || a.type === 'implementation');
  }

  /**
   * Format artifact data as readable text for prompt injection.
   */
  private formatArtifactData(artifact: KnowledgeArtifact): string {
    const data = artifact.data;

    switch (artifact.type) {
      case 'discovery': {
        const d = data as DiscoveryArtifact;
        const parts: string[] = [];
        if (d.filesDiscovered?.length) parts.push(`Files: ${d.filesDiscovered.join(', ')}`);
        if (d.patternsFound?.length) parts.push(`Patterns: ${d.patternsFound.join(', ')}`);
        if (d.dependenciesIdentified?.length) parts.push(`Dependencies: ${d.dependenciesIdentified.join(', ')}`);
        if (d.apiEndpoints?.length) parts.push(`API Endpoints: ${d.apiEndpoints.join(', ')}`);
        return parts.join('\n') || artifact.summary || '(no details)';
      }
      case 'implementation': {
        const d = data as ImplementationArtifact;
        const parts: string[] = [];
        if (d.filesCreated?.length) parts.push(`Created: ${d.filesCreated.join(', ')}`);
        if (d.filesModified?.length) parts.push(`Modified: ${d.filesModified.join(', ')}`);
        if (d.exportsAdded?.length) parts.push(`Exports: ${d.exportsAdded.map(e => `${e.file}:${e.name}`).join(', ')}`);
        if (d.testsNeeded?.length) parts.push(`Tests needed: ${d.testsNeeded.join(', ')}`);
        return parts.join('\n') || artifact.summary || '(no details)';
      }
      case 'test_result': {
        const d = data as TestResultArtifact;
        return `Passed: ${d.testsPassed}, Failed: ${d.testsFailed}${d.coverage !== undefined ? `, Coverage: ${d.coverage}%` : ''}${d.regressions.length ? `\nRegressions: ${d.regressions.join(', ')}` : ''}`;
      }
      case 'review': {
        const d = data as ReviewArtifact;
        const parts: string[] = [];
        if (d.blockers?.length) parts.push(`BLOCKERS: ${d.blockers.join('; ')}`);
        if (d.concerns?.length) parts.push(`Concerns: ${d.concerns.join('; ')}`);
        if (d.suggestions?.length) parts.push(`Suggestions: ${d.suggestions.join('; ')}`);
        if (d.score !== undefined) parts.push(`Score: ${d.score}/100`);
        return parts.join('\n') || artifact.summary || '(no details)';
      }
      default:
        return artifact.summary || JSON.stringify(data).slice(0, 200);
    }
  }

  /**
   * Clear all artifacts for a swarm (cleanup on swarm completion).
   */
  async clearBySwarmId(swarmId: string): Promise<number> {
    if (!(await fs.pathExists(this.filePath))) return 0;

    const content = await fs.readFile(this.filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const artifacts = lines.map(l => { try { return JSON.parse(l) as KnowledgeArtifact; } catch { return null; } }).filter(Boolean) as KnowledgeArtifact[];
    const remaining = artifacts.filter(a => a.swarmId !== swarmId);
    const removed = artifacts.length - remaining.length;

    await fs.writeFile(
      this.filePath,
      remaining.map(a => JSON.stringify(a)).join('\n') + (remaining.length ? '\n' : '')
    );

    return removed;
  }
}
