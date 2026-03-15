import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { unifiedLLMService } from '../../../lib/UnifiedLLMService';

/**
 * POST /api/browser/launch
 * Analyzes a project's structure and determines how to start its dev server.
 *
 * Body: { projectPath: string, providerId?: string, model?: string, apiKey?: string }
 * Returns: { commands: string[], ports: number[], notes: string }
 *
 * GET /api/browser/launch?projectPath=...
 * Returns: current run status { running: boolean, pid?: number, port?: number, url?: string }
 *
 * DELETE /api/browser/launch
 * Stops the running dev server process.
 */

// In-memory state for the running dev server
let runState: {
  pid: number;
  port: number | null;
  url: string | null;
  proc: ReturnType<typeof spawn>;
  log: string[];
} | null = null;

const MAX_LOG_LINES = 200;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      running: !!runState,
      pid: runState?.pid,
      port: runState?.port,
      url: runState?.url,
      log: runState?.log.slice(-50) ?? [],
    });
  }

  if (req.method === 'DELETE') {
    if (runState) {
      try { process.kill(-runState.pid, 'SIGTERM'); } catch { try { runState.proc.kill('SIGTERM'); } catch {} }
      runState = null;
    }
    return res.status(200).json({ stopped: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectPath, providerId, model, apiKey, action } = req.body as {
    projectPath?: string;
    providerId?: string;
    model?: string;
    apiKey?: string;
    action?: 'analyze' | 'run';
  };

  if (!projectPath) return res.status(400).json({ error: 'projectPath is required' });
  if (!await fs.pathExists(projectPath)) return res.status(400).json({ error: 'Project path does not exist' });

  // ── Analyze: ask LLM how to start the project ──────────────────────────────
  if (action === 'analyze' || !action) {
    const context = await buildProjectContext(projectPath);

    const systemPrompt = `You are a developer assistant. Given a project's file structure and config files, determine the exact shell commands needed to:
1. Install dependencies (if not already installed)
2. Start the development server(s)

Respond ONLY with a JSON object in this exact format, no other text:
{
  "commands": ["command1", "command2"],
  "ports": [3000],
  "notes": "Brief one-line description of what will start"
}

Rules:
- Use the shortest working command sequence
- If node_modules exists, skip npm install
- Prefer npm/yarn/pnpm scripts found in package.json
- For monorepos, start all relevant services
- Only include ports you are confident the server will use`;

    const userMsg = `Project directory: ${projectPath}\n\n${context}`;

    try {
      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userMsg },
      ];
      const llmResponse = await unifiedLLMService.chat(
        providerId || 'auto',
        llmMessages,
        { model, apiKey: apiKey || undefined, maxTokens: 512, temperature: 0 },
      );
      const reply = llmResponse.content;

      let parsed: { commands: string[]; ports: number[]; notes: string };
      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reply);
      } catch {
        return res.status(200).json({
          commands: [],
          ports: [],
          notes: 'Could not parse LLM response',
          raw: reply,
        });
      }
      return res.status(200).json(parsed);
    } catch (err: any) {
      return res.status(500).json({ error: 'LLM analysis failed', details: err.message });
    }
  }

  // ── Run: spawn the dev server ───────────────────────────────────────────────
  if (action === 'run') {
    const { commands, port } = req.body as { commands: string[]; port?: number };
    if (!commands?.length) return res.status(400).json({ error: 'commands array required' });

    // Stop any existing run
    if (runState) {
      try { process.kill(-runState.pid, 'SIGTERM'); } catch { try { runState.proc.kill('SIGTERM'); } catch {} }
      runState = null;
    }

    // Compose a shell script from the commands
    const script = commands.join(' && ');
    const proc = spawn('bash', ['-lc', script], {
      cwd: projectPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || '/usr/bin:/bin'}`,
        FORCE_COLOR: '1',
      },
    });

    const logLines: string[] = [];
    const appendLog = (line: string) => {
      logLines.push(line);
      if (logLines.length > MAX_LOG_LINES) logLines.shift();
      // Auto-detect port from output (e.g. "Local: http://localhost:5173")
      if (!runState?.port) {
        const portMatch = line.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
        if (portMatch && runState) {
          runState.port = parseInt(portMatch[1]);
          runState.url = `http://localhost:${runState.port}`;
        }
      }
    };

    proc.stdout?.on('data', (d: Buffer) => d.toString().split('\n').filter(Boolean).forEach(appendLog));
    proc.stderr?.on('data', (d: Buffer) => d.toString().split('\n').filter(Boolean).forEach(appendLog));
    proc.on('exit', () => { if (runState?.pid === proc.pid) runState = null; });

    runState = { pid: proc.pid!, port: port ?? null, url: port ? `http://localhost:${port}` : null, proc, log: logLines };

    return res.status(200).json({ started: true, pid: proc.pid });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

async function buildProjectContext(dir: string): Promise<string> {
  const sections: string[] = [];

  // List top-level files
  try {
    const entries = await fs.readdir(dir);
    sections.push(`Top-level files: ${entries.slice(0, 40).join(', ')}`);
  } catch {}

  // Read key config files
  const keyFiles = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'Makefile',
    'docker-compose.yml',
    'docker-compose.yaml',
    '.env.example',
    'README.md',
    'Cargo.toml',
    'pyproject.toml',
    'requirements.txt',
    'go.mod',
  ];

  for (const file of keyFiles) {
    const filePath = path.join(dir, file);
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        // Limit size to avoid token overload
        const truncated = content.slice(0, file === 'README.md' ? 800 : 2000);
        sections.push(`\n=== ${file} ===\n${truncated}${content.length > truncated.length ? '\n[truncated]' : ''}`);
      }
    } catch {}
  }

  // Check if node_modules exists
  const hasNodeModules = await fs.pathExists(path.join(dir, 'node_modules'));
  sections.push(`\nnode_modules installed: ${hasNodeModules}`);

  return sections.join('\n');
}
