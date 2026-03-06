/**
 * P18-19: AgentsmdLoader — hierarchical AGENTS.md context injection
 *
 * Scans for AGENTS.md files at project-level, module-level (src/ subdirectories),
 * and component-level directories. Merges them in hierarchy order:
 *   project-level → module-level → component-level
 *
 * The merged result is used in the frozen snapshot (P18-03) so it's cached
 * by Anthropic prefix caching across all calls in a session.
 *
 * Pattern from oh-my-opencode `/init-deep` + goclaw 7-tier bootstrap.
 */

import fs from 'fs-extra';
import path from 'path';

export interface AgentsMdResult {
  /** Merged content from all discovered AGENTS.md files. */
  content: string;
  /** List of files that were found and merged. */
  sources: string[];
}

export class AgentsmdLoader {
  private projectPath: string;
  private maxDepth: number;

  constructor(projectPath: string, options: { maxDepth?: number } = {}) {
    this.projectPath = projectPath;
    this.maxDepth = options.maxDepth ?? 3;
  }

  /**
   * Discover and merge all AGENTS.md files from project root to current working directory.
   * Higher-level (project-root) content appears first; deeper content overrides/extends.
   */
  async load(cwdRelative?: string): Promise<AgentsMdResult> {
    const sources: string[] = [];
    const sections: string[] = [];

    // Level 1: project root
    const rootAgents = path.join(this.projectPath, 'AGENTS.md');
    if (await fs.pathExists(rootAgents)) {
      sources.push(rootAgents);
      sections.push(await fs.readFile(rootAgents, 'utf-8'));
    }

    // Level 2: src/ level (if exists)
    const srcDir = path.join(this.projectPath, 'src');
    const srcAgents = path.join(srcDir, 'AGENTS.md');
    if (await fs.pathExists(srcAgents)) {
      sources.push(srcAgents);
      sections.push(await fs.readFile(srcAgents, 'utf-8'));
    }

    // Level 3: current working directory (if provided and within project)
    if (cwdRelative) {
      const cwdAbs = path.resolve(this.projectPath, cwdRelative);
      if (cwdAbs.startsWith(this.projectPath) && cwdAbs !== this.projectPath) {
        const cwdAgents = path.join(cwdAbs, 'AGENTS.md');
        if (await fs.pathExists(cwdAgents)) {
          sources.push(cwdAgents);
          sections.push(await fs.readFile(cwdAgents, 'utf-8'));
        }
      }
    }

    // Level 4: scan common subdirectories for AGENTS.md (lib, components, pages, api)
    const commonDirs = ['lib', 'components', 'pages', 'api', 'services', 'hooks', 'utils'];
    for (const dir of commonDirs) {
      const candidate = path.join(this.projectPath, 'src', dir, 'AGENTS.md');
      if (await fs.pathExists(candidate) && !sources.includes(candidate)) {
        sources.push(candidate);
        sections.push(await fs.readFile(candidate, 'utf-8'));
      }
    }

    const content = sections
      .filter(Boolean)
      .join('\n\n---\n\n');

    return { content, sources };
  }

  /**
   * Generate a minimal AGENTS.md for a directory by analyzing its files with LLM.
   * Uses Haiku for cost efficiency.
   */
  async generateForDirectory(
    targetDir: string,
    providerId: string,
    apiKey?: string
  ): Promise<string> {
    const absDir = path.resolve(this.projectPath, targetDir);
    if (!absDir.startsWith(this.projectPath)) {
      throw new Error('Directory must be within project root');
    }

    // List files in the directory
    let files: string[] = [];
    try {
      files = await fs.readdir(absDir);
    } catch {
      return '';
    }

    const codeFiles = files.filter(f =>
      /\.(ts|tsx|js|jsx|py|go|rs)$/.test(f)
    ).slice(0, 10);

    if (codeFiles.length === 0) return '';

    // Sample the first file for context
    let sampleContent = '';
    try {
      const sampleFile = path.join(absDir, codeFiles[0]);
      const raw = await fs.readFile(sampleFile, 'utf-8');
      sampleContent = raw.slice(0, 1500);
    } catch { /* skip */ }

    const { unifiedLLMService } = await import('../UnifiedLLMService');

    const prompt = `Generate a concise AGENTS.md file for the directory "${targetDir}" in a codebase.
Files in this directory: ${codeFiles.join(', ')}

Sample code from ${codeFiles[0]}:
${sampleContent}

The AGENTS.md should contain:
1. What this directory/module is responsible for (2-3 sentences)
2. Key files and their purposes
3. Coding conventions specific to this module
4. What to avoid when modifying this module

Keep it under 200 words. Use markdown headers.`;

    // P18-21: Use exploration-tier model for directory analysis (cheap scan operation)
    const response = await unifiedLLMService.chat(
      providerId,
      [{ role: 'user', content: prompt }],
      unifiedLLMService.getExplorationOptions(providerId, { maxTokens: 400, apiKey })
    );

    return response.content || '';
  }
}
