import fs from 'fs-extra';
import path from 'path';
import os from 'os';

interface AgentDefinition {
  type: string;
  name: string;
  description: string;
  allowedTools: string[];
  prompt: string;
}

class AgentSyncService {
  private agentsDir = path.join(os.homedir(), '.claude', 'agents');

  private definitions: AgentDefinition[] = [
    {
      type: 'ui-bee',
      name: 'UI Bee',
      description: 'Frontend specialist for React/TypeScript UI components, styling, and layout.',
      allowedTools: ['write_file', 'read_file', 'read_file_range', 'run_shell', 'chat_with_team', 'report_completion', 'write_memory', 'read_memory', 'replace', 'search_files', 'search_symbol'],
      prompt: ''
    },
    {
      type: 'logic-bee',
      name: 'Logic Bee',
      description: 'Backend/logic specialist for TypeScript APIs, services, and business logic.',
      allowedTools: [],
      prompt: ''
    },
    {
      type: 'test-bee',
      name: 'Test Bee',
      description: 'Testing specialist for Jest/Vitest/Playwright test writing and coverage.',
      allowedTools: ['write_file', 'read_file', 'read_file_range', 'run_shell', 'chat_with_team', 'report_completion', 'write_memory', 'read_memory', 'replace', 'search_files', 'search_symbol'],
      prompt: ''
    }
  ];

  private buildMarkdown(def: AgentDefinition): string {
    const tools = def.allowedTools.length === 0 ? '*' : def.allowedTools.join(', ');
    return [
      '---',
      `name: ${def.type}`,
      `description: ${def.description}`,
      `tools: ${tools}`,
      '---',
      '',
      `# ${def.name}`,
      '',
      def.prompt || `You are a specialized ${def.name} agent for QueenBee. Focus on ${def.description.toLowerCase()}`,
    ].join('\n');
  }

  async syncAll(workerPromptsDir?: string): Promise<{ synced: string[]; paths: string[] }> {
    await fs.ensureDir(this.agentsDir);
    const synced: string[] = [];
    const paths: string[] = [];

    for (const def of this.definitions) {
      if (workerPromptsDir) {
        const workerFile = path.join(workerPromptsDir, `${def.type}.ts`);
        if (await fs.pathExists(workerFile)) {
          const content = await fs.readFile(workerFile, 'utf-8');
          const match = content.match(/export const \w+_PROMPT\s*=\s*`([\s\S]*?)`/);
          if (match) def.prompt = match[1].trim();
        }
      }

      const filePath = path.join(this.agentsDir, `${def.type}.md`);
      await fs.writeFile(filePath, this.buildMarkdown(def));
      synced.push(def.type);
      paths.push(filePath);
    }

    return { synced, paths };
  }

  async listSynced(): Promise<string[]> {
    if (!(await fs.pathExists(this.agentsDir))) return [];
    const files = await fs.readdir(this.agentsDir);
    return files.filter(f => f.endsWith('.md')).map(f => path.join(this.agentsDir, f));
  }
}

export const agentSyncService = new AgentSyncService();
