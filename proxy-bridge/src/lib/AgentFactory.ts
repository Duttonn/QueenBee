/**
 * P20-05: Runtime Agent Factory (On-Demand Specialization)
 *
 * Creates specialized agent configs at runtime based on task needs,
 * rather than being limited to pre-configured UI_BEE/LOGIC_BEE/TEST_BEE types.
 *
 * Example: "need a database migration specialist" → generates DB_BEE with SQL tools.
 *
 * Inspired by fcn06/swarm's Agent Factory pattern.
 *
 * Integration:
 *   - ToolExecutor.handleSpawnWorker: if role doesn't match known types, invoke factory
 *   - prompts/workers/index.ts: registers generated capabilities
 *   - Cached in .queenbee/agent-templates/ for reuse
 */

import fs from 'fs-extra';
import path from 'path';
import { unifiedLLMService } from './UnifiedLLMService';
import { WorkerCapabilities } from './prompts/workers';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface AgentTemplate {
  /** Unique type identifier (e.g., 'DB_BEE', 'INFRA_BEE') */
  workerType: string;
  /** Generated system prompt */
  prompt: string;
  /** Generated capabilities */
  capabilities: WorkerCapabilities;
  /** When this template was created */
  createdAt: string;
  /** Task description that generated this template */
  sourceTask: string;
  /** How many times this template has been reused */
  useCount: number;
}

export interface FactoryOptions {
  /** Project path for caching templates */
  projectPath: string;
  /** Provider to use for template generation */
  provider?: string;
  /** Max factory calls per session (from PolicyStore) */
  maxCalls?: number;
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const FACTORY_SYSTEM_PROMPT = `You are an agent factory. Given a task description, generate a specialized agent configuration.

Respond in EXACTLY this format (no extra text):

WORKER_TYPE: <SHORT_NAME_BEE> (e.g., DB_BEE, DEPLOY_BEE, API_BEE)
LANGUAGES: <comma-separated list of relevant programming languages>
FRAMEWORKS: <comma-separated list of relevant frameworks/tools>
CAN_WRITE_FILES: <true|false>
CAN_RUN_SHELL: <true|false>
CAN_MODIFY_TESTS: <true|false>
SYSTEM_PROMPT: <A detailed system prompt for this specialized agent. Include its role, expertise areas, key instructions, and any domain-specific knowledge it should have. 3-5 paragraphs.>`;

/* ─── AgentFactory ──────────────────────────────────────────────────── */

// Session-level call tracking (in-memory, resets on restart)
let sessionFactoryCalls = 0;

export class AgentFactory {
  private projectPath: string;
  private templatesDir: string;
  private maxCalls: number;

  constructor(options: FactoryOptions) {
    this.projectPath = options.projectPath;
    this.templatesDir = path.join(options.projectPath, '.queenbee', 'agent-templates');
    this.maxCalls = options.maxCalls ?? 10;
  }

  /**
   * Get the number of factory calls in this session.
   * Used for enforcing max_factory_calls_per_session policy.
   */
  static getSessionFactoryCount(): number {
    return sessionFactoryCalls;
  }
  
  /**
   * Reset session call count (useful for testing).
   */
  static resetSessionFactoryCount(): void {
    sessionFactoryCalls = 0;
  }

  /**
   * Create a specialized agent config from a task description.
   * First checks cache for a matching template, then generates a new one.
   */
  async createAgent(
    taskDescription: string,
    requiredCapabilities?: Partial<WorkerCapabilities>
  ): Promise<AgentTemplate> {
    // 1. Check cache for matching template
    const cached = await this.findCachedTemplate(taskDescription);
    if (cached) {
      cached.useCount++;
      await this.saveTemplate(cached);
      console.log(`[AgentFactory] Reusing cached template: ${cached.workerType}`);
      return cached;
    }

    // 2. Rate limit factory calls
    if (sessionFactoryCalls >= this.maxCalls) {
      console.warn(`[AgentFactory] Max factory calls (${this.maxCalls}) exceeded. Using generic agent.`);
      return this.createGenericTemplate(taskDescription);
    }

    // 3. Generate new template via LLM
    sessionFactoryCalls++;
    return this.generateTemplate(taskDescription, requiredCapabilities);
  }

  /**
   * Generate a new agent template using LLM.
   */
  private async generateTemplate(
    taskDescription: string,
    requiredCapabilities?: Partial<WorkerCapabilities>
  ): Promise<AgentTemplate> {
    const capContext = requiredCapabilities
      ? `\nRequired capabilities: ${JSON.stringify(requiredCapabilities)}`
      : '';

    try {
      const response = await unifiedLLMService.chat('auto', [
        { role: 'system', content: FACTORY_SYSTEM_PROMPT },
        { role: 'user', content: `Task: ${taskDescription}${capContext}` },
      ], {
        maxTokens: 1024,
        temperature: 0.3,
      });

      const text = typeof response === 'string'
        ? response
        : (response as any)?.content || (response as any)?.choices?.[0]?.message?.content || '';

      const template = this.parseFactoryResponse(text, taskDescription);

      // Cache for reuse
      await this.saveTemplate(template);
      console.log(`[AgentFactory] Created new template: ${template.workerType}`);

      return template;
    } catch (err: any) {
      console.warn(`[AgentFactory] LLM generation failed: ${err.message}. Using generic.`);
      return this.createGenericTemplate(taskDescription);
    }
  }

