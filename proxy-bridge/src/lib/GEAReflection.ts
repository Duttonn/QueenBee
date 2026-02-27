import fs from 'fs-extra';
import path from 'path';
import { ExperienceArchive, ArchiveEntry } from './ExperienceArchive';
import { unifiedLLMService } from './UnifiedLLMService';
import { WorkflowOptimizer } from './WorkflowOptimizer';

/**
 * GEA-03: Reflection Module
 * Analyzes top-K agents' collective experience pool, identifies cross-agent patterns,
 * and generates "evolution directives" that guide the next agent generation.
 *
 * GEA-04: Evolution Module
 * Applies directives to per-project evolved-config.json, which AutonomousRunner
 * loads to augment the system prompt and tool ordering.
 *
 * Based on: Group-Evolving Agents (arXiv:2602.04837, UCSB Feb 2026)
 */

export interface EvolutionDirectives {
  workflowDirectives: string[];  // high-level workflow patterns to adopt
  toolPreferences: string[];     // tool usage preferences discovered
  promptPatches: string[];       // prompt strategy improvements
  avoidPatterns: string[];       // failure patterns to steer away from
  generatedAt: number;
  sourceAgentIds: string[];
}

export interface EvolvedConfig {
  systemPromptAppend: string;    // appended to every agent's system prompt for this project
  toolOrderHints: string[];      // preferred tool ordering hints
  avoidPatterns: string[];       // injected as AVOID warnings
  retryThresholdOverride?: number;
  workflowOperator?: 'sequential' | 'ensemble' | 'review_revise'; // GEA-07
  lastEvolvedAt: number;
  sourceDirectiveIds: string[];
  version: number;
  // P18-12: Anti-patterns extracted from git history
  git_history_lessons?: Array<{ commitHash: string; antiPattern: string; discoveredAt: string }>;
}

const DIRECTIVES_FILE    = 'evolution-directives.json';
const EVOLVED_CONFIG_FILE = 'evolved-config.json';
const EVOLVED_HISTORY_FILE = 'evolved-config-history.jsonl';
const MAX_HISTORY = 5;

// Minimum entries needed before reflection is worthwhile
const MIN_ARCHIVE_ENTRIES = 2;
// Top-K agents to include in collective experience pool
const DEFAULT_K = 3;

export class GEAReflection {
  private archive: ExperienceArchive;
  private queenbeeDir: string;
  private directivesPath: string;
  private evolvedConfigPath: string;
  private evolvedHistoryPath: string;

  constructor(projectPath: string) {
    this.archive = new ExperienceArchive(projectPath);
    this.queenbeeDir = path.join(projectPath, '.queenbee');
    this.directivesPath    = path.join(this.queenbeeDir, DIRECTIVES_FILE);
    this.evolvedConfigPath = path.join(this.queenbeeDir, EVOLVED_CONFIG_FILE);
    this.evolvedHistoryPath = path.join(this.queenbeeDir, EVOLVED_HISTORY_FILE);
  }

