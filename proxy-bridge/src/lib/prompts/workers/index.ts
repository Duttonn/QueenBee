import { UI_BEE_PROMPT } from './ui-bee';
import { LOGIC_BEE_PROMPT } from './logic-bee';
import { TEST_BEE_PROMPT } from './test-bee';

/**
 * WorkerType is a free-form string. The 3 built-in types (UI_BEE, LOGIC_BEE, TEST_BEE)
 * have pre-configured prompts and capabilities, but the architect can create ANY type
 * (e.g. DB_BEE, DEPLOY_BEE, SECURITY_BEE, API_BEE) and the AgentFactory will generate
 * a specialized prompt + capabilities on the fly.
 */
export type WorkerType = string;

/* ─── Worker Capabilities ────────────────────────────────────────────── */

/**
 * Formal capability declarations for each worker type.
 * Used by task assignment (matching requirements to capabilities)
 * and by ToolExecutor for permission enforcement.
 */
export interface WorkerCapabilities {
  /** Can this worker write/create files? */
  canWriteFiles: boolean;
  /** Can this worker execute shell commands? */
  canRunShell: boolean;
  /** Can this worker modify test files? */
  canModifyTests: boolean;
  /** Can this worker spawn sub-workers? */
  canSpawnWorkers: boolean;
  /** Programming languages this worker is proficient in */
  languages: string[];
  /** Frameworks/libraries this worker specializes in */
  frameworks: string[];
  /** Allowed tool names (empty = all tools allowed) */
  allowedTools: string[];
  /** Reliability score 0-1 (updated over time by TruthScorer) */
  reliability: number;
  /** Quality score 0-1 (updated over time by verification pipeline) */
  quality: number;
}

const UI_BEE_CAPABILITIES: WorkerCapabilities = {
  canWriteFiles: true,
  canRunShell: true,
  canModifyTests: false,
  canSpawnWorkers: false,
  languages: ['typescript', 'javascript', 'css', 'html'],
  frameworks: ['react', 'vue', 'svelte', 'tailwind', 'css-modules'],
  allowedTools: [
    'write_file', 'read_file', 'read_file_range', 'run_shell',
    'chat_with_team', 'report_completion', 'write_memory', 'read_memory',
    'replace', 'search_files', 'search_symbol',
  ],
  reliability: 0.9,
  quality: 0.85,
};

const LOGIC_BEE_CAPABILITIES: WorkerCapabilities = {
  canWriteFiles: true,
  canRunShell: true,
  canModifyTests: false,
  canSpawnWorkers: false,
  languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  frameworks: ['express', 'fastify', 'next', 'prisma', 'drizzle'],
  allowedTools: [], // Empty = ALL tools allowed
  reliability: 0.9,
  quality: 0.9,
};

const TEST_BEE_CAPABILITIES: WorkerCapabilities = {
  canWriteFiles: true,
  canRunShell: true,
  canModifyTests: true,
  canSpawnWorkers: false,
  languages: ['typescript', 'javascript'],
  frameworks: ['jest', 'vitest', 'cypress', 'playwright', 'testing-library'],
  allowedTools: [
    'write_file', 'read_file', 'read_file_range', 'run_shell',
    'chat_with_team', 'report_completion', 'write_memory', 'read_memory',
    'replace', 'search_files', 'search_symbol',
  ],
  reliability: 0.9,
  quality: 0.9,
};

const GENERIC_CAPABILITIES: WorkerCapabilities = {
  canWriteFiles: true,
  canRunShell: true,
  canModifyTests: true,
  canSpawnWorkers: false,
  languages: [],
  frameworks: [],
  allowedTools: [],
  reliability: 0.8,
  quality: 0.8,
};

/* ─── Runtime Registry (for factory-generated types) ─────────────────── */

/**
 * Runtime registry for dynamically created worker types.
 * AgentFactory registers new types here so getWorkerPrompt/getWorkerCapabilities
 * can resolve them without code changes.
 */
const runtimePrompts = new Map<string, string>();
const runtimeCapabilities = new Map<string, WorkerCapabilities>();

/** Register a dynamically created worker type at runtime. */
export function registerWorkerType(type: string, prompt: string, capabilities: WorkerCapabilities): void {
  runtimePrompts.set(type, prompt);
  runtimeCapabilities.set(type, capabilities);
}

/** Check if a worker type is registered (built-in or runtime). */
export function isKnownWorkerType(type: string): boolean {
  return ['UI_BEE', 'LOGIC_BEE', 'TEST_BEE'].includes(type)
    || runtimePrompts.has(type);
}

/* ─── Exports ────────────────────────────────────────────────────────── */

export function getWorkerPrompt(type: WorkerType): string {
  switch (type) {
    case 'UI_BEE': return UI_BEE_PROMPT;
    case 'LOGIC_BEE': return LOGIC_BEE_PROMPT;
    case 'TEST_BEE': return TEST_BEE_PROMPT;
    default:
      // Check runtime registry for factory-generated types
      return runtimePrompts.get(type) || `You are a specialized ${type} worker agent. Execute your assigned task with precision.`;
  }
}

export function getWorkerCapabilities(type: WorkerType | string): WorkerCapabilities {
  switch (type) {
    case 'UI_BEE': return { ...UI_BEE_CAPABILITIES };
    case 'LOGIC_BEE': return { ...LOGIC_BEE_CAPABILITIES };
    case 'TEST_BEE': return { ...TEST_BEE_CAPABILITIES };
    default:
      // Check runtime registry for factory-generated types
      const runtime = runtimeCapabilities.get(type);
      if (runtime) return { ...runtime };
      return { ...GENERIC_CAPABILITIES };
  }
}

/**
 * Check if a worker with given capabilities is allowed to use a specific tool.
 * Returns true if allowed, false if blocked.
 */
export function isToolAllowed(capabilities: WorkerCapabilities, toolName: string): boolean {
  // Empty allowedTools = all tools permitted
  if (capabilities.allowedTools.length === 0) return true;

  // Special enforcement beyond the allowedTools list
  if (toolName === 'run_shell' && !capabilities.canRunShell) return false;
  if (toolName === 'spawn_worker' && !capabilities.canSpawnWorkers) return false;

  return capabilities.allowedTools.includes(toolName);
}