  /**
   * Parse the structured factory response into an AgentTemplate.
   */
  private parseFactoryResponse(text: string, taskDescription: string): AgentTemplate {
    const workerTypeMatch = text.match(/WORKER_TYPE:\s*(\S+)/i);
    const languagesMatch = text.match(/LANGUAGES:\s*(.+)/i);
    const frameworksMatch = text.match(/FRAMEWORKS:\s*(.+)/i);
    const canWriteMatch = text.match(/CAN_WRITE_FILES:\s*(true|false)/i);
    const canShellMatch = text.match(/CAN_RUN_SHELL:\s*(true|false)/i);
    const canTestsMatch = text.match(/CAN_MODIFY_TESTS:\s*(true|false)/i);
    const promptMatch = text.match(/SYSTEM_PROMPT:\s*([\s\S]+)/i);

    const workerType = workerTypeMatch?.[1] || 'CUSTOM_BEE';
    const languages = languagesMatch?.[1]?.split(',').map(l => l.trim()).filter(Boolean) || [];
    const frameworks = frameworksMatch?.[1]?.split(',').map(f => f.trim()).filter(Boolean) || [];

    return {
      workerType,
      prompt: promptMatch?.[1]?.trim() || `You are a specialized ${workerType} agent. ${taskDescription}`,
      capabilities: {
        canWriteFiles: canWriteMatch?.[1]?.toLowerCase() === 'true' || true,
        canRunShell: canShellMatch?.[1]?.toLowerCase() === 'true' || true,
        canModifyTests: canTestsMatch?.[1]?.toLowerCase() === 'true' || false,
        canSpawnWorkers: false,
        languages,
        frameworks,
        allowedTools: [], // All tools allowed by default for custom agents
        reliability: 0.75, // Start lower than established agents
        quality: 0.75,
      },
      createdAt: new Date().toISOString(),
      sourceTask: taskDescription,
      useCount: 1,
    };
  }

  /**
   * Create a generic fallback template when LLM generation fails.
   */
  private createGenericTemplate(taskDescription: string): AgentTemplate {
    return {
      workerType: 'CUSTOM_BEE',
      prompt: `You are a specialized coding agent. Your task: ${taskDescription}\n\nWork carefully, write clean code, and report your progress.`,
      capabilities: {
        canWriteFiles: true,
        canRunShell: true,
        canModifyTests: false,
        canSpawnWorkers: false,
        languages: ['typescript', 'javascript'],
        frameworks: [],
        allowedTools: [],
        reliability: 0.7,
        quality: 0.7,
      },
      createdAt: new Date().toISOString(),
      sourceTask: taskDescription,
      useCount: 1,
    };
  }

  /**
   * Find a cached template that matches the task description.
   * Uses simple keyword overlap for matching.
   */
  private async findCachedTemplate(taskDescription: string): Promise<AgentTemplate | null> {
    await fs.ensureDir(this.templatesDir);
    const files = await fs.readdir(this.templatesDir);
    const templateFiles = files.filter(f => f.endsWith('.json'));

    const taskWords = new Set(taskDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    let bestMatch: AgentTemplate | null = null;
    let bestOverlap = 0;

    for (const file of templateFiles) {
      try {
        const template: AgentTemplate = await fs.readJson(path.join(this.templatesDir, file));
        const sourceWords = new Set(template.sourceTask.toLowerCase().split(/\s+/).filter(w => w.length > 3));

        // Calculate Jaccard-like overlap
        let overlap = 0;
        for (const word of taskWords) {
          if (sourceWords.has(word)) overlap++;
        }
        const score = overlap / Math.max(taskWords.size, 1);

        if (score > 0.6 && score > bestOverlap) {
          bestOverlap = score;
          bestMatch = template;
        }
      } catch {
        // Skip corrupt template files
      }
    }

    return bestMatch;
  }

  /**
   * Save a template to the cache directory.
   */
  private async saveTemplate(template: AgentTemplate): Promise<void> {
    await fs.ensureDir(this.templatesDir);
    const safeName = template.workerType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const filePath = path.join(this.templatesDir, `${safeName}.json`);
    await fs.writeJson(filePath, template, { spaces: 2 });
  }

  /**
   * List all cached templates.
   */
  async listTemplates(): Promise<AgentTemplate[]> {
    await fs.ensureDir(this.templatesDir);
    const files = await fs.readdir(this.templatesDir);
    const templates: AgentTemplate[] = [];

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        templates.push(await fs.readJson(path.join(this.templatesDir, file)));
      } catch {
        // Skip corrupt files
      }
    }

    return templates.sort((a, b) => b.useCount - a.useCount);
  }
}