  /**
   * GEA-03: Run the reflection cycle.
   * Selects top-K agents, aggregates their traces, makes one LLM call
   * to generate evolution directives, then calls evolve() to apply them.
   *
   * P17-05: When focusTaskType is provided, filters topAgents to entries whose
   * taskOutcomes contain tasks matching that type keyword. Falls back to full
   * pool if the filtered pool has fewer than 2 entries.
   */
  async reflect(providerId = 'auto', apiKey?: string, focusTaskType?: string): Promise<EvolutionDirectives | null> {
    // P17-03: Fetch candidates using queryLatest (deduped) then re-sort by CMP score
    const candidates = await this.archive.queryLatest({ limit: DEFAULT_K * 4, sortBy: 'combinedScore' });
    if (candidates.length < MIN_ARCHIVE_ENTRIES) {
      console.log('[GEAReflection] Not enough archive entries for reflection yet.');
      return null;
    }

    // Re-sort by CMP-weighted score (lineage-aware parent selection, P17-03 / arXiv:2510.21614)
    candidates.sort((a, b) => ExperienceArchive.cmpScore(b) - ExperienceArchive.cmpScore(a));

    // P17-05: Apply focusTaskType filter if provided
    let topAgents = candidates.slice(0, DEFAULT_K);
    if (focusTaskType) {
      const filtered = candidates.filter(entry =>
        entry.taskOutcomes.some(t => t.taskId.toLowerCase().includes(focusTaskType.toLowerCase()))
      );
      if (filtered.length >= 2) {
        topAgents = filtered.slice(0, DEFAULT_K);
        console.log(`[GEAReflection] focusTaskType="${focusTaskType}" — filtered pool to ${topAgents.length} matching entries.`);
      } else {
        console.log(`[GEAReflection] focusTaskType="${focusTaskType}" — not enough matching entries (${filtered.length}), using full pool.`);
      }
    }
    console.log('[GEAReflection] CMP-weighted selection: top agents chosen by 0.6×combinedScore + 0.3×cmBonus + 0.1×noveltyScore');

    const pool = this.buildExperiencePool(topAgents);

    let directives: EvolutionDirectives;
    try {
      directives = await this.callReflectionLLM(pool, topAgents, providerId, apiKey);
    } catch (err) {
      console.error('[GEAReflection] LLM reflection call failed:', err);
      return null;
    }

    await fs.ensureDir(this.queenbeeDir);
    await fs.writeJson(this.directivesPath, directives, { spaces: 2 });
    console.log('[GEAReflection] Evolution directives written.');

    // GEA-04: Apply directives to evolved-config
    await this.evolve(directives);

    return directives;
  }

  /**
   * GEA-05: Run a focused repair reflection when an agent is Byzantine-faulted.
   * Queries healthy peers, generates a targeted recovery directive.
   */
  async repairReflect(
    faultedAgentId: string,
    faultSignals: string[],
    providerId = 'auto',
    apiKey?: string
  ): Promise<string | null> {
    const healthyPeers = await this.archive.query({ limit: DEFAULT_K, sortBy: 'combinedScore' });
    if (healthyPeers.length === 0) return null;

    const pool = this.buildExperiencePool(healthyPeers);
    const signalsSummary = faultSignals.join(', ');

    try {
      const response = await unifiedLLMService.chat(providerId, [
        {
          role: 'system',
          content: `You are a repair reflection engine for an AI agent swarm.
Agent "${faultedAgentId}" is stuck with fault signals: ${signalsSummary}.

Here are traces from healthy peer agents:
${pool}

Diagnose the likely failure mode and output a single, concrete recovery directive (2-3 sentences max).
Focus on: what tool or strategy to STOP using, and what to TRY INSTEAD.
Output ONLY the recovery instruction, no JSON, no explanation preamble.`
        }
      ], { apiKey });

      return response.content?.trim() ?? null;
    } catch (err) {
      console.error('[GEAReflection] Repair reflection failed:', err);
      return null;
    }
  }

  /**
   * GEA-04: Read the current evolved config for injection into system prompt.
   * Returns null if no evolved config exists yet.
   */
  async loadEvolvedConfig(): Promise<EvolvedConfig | null> {
    try {
      if (!(await fs.pathExists(this.evolvedConfigPath))) return null;
      return await fs.readJson(this.evolvedConfigPath);
    } catch {
      return null;
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildExperiencePool(agents: ArchiveEntry[]): string {
    return agents.map((a, i) => {
      const successTools = a.toolHistory
        .filter(t => t.outcome === 'success')
        .map(t => t.tool);
      const failTools = a.toolHistory
        .filter(t => t.outcome === 'fail')
        .map(t => t.tool);
      const taskSummary = a.taskOutcomes.length > 0
        ? `${a.taskOutcomes.filter(t => t.success).length}/${a.taskOutcomes.length} tasks succeeded`
        : 'No task data';

      // P17-03: Include lineage note if parentSessionId is set
      const lineageNote = a.parentSessionId
        ? `Lineage: child of session ${a.parentSessionId} (cmBonus: ${(a.cmBonus ?? 0).toFixed(3)})`
        : 'Lineage: root session';

      return `--- Agent ${i + 1} (score: ${a.combinedScore.toFixed(3)}, cmpScore: ${ExperienceArchive.cmpScore(a).toFixed(3)}) ---
Tasks: ${taskSummary}
Successful tools: ${[...new Set(successTools)].join(', ') || 'none'}
Failed tools: ${[...new Set(failTools)].join(', ') || 'none'}
Files modified: ${a.codePatches.join(', ') || 'none'}
${lineageNote}`;
    }).join('\n\n');
  }

  private async callReflectionLLM(
    pool: string,
    agents: ArchiveEntry[],
    providerId: string,
    apiKey?: string
  ): Promise<EvolutionDirectives> {
    const response = await unifiedLLMService.chat(providerId, [
      {
        role: 'system',
        content: `You are an evolution reflection engine for an AI agent swarm.
Analyze the collective experience traces from the top-performing agents below.
Identify: (1) tool usage patterns correlated with success, (2) failure patterns to avoid,
(3) workflow strategies that appeared in high-scoring agents.

Output ONLY valid JSON matching this exact schema:
{
  "workflowDirectives": ["string — specific workflow pattern to adopt"],
  "toolPreferences": ["string — preferred tool or tool ordering"],
  "promptPatches": ["string — prompt strategy improvement"],
  "avoidPatterns": ["string — failure pattern to steer away from"]
}

Limit each array to 3 items max. Be specific and actionable.`
      },
      {
        role: 'user',
        content: `Collective experience pool from top ${agents.length} agents:\n\n${pool}`
      }
    ], { apiKey });

    let parsed: Partial<EvolutionDirectives> = {};
    try {
      const content = response.content?.trim() ?? '{}';
      // Strip possible markdown code fences
      const jsonStr = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('[GEAReflection] Failed to parse directives JSON, using empty defaults.');
    }

    return {
      workflowDirectives: parsed.workflowDirectives ?? [],
      toolPreferences:    parsed.toolPreferences ?? [],
      promptPatches:      parsed.promptPatches ?? [],
      avoidPatterns:      parsed.avoidPatterns ?? [],
      generatedAt:        Date.now(),
      sourceAgentIds:     agents.map(a => a.agentId),
    };
  }

  /** GEA-04: Translate directives into an evolved-config and persist */
  private async evolve(directives: EvolutionDirectives): Promise<void> {
    const prev = await this.loadEvolvedConfig();

    // GEA-07: Pull best workflow operator from MCTS state
    const optimizer = new WorkflowOptimizer(path.dirname(this.queenbeeDir));
    const bestOperator = await optimizer.getBestOperator().catch(() => 'sequential' as const);

    const appendParts: string[] = [];

    if (directives.workflowDirectives.length > 0) {
      appendParts.push(
        '# EVOLVED WORKFLOW DIRECTIVES (auto-generated from swarm experience)\n' +
        directives.workflowDirectives.map(d => `- ${d}`).join('\n')
      );
    }
    if (directives.promptPatches.length > 0) {
      appendParts.push(
        '# EVOLVED PROMPT PATCHES\n' +
        directives.promptPatches.map(p => `- ${p}`).join('\n')
      );
    }

    const evolved: EvolvedConfig = {
      systemPromptAppend:       appendParts.join('\n\n'),
      toolOrderHints:           directives.toolPreferences,
      avoidPatterns:            directives.avoidPatterns,
      retryThresholdOverride:   prev?.retryThresholdOverride,
      workflowOperator:         bestOperator,  // GEA-07
      lastEvolvedAt:            Date.now(),
      sourceDirectiveIds:       [String(directives.generatedAt)],
      version:                  (prev?.version ?? 0) + 1,
    };

    // Save history (keep last MAX_HISTORY)
    if (prev) {
      await fs.ensureDir(this.queenbeeDir);
      await fs.appendFile(
        this.evolvedHistoryPath,
        JSON.stringify({ ...prev, archivedAt: Date.now() }) + '\n',
        'utf-8'
      );
    }

    await fs.writeJson(this.evolvedConfigPath, evolved, { spaces: 2 });
    console.log(`[GEAEvolution] Evolved config v${evolved.version} written.`);
  }
}

/**
 * Convenience function called from HeartbeatService.
 * P17-05: accepts optional focusTaskType to narrow reflection to a stagnating task category.
 */
export async function runGEAReflection(
  projectPath: string,
  providerId = 'auto',
  apiKey?: string,
  focusTaskType?: string
): Promise<void> {
  const r = new GEAReflection(projectPath);
  await r.reflect(providerId, apiKey, focusTaskType).catch(err =>
    console.error(`[GEAReflection] Failed for ${projectPath}:`, err)
  );
}
