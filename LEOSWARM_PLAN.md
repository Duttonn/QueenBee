# Leoswarm Integration Plan for QueenBee

> **Created**: 2026-02-19
> **Status**: Research complete — Ready for implementation
> **Priority**: HIGH — Core swarm governance gap

---

## 1. Context & Motivation

QueenBee already has a functional multi-agent swarm (Roundtable, MemoryStore, ProposalService, HeartbeatService, MedicAgent) but lacks **governance, scope isolation, synthesis, and autonomous error recovery** that make Leoswarm-style swarms effective at scale.

Research (notebookresearch/ + papers: Reflexion, LATS, Voyager, SWE-agent, MAST) reveals *why* these gaps cause failures:
- Workers drift into each other's files (no scope enforcement)
- Proposals cascade without debate (fire-and-forget ProposalService)
- No audit trail of session accomplishments
- Agents halt with "I can't" instead of escalating to peers
- Task ordering is advisory only — any agent can start any task
- No Byzantine fault detection — loops, garbage, stalls go unnoticed
- Context window overflows on 30+ step tasks with no compression

**Goal**: Implement 9 capabilities (LS-01 through LS-09) that close these gaps, grounded in concrete research implementations.

---

## 2. What Already Exists — DO NOT DUPLICATE

| Leoswarm Tool | QueenBee Equivalent | Status |
|---|---|---|
| `swarm_claim_task` | `claim_task` (PLAN.md) | ✅ Equivalent |
| `swarm_complete_task` | `report_completion` | ✅ Equivalent |
| `swarm_heartbeat` | `HeartbeatService.ts` | ✅ Equivalent |
| `swarm_remember` / `swarm_recall` | `write_memory` / `read_memory` | ✅ Equivalent |
| `swarm_confirm/challenge_memory` | `MemoryStore.reinforceConfidence` / `decayConfidence` | ✅ Equivalent |
| `swarm_medic` | `MedicAgent.ts` | ✅ Equivalent (better) |
| `swarm_propose` | `submit_proposal` | ✅ Equivalent |
| `swarm_status` | `check_status` | ✅ Equivalent |
| `swarm_react` (partial) | `chat_with_team` | ✅ Covered by Roundtable |

---

## 3. Competitive Landscape

| Product | Architecture | Key Weakness |
|---|---|---|
| **Orchids** | Single agent, full-stack | No multi-agent coordination |
| **Devin** | Cloud-parallel workers + human HITL | Human-in-loop slows iteration; no agent-to-agent governance |
| **Claude Code** | Lead + subagents | No proposal debate, no escalation, no scope isolation |
| **Cursor** | 8 background parallel agents | No swarm memory, no coordination protocol |
| **MetaGPT** | 5 rigid roles, assembly-line | Fixed roles, no debate cycle, no scope enforcement |
| **CrewAI** | Role-based LLM orchestration | No file-scope isolation, no synthesis, no dependency enforcement |
| **LangGraph** | Generic DAG routing | Domain-agnostic, no swarm memory, no governance |

**QueenBee's unique position after this plan**: Local-first `.queenbee/` coordination + debate-driven governance + autonomous recovery. No competitor fully implements agent-to-agent proposal debate with confidence-based mutation.

---

## 4. Research Foundation

### 4.1 Free-MAD (Free Multi-Agent Debate)
- **Mechanism**: Devil's Advocate challenges proposal with risks/questions/severity. Judge scores 0-100. Confidence threshold determines proposal fate.
- **Thresholds**: ≥90=ship, ≥80=approved, ≥70=mutate+stressor required, <70=reject
- **Anti-conformity**: Detects cosine similarity >0.95 between positions, forces divergence
- **Critical rule**: When confidence < 80, `stressor` MUST be actionable ("XSS via localStorage + no token refresh"), NOT vague ("security issues")
- **Application**: `challenge_proposal` + `judge_proposal` in ProposalService (LS-04)

### 4.2 CP-WBFT (Confidence-Probe Byzantine Fault Tolerance)
- **Mechanism**: Weight votes by historical confidence track record. Tolerates 85.7% faulty agents.
- **HCP (Hidden Confidence Probing)**: Extract true confidence from hidden layer activations, not surface text — agent can claim "very confident" while logits say otherwise
- **Application**: Judge confidence < 60 auto-rejects; agents with repeated low scores get deprioritized

### 4.3 PLAS & ATLAS Scheduling
- **PLAS**: `priority = 1 / cumulative_tokens_consumed` — newest agents get highest priority, prevents head-of-line blocking
- **ATLAS (DAG extension)**: Priority based on critical path length, not just token count — deprioritize tasks that don't block anything downstream
- **Application**: `checkDependencies()` blocks task claiming if `depends_on` tasks not DONE (LS-05)

### 4.4 Reflexion (Shinn et al. 2023)
- **Mechanism**: No gradient updates. Convert evaluation signals into natural-language reflections stored in context window. Prepend reflections before next attempt.
- **Sliding window**: Keep last 3 reflections (older ones evicted). Each reflection is 2-5 sentences with specific root cause + correction.
- **Evaluator**: Task-specific (test pass rate for code, LLM judge for reasoning). Must be fast + deterministic.
- **Application**: LS-07 Layer 1 — on 3x same error, inject verbal reflection prompt

### 4.5 LATS (Language Agent Tree Search, ICML 2024)
- **Mechanism**: MCTS over action space. UCT score: `avgReward + explorationWeight * sqrt(log(parentVisits) / nodeVisits)`. Unvisited nodes get Infinity priority.
- **Phases**: Select (UCT) → Expand (generate N parallel candidates) → Simulate (run to terminal) → Backpropagate (update value up tree)
- **Reflections injected** at expand phase — all sibling/cousin failures inform next exploration
- **Application**: LS-07 Layer 2 — when primary approach fails, explore alternative paths

### 4.6 Voyager Skill Library Pattern
- **Mechanism**: 3-phase loop — Curriculum (what to try) → Iterative code gen with critic (4 retries) → Skill storage (only verified successes stored)
- **Critic verification**: LLM judge checks if task was actually completed (not just if code ran). Stores failure critique back into retry context.
- **Application**: LS-07 — `escalate_to_expert` routes to specialist who has verified skill for the capability needed

### 4.7 SWE-agent Context Management (ACI)
- **Windowed file view**: Show 100 lines at a time with scroll/goto_line. Never dump entire large files.
- **History processor**: Keep last 5 messages in full; collapse older messages to single-line summaries; deduplicate repeated errors.
- **Context folding**: After each subtask completes, compress history to: outcome (1 sentence) + key decisions (bullets) + artifacts (file list). Full trajectory discarded.
- **Linter-validated edit**: Run linter BEFORE writing file. If syntax errors, show before/after diff and reject without writing.
- **Application**: LS-09 — Context compression for long-horizon tasks

### 4.8 Byzantine Fault Detection (MAST 2025)
- **Loop detection signals**: (1) Exact output hash repetition, (2) Action sequence n-gram repetition (window=6), (3) Stall — same state >60s, (4) Low token entropy (<3 bits = repetitive garbage), (5) Token explosion (>3x expected length)
- **Circuit breaker**: 3 failures → OPEN state (block for 30s) → HALF_OPEN (one probe) → CLOSED (reset)
- **Application**: LS-08 — ByzantineDetector + AgentCircuitBreaker in AutonomousRunner

### 4.9 AIOS Access Manager Pattern
- **Mechanism**: Privilege groups with fcntl-style locking. Write access validated against registered scope.
- **Application**: LS-01 — `set_work_environment` + scope validation in `write_file`

### 4.10 Blackboard Architecture
- **Mechanism**: Shared structured knowledge store alongside unstructured chat. Typed entries, filterable by taskId.
- **Application**: LS-02 — `.queenbee/findings.json` structured blackboard

### 4.11 H-MEM Aggregation
- **Mechanism**: 4-level hierarchy (Domain→Category→Trace→Episode). Single call returns ~100 token summary vs 400+ tokens for manual calls.
- **Application**: LS-03 — `read_swarm_context` single-call grounding

---

## 5. Features to Implement (9 Tasks)

---

### LS-01 — `set_work_environment` (File Scope Isolation)

**Problem**: Workers silently modify each other's files. `FileOwnershipRegistry` tracks but doesn't enforce.

**Files**:
- `proxy-bridge/src/lib/ToolDefinitions.ts` — Add tool definition
- `proxy-bridge/src/lib/ToolExecutor.ts` — Add case handler + scope guard in `write_file`
- `proxy-bridge/src/lib/ProjectTaskManager.ts` — Add `setWorkEnvironment()`, `getWorkEnvironment()`

**Implementation**:
```typescript
// Tool definition (ToolDefinitions.ts)
{
  name: 'set_work_environment',
  description: 'Lock which files this task is allowed to modify. Call this before starting work to prevent scope drift. Other agents cannot write to these files while you have them locked.',
  input_schema: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'Task ID you are working on' },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'File paths or glob patterns (e.g. "src/auth/**/*.ts")'
      },
      notes: { type: 'string', description: 'Why this scope was chosen' }
    },
    required: ['taskId', 'files']
  }
}

// ProjectTaskManager.ts — new methods
async setWorkEnvironment(taskId: string, files: string[], notes?: string, projectPath?: string): Promise<void> {
  const envPath = path.join(projectPath || this.projectPath, '.queenbee', 'work-environments.json');
  const envs = JSON.parse(await fs.readFile(envPath, 'utf8').catch(() => '{}'));
  envs[taskId] = { files, notes, setAt: new Date().toISOString() };
  await fs.writeFile(envPath, JSON.stringify(envs, null, 2));
}

async getWorkEnvironment(taskId: string, projectPath?: string): Promise<{ files: string[]; notes?: string } | null> {
  const envPath = path.join(projectPath || this.projectPath, '.queenbee', 'work-environments.json');
  const envs = JSON.parse(await fs.readFile(envPath, 'utf8').catch(() => '{}'));
  return envs[taskId] || null;
}

// ToolExecutor.ts — scope guard at TOP of write_file case
const env = await ptm.getWorkEnvironment(args.taskId || currentTaskId || '');
if (env?.files?.length) {
  const allowed = env.files.some(pattern =>
    args.path.includes(pattern) || minimatch(args.path, pattern)
  );
  if (!allowed) {
    throw new Error(`SCOPE_VIOLATION: '${args.path}' is outside work environment for task ${currentTaskId}. Allowed: ${env.files.join(', ')}`);
  }
}
```

**Storage**: `.queenbee/work-environments.json` — `{ [taskId]: { files, notes, setAt } }`

---

### LS-02 — `write_finding` / `read_findings` (Structured Research Blackboard)

**Problem**: Findings buried in roundtable JSONL — not searchable by task or agent.

**Files**:
- `proxy-bridge/src/lib/ToolDefinitions.ts` — Add 2 tool definitions
- `proxy-bridge/src/lib/ToolExecutor.ts` — Add 2 case handlers

**Implementation**:
```typescript
// Finding schema
interface Finding {
  id: string;           // uuid
  taskId: string;
  agentId: string;
  title: string;
  content: string;
  tags: string[];
  confidence: number;   // 0-1, agent's confidence in this finding
  timestamp: string;
}

// write_finding case handler
case 'write_finding': {
  const finding: Finding = {
    id: uuidv4(),
    taskId: args.taskId || currentTaskId,
    agentId: args.agentId || sessionId,
    title: args.title,
    content: args.content,
    tags: args.tags || [],
    confidence: args.confidence ?? 0.8,
    timestamp: new Date().toISOString()
  };
  const fp = path.join(projectPath, '.queenbee', 'findings.json');
  const findings = JSON.parse(await fs.readFile(fp, 'utf8').catch(() => '[]'));
  findings.push(finding);
  await fs.writeFile(fp, JSON.stringify(findings, null, 2));
  return { success: true, id: finding.id };
}

// read_findings case handler
case 'read_findings': {
  const fp = path.join(projectPath, '.queenbee', 'findings.json');
  let findings: Finding[] = JSON.parse(await fs.readFile(fp, 'utf8').catch(() => '[]'));
  if (args.taskId) findings = findings.filter(f => f.taskId === args.taskId);
  if (args.agentId) findings = findings.filter(f => f.agentId === args.agentId);
  if (args.tags?.length) findings = findings.filter(f => args.tags.some(t => f.tags.includes(t)));
  const limit = args.limit ?? 20;
  return findings.slice(-limit);
}
```

---

### LS-03 — `read_swarm_context` (Unified Brain Aggregation)

**Problem**: Agents need 4+ calls (read_memory, check_status, roundtable, PLAN.md) to ground themselves.

**Files**:
- `proxy-bridge/src/lib/ToolDefinitions.ts` — Add tool definition
- `proxy-bridge/src/lib/ToolExecutor.ts` — Add case handler

**Implementation**:
```typescript
case 'read_swarm_context': {
  // 1. Mission — first 500 chars of PLAN.md
  const planPath = path.join(projectPath, '.queenbee', 'PLAN.md');
  const planContent = await fs.readFile(planPath, 'utf8').catch(() => '');
  const mission = planContent.slice(0, 500);

  // 2. Task counts — parse PLAN.md
  const pending = (planContent.match(/^- \[ \]/gm) || []).length;
  const inProgress = (planContent.match(/^- \[\/\]/gm) || []).length;
  const done = (planContent.match(/^- \[x\]/gm) || []).length;

  // 3. Recent roundtable messages — last 3
  const recentMessages = await roundtable.getRecentMessages(projectPath, 3);

  // 4. Top memories by confidence — top 5
  const memories = await memoryStore.getTopMemories(projectPath, 5);

  // 5. Open proposals
  const proposals = await proposalService.getPendingProposals(projectPath);

  // 6. Session summary (if exists)
  const summaryPath = path.join(projectPath, '.queenbee', 'session-summary.md');
  const sessionSummary = await fs.readFile(summaryPath, 'utf8').catch(() => null);

  return {
    mission,
    tasks: { pending, inProgress, done },
    recentMessages,
    topMemories: memories,
    openProposals: proposals,
    sessionSummary: sessionSummary?.slice(0, 300) || null
  };
}
```

**Return shape** (~100 tokens vs 400+ for manual calls):
```typescript
{
  mission: string;           // First 500 chars of PLAN.md
  tasks: { pending: number; inProgress: number; done: number };
  recentMessages: RoundtableMessage[];  // Last 3
  topMemories: Memory[];     // Top 5 by confidence
  openProposals: Proposal[]; // Status = 'pending'
  sessionSummary: string | null;
}
```

---

### LS-04 — `challenge_proposal` / `judge_proposal` (Free-MAD Debate Cycle)

**Problem**: ProposalService is fire-and-forget. No challenge, no judge, no mutation protocol.

**Files**:
- `proxy-bridge/src/lib/ProposalService.ts` — Add types + challenge() + judge() + getPendingChallenges()
- `proxy-bridge/src/lib/ToolDefinitions.ts` — Add 2 tool definitions
- `proxy-bridge/src/lib/ToolExecutor.ts` — Add 2 case handlers

**New types in ProposalService.ts**:
```typescript
interface Challenge {
  id: string;
  agentId: string;
  risks: string[];          // specific failure modes (not vague)
  questions: string[];      // unresolved assumptions
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

type ConfidenceLevel = 'ship' | 'approved' | 'mutation_required' | 'mutation_major' | 'rejected';

interface Judgment {
  agentId: string;
  confidence: number;            // 0-100
  confidenceLevel: ConfidenceLevel;
  reasoning: string;
  stressor?: string;             // REQUIRED if confidence < 80. Must be actionable.
  timestamp: string;
}

// Updated Proposal interface (extend existing)
interface Proposal {
  // ... existing fields ...
  challenges?: Challenge[];
  judgment?: Judgment;
}
```

**New methods in ProposalService.ts**:
```typescript
async challenge(
  proposalId: string,
  agentId: string,
  risks: string[],
  questions: string[],
  severity: Challenge['severity']
): Promise<Proposal | null> {
  const proposals = await this.loadProposals(projectPath);
  const p = proposals.find(x => x.id === proposalId);
  if (!p) return null;
  const challenge: Challenge = {
    id: uuidv4(),
    agentId,
    risks,
    questions,
    severity,
    timestamp: new Date().toISOString()
  };
  p.challenges = [...(p.challenges || []), challenge];
  await this.saveProposals(proposals, projectPath);
  return p;
}

async judge(
  proposalId: string,
  agentId: string,
  confidence: number,
  reasoning: string,
  stressor?: string
): Promise<Proposal | null> {
  if (confidence < 80 && !stressor) {
    throw new Error('stressor is required when confidence < 80. Provide a specific actionable concern.');
  }

  const level: ConfidenceLevel =
    confidence >= 90 ? 'ship' :
    confidence >= 80 ? 'approved' :
    confidence >= 70 ? 'mutation_required' :
    confidence >= 60 ? 'mutation_major' : 'rejected';

  const proposals = await this.loadProposals(projectPath);
  const p = proposals.find(x => x.id === proposalId);
  if (!p) return null;

  p.judgment = { agentId, confidence, confidenceLevel: level, reasoning, stressor, timestamp: new Date().toISOString() };

  // Set status based on level
  if (level === 'ship' || level === 'approved') {
    p.status = 'approved';
  } else if (level === 'mutation_required' || level === 'mutation_major') {
    p.status = 'pending'; // stays pending with stressor for mutation
  } else {
    p.status = 'rejected';
  }

  await this.saveProposals(proposals, projectPath);

  // Broadcast judgment to roundtable
  await roundtable.addMessage(projectPath, {
    agentId,
    message: `[JUDGMENT] Proposal "${p.title}" → ${level.toUpperCase()} (confidence: ${confidence}/100)${stressor ? `. Stressor: ${stressor}` : ''}. Reasoning: ${reasoning}`,
    type: 'judgment'
  });

  return p;
}
```

**Confidence Rubric**:
```
≥90 → ship          → Deploy immediately, no changes needed
80-89 → approved    → Minor concerns, proceed
70-79 → mutation_required → Rethink approach (stressor specifies what)
60-69 → mutation_major   → Fundamental redesign required
<60  → rejected          → Unacceptable risk
```

---

### LS-05 — Task Dependency Enforcement

**Problem**: Task B can start before Task A completes. No hard blocking.

**Files**:
- `proxy-bridge/src/lib/ProjectTaskManager.ts` — Add `checkDependencies()`, update `claimTask()`
- `proxy-bridge/src/lib/ToolExecutor.ts` — Handle blocked response in `claim_task` case

**Format in PLAN.md**:
```markdown
- [ ] FEAT-02: [Backend] Build auth service (depends_on: FEAT-01)
- [ ] FEAT-03: [Frontend] Auth UI (depends_on: FEAT-01, FEAT-02)
```

**Implementation**:
```typescript
// ProjectTaskManager.ts
async checkDependencies(taskId: string, projectPath?: string): Promise<{
  blocked: boolean;
  waitingOn: string[];
}> {
  const planPath = path.join(projectPath || this.projectPath, '.queenbee', 'PLAN.md');
  const content = await fs.readFile(planPath, 'utf8');
  const lines = content.split('\n');

  // Find the task line
  const taskLine = lines.find(l => l.includes(taskId));
  if (!taskLine) return { blocked: false, waitingOn: [] };

  // Parse depends_on
  const match = taskLine.match(/\(depends_on:\s*([^)]+)\)/);
  if (!match) return { blocked: false, waitingOn: [] };

  const deps = match[1].split(',').map(d => d.trim());
  const waitingOn: string[] = [];

  for (const dep of deps) {
    const depLine = lines.find(l => l.includes(dep));
    if (!depLine) continue;
    // Check if marked done: [x]
    if (!depLine.match(/^- \[x\]/)) {
      waitingOn.push(dep);
    }
  }

  return { blocked: waitingOn.length > 0, waitingOn };
}

// Updated claimTask() — add at the beginning
async claimTask(taskId: string, agentId: string, projectPath?: string) {
  const deps = await this.checkDependencies(taskId, projectPath);
  if (deps.blocked) {
    return {
      success: false,
      blocked: true,
      waitingOn: deps.waitingOn,
      message: `Task ${taskId} is blocked — waiting for: ${deps.waitingOn.join(', ')}`
    };
  }
  // ... existing claim logic
}
```

---

### LS-06 — SwarmSynthesizer (Session Summary Generator)

**Problem**: No audit trail of "what was accomplished this session."

**Files**:
- NEW `proxy-bridge/src/lib/SwarmSynthesizer.ts`
- `proxy-bridge/src/lib/HeartbeatService.ts` — Wire at end of heartbeat cycle

**New File: SwarmSynthesizer.ts**:
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

export async function synthesizeSwarmSession(projectPath: string): Promise<string> {
  const queenbeeDir = path.join(projectPath, '.queenbee');

  // 1. Read last 20 roundtable messages
  const rtPath = path.join(queenbeeDir, 'roundtable.jsonl');
  const rtLines = (await fs.readFile(rtPath, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean);
  const recentMessages = rtLines.slice(-20).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  // 2. Read last 10 findings
  const findingsPath = path.join(queenbeeDir, 'findings.json');
  const allFindings = JSON.parse(await fs.readFile(findingsPath, 'utf8').catch(() => '[]'));
  const recentFindings = allFindings.slice(-10);

  // 3. Read proposals
  const proposalsPath = path.join(queenbeeDir, 'proposals.json');
  const proposals = JSON.parse(await fs.readFile(proposalsPath, 'utf8').catch(() => '[]'));
  const judgedProposals = proposals.filter((p: any) => p.status === 'approved' || p.status === 'rejected');

  // 4. Parse PLAN.md for task status
  const planPath = path.join(queenbeeDir, 'PLAN.md');
  const planContent = await fs.readFile(planPath, 'utf8').catch(() => '');
  const doneTasks = (planContent.match(/^- \[x\] .+/gm) || []).slice(-10);
  const inProgressTasks = (planContent.match(/^- \[\/\] .+/gm) || []);

  // 5. Build summary
  const timestamp = new Date().toISOString();
  const summary = `# Session Summary — ${timestamp}

## Completed Tasks (last 10)
${doneTasks.map(t => `- ${t.replace(/^- \[x\] /, '')}`).join('\n') || '_None yet_'}

## In-Progress Tasks
${inProgressTasks.map(t => `- ${t.replace(/^- \[\/\] /, '')}`).join('\n') || '_None_'}

## Key Findings (last 10)
${recentFindings.map((f: any) => `- **${f.title}** (confidence: ${f.confidence}) — ${f.content.slice(0, 100)}...`).join('\n') || '_No findings recorded_'}

## Proposal Outcomes
${judgedProposals.slice(-5).map((p: any) => `- ${p.status.toUpperCase()}: ${p.title}${p.judgment?.stressor ? ` (stressor: ${p.judgment.stressor})` : ''}`).join('\n') || '_No proposals judged_'}

## Recent Roundtable Activity (last 20 messages)
${recentMessages.slice(-5).map((m: any) => `- [${m.agentId}]: ${m.message?.slice(0, 80)}...`).join('\n') || '_No messages_'}
`;

  await fs.writeFile(path.join(queenbeeDir, 'session-summary.md'), summary);
  return summary;
}
```

**Wire into HeartbeatService.ts** (add at end of heartbeat cycle):
```typescript
import { synthesizeSwarmSession } from './SwarmSynthesizer';
// At end of heartbeat():
await synthesizeSwarmSession(projectPath).catch(err =>
  console.error('[HeartbeatService] Synthesis failed:', err)
);
```

---

### LS-07 — Truly Autonomous Agent Protocol (Minimal HITL)

**Problem**: Agents halt with "I can't do this" instead of escalating. Long tasks fail mid-way with no recovery.

**Files**:
- `proxy-bridge/src/lib/AutonomousRunner.ts` — Repeated failure detection + Reflexion recovery injection
- `proxy-bridge/src/lib/AgentSession.ts` — Checkpoint save/restore
- `proxy-bridge/src/lib/ToolDefinitions.ts` — Add `request_help`, `escalate_to_expert`
- `proxy-bridge/src/lib/ToolExecutor.ts` — Handle new tools

#### Layer 1 — Reflexion-Based Auto-Recovery (Shinn et al. 2023)

When an agent makes the same tool error 3 times in a row, inject verbal reflection:

```typescript
// AutonomousRunner.ts — add error tracking
private errorHistory: Map<string, { count: number; lastError: string }> = new Map();
private reflectionMemory: string[] = []; // sliding window of 3 reflections
private readonly MAX_REFLECTIONS = 3;

// After each tool error, in the main loop:
private async handleToolError(toolName: string, errorMessage: string): Promise<string | null> {
  const key = `${toolName}:${errorMessage.slice(0, 50)}`;
  const record = this.errorHistory.get(key) || { count: 0, lastError: '' };
  record.count++;
  record.lastError = errorMessage;
  this.errorHistory.set(key, record);

  if (record.count >= 3) {
    // Generate Reflexion verbal critique
    const reflection = await this.generateReflection(toolName, errorMessage);
    this.reflectionMemory.push(reflection);
    if (this.reflectionMemory.length > this.MAX_REFLECTIONS) {
      this.reflectionMemory.shift(); // evict oldest
    }
    this.errorHistory.delete(key); // reset counter for this error

    return this.buildRecoveryPrompt(toolName, errorMessage);
  }
  return null;
}

private buildRecoveryPrompt(toolName: string, errorMessage: string): string {
  const pastReflections = this.reflectionMemory.length > 0
    ? `\n\nLearnings from past failures:\n${this.reflectionMemory.map((r, i) => `Attempt ${i+1}: ${r}`).join('\n')}`
    : '';

  return `
You've hit the same error 3 times on ${toolName}: "${errorMessage}"${pastReflections}

Do NOT try the same thing again. Instead:
1. Analyze WHY this keeps failing (root cause, not symptoms)
2. Consider using request_help to ask a teammate who has this capability
3. Break the task into smaller, more concrete steps
4. Write your analysis to memory using write_memory
5. Try a completely different approach

What do you know that you haven't used yet? What assumption might be wrong?
`.trim();
}

private async generateReflection(toolName: string, errorMessage: string): Promise<string> {
  // This could call the LLM to generate a proper reflection, or use a template
  return `Failed ${toolName} with "${errorMessage.slice(0, 100)}". Need different approach.`;
}
```

#### Layer 2 — Inter-Agent Escalation Tools

```typescript
// ToolDefinitions.ts — new tools
{
  name: 'request_help',
  description: 'Broadcast a help request to the roundtable. Use when you cannot complete a step after 3 attempts. Do NOT use for first attempt.',
  input_schema: {
    type: 'object',
    properties: {
      problem: { type: 'string', description: 'Exactly what you are stuck on' },
      context: { type: 'string', description: 'What you have already tried' },
      capability_needed: { type: 'string', description: 'Skill or knowledge needed (e.g. "CSS grid expertise", "JWT cryptography")' },
      urgency: { type: 'string', enum: ['low', 'medium', 'high'] }
    },
    required: ['problem', 'capability_needed']
  }
},
{
  name: 'escalate_to_expert',
  description: 'Route a problem to a specialist agent type. Use when you need deep domain expertise.',
  input_schema: {
    type: 'object',
    properties: {
      expert_type: { type: 'string', enum: ['UI_BEE', 'LOGIC_BEE', 'DATA_BEE', 'SECURITY_BEE', 'ARCHITECT_BEE'] },
      problem: { type: 'string' },
      files_involved: { type: 'array', items: { type: 'string' } },
      context: { type: 'string' }
    },
    required: ['expert_type', 'problem']
  }
}

// ToolExecutor.ts — case handlers
case 'request_help': {
  const message = `[HELP REQUEST from ${agentId}] ${args.problem}\nCapability needed: ${args.capability_needed}\nContext: ${args.context || 'none'}\nUrgency: ${args.urgency || 'medium'}`;
  await roundtable.addMessage(projectPath, { agentId, message, type: 'help_request' });
  return { success: true, message: 'Help request broadcast to roundtable. Wait for a teammate to respond.' };
}

case 'escalate_to_expert': {
  const message = `[ESCALATION to ${args.expert_type}] ${args.problem}\nFiles: ${(args.files_involved || []).join(', ')}\nContext: ${args.context || ''}`;
  await roundtable.addMessage(projectPath, { agentId, message, type: 'escalation', targetRole: args.expert_type });
  return { success: true, message: `Escalated to ${args.expert_type}. They will pick this up on next heartbeat.` };
}
```

#### Layer 3 — Checkpoint Save/Restore

```typescript
// AgentSession.ts — checkpoint interface
interface AgentCheckpoint {
  // Identity
  sessionId: string;
  taskId: string;
  checkpointId: string;        // e.g. "task-01-step-042"
  timestamp: string;

  // Task
  originalTask: string;
  decomposedSubtasks: string[]; // plan if task was decomposed

  // Progress
  completedSteps: Array<{
    stepId: string;
    action: string;
    result: string;
    timestamp: string;
  }>;
  currentSubtaskIndex: number;
  pendingWork: string[];

  // Context (compressed)
  workingMemory: string;       // LLM-compressed summary of completed work
  modifiedFiles: string[];     // paths of files touched
  artifacts: string[];         // outputs created

  // Recovery
  lastSuccessfulStep: number;
  failureCount: number;
  reflectionMemory: string[];  // Reflexion sliding window
}

// Save checkpoint after each successful tool call (only when project is set)
async saveCheckpoint(checkpoint: Partial<AgentCheckpoint>): Promise<void> {
  if (!this.projectPath) return;
  const dir = path.join(this.projectPath, '.queenbee', 'checkpoints');
  await fs.mkdir(dir, { recursive: true });
  const key = `${checkpoint.taskId}-step-${checkpoint.lastSuccessfulStep}.json`;
  await fs.writeFile(path.join(dir, key), JSON.stringify(checkpoint, null, 2));
}

// Restore most recent checkpoint for a task
async restoreCheckpoint(taskId: string): Promise<AgentCheckpoint | null> {
  if (!this.projectPath) return null;
  const dir = path.join(this.projectPath, '.queenbee', 'checkpoints');
  const files = await fs.readdir(dir).catch(() => []);
  const taskFiles = files.filter(f => f.startsWith(taskId)).sort();
  if (!taskFiles.length) return null;
  const latest = taskFiles.at(-1)!;
  return JSON.parse(await fs.readFile(path.join(dir, latest), 'utf8'));
}
```

#### Layer 4 — System Prompt Enforcement

Append to all agent base system prompts:
```
## Autonomy Protocol

NEVER say "I can't do this" or "This is outside my capabilities" or "I don't have access to."
NEVER stop working and ask for human input unless using request_help.

Instead, follow this decision tree:
1. Lack knowledge → use read_memory or read_findings first
2. Lack a tool → use request_help to ask teammates for help
3. Blocked by dependency → use check_status, then wait or work on something else
4. Failed 3+ times → use request_help with full error context and what you tried
5. Need deep expertise → use escalate_to_expert with the expert_type you need

Always make FORWARD PROGRESS. Paralysis is never acceptable.
If you're completely stuck, write what you know to memory using write_finding, then request_help.
```

---

### LS-08 — Byzantine Circuit Breaker (Loop & Garbage Detection)

**Problem**: Agents stuck in loops or producing garbage output go undetected indefinitely.
**Research**: MAST 2025 — 14 failure modes across 1600+ annotated traces. Entropy, n-gram, hash, stall signals.

**Files**:
- `proxy-bridge/src/lib/ByzantineDetector.ts` — NEW file
- `proxy-bridge/src/lib/AutonomousRunner.ts` — Wire detector into main loop

**New File: ByzantineDetector.ts**:
```typescript
export class ByzantineDetector {
  private actionHistory: string[] = [];
  private outputHashes: Set<string> = new Set();
  private lastProgressTime: Date = new Date();
  private lastState: string = '';

  // SIGNAL 1: Exact output hash repetition
  detectOutputLoop(output: string): boolean {
    const hash = simpleHash(output.slice(0, 200));
    if (this.outputHashes.has(hash)) return true;
    this.outputHashes.add(hash);
    return false;
  }

  // SIGNAL 2: Action sequence n-gram repetition (window=6)
  detectActionLoop(newAction: string): boolean {
    this.actionHistory.push(newAction);
    const W = 6;
    if (this.actionHistory.length < W * 2) return false;
    const recent = JSON.stringify(this.actionHistory.slice(-W));
    const prior = JSON.stringify(this.actionHistory.slice(-W * 2, -W));
    return recent === prior;
  }

  // SIGNAL 3: No-progress stall (>60s same state)
  detectStall(currentState: string, thresholdMs = 60_000): boolean {
    if (currentState === this.lastState) {
      return Date.now() - this.lastProgressTime.getTime() > thresholdMs;
    }
    this.lastState = currentState;
    this.lastProgressTime = new Date();
    return false;
  }

  // SIGNAL 4: Low entropy = repetitive garbage (<3 bits)
  detectLowEntropy(text: string): boolean {
    const tokens = text.toLowerCase().split(/\s+/);
    const freq = new Map<string, number>();
    for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / tokens.length;
      entropy -= p * Math.log2(p);
    }
    return entropy < 3.0 && tokens.length > 20;
  }

  // SIGNAL 5: Token explosion (>3x expected)
  detectTokenExplosion(tokenCount: number, expectedMax = 2000): boolean {
    return tokenCount > expectedMax * 3;
  }
}

// Circuit breaker state machine
export class AgentCircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private readonly THRESHOLD = 3;
  private readonly RESET_MS = 30_000;
  private lastFailureTime?: Date;
  private detector = new ByzantineDetector();
  private stepCount = 0;
  private readonly MAX_STEPS = 100;

  async check(toolName: string, output: string, actionKey: string): Promise<{
    ok: boolean;
    reason?: string;
  }> {
    this.stepCount++;
    if (this.stepCount > this.MAX_STEPS) return { ok: false, reason: 'BUDGET_EXCEEDED' };

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime!.getTime();
      if (elapsed < this.RESET_MS) return { ok: false, reason: 'CIRCUIT_OPEN' };
      this.state = 'HALF_OPEN';
    }

    const checks = [
      [this.detector.detectOutputLoop(output), 'OUTPUT_LOOP'],
      [this.detector.detectActionLoop(actionKey), 'ACTION_LOOP'],
      [this.detector.detectLowEntropy(output), 'LOW_ENTROPY_GARBAGE'],
    ] as const;

    for (const [detected, reason] of checks) {
      if (detected) {
        this.failureCount++;
        this.lastFailureTime = new Date();
        if (this.failureCount >= this.THRESHOLD) this.state = 'OPEN';
        return { ok: false, reason };
      }
    }

    // Reset on success
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') this.state = 'CLOSED';
    return { ok: true };
  }
}

function simpleHash(str: string): string {
  let h = 0;
  for (const c of str) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return String(h);
}
```

**Wire into AutonomousRunner.ts** — call `breaker.check()` after each tool response:
```typescript
const breaker = new AgentCircuitBreaker();
// In main tool execution loop:
const bCheck = await breaker.check(toolName, toolResult, `${toolName}:${JSON.stringify(args).slice(0, 30)}`);
if (!bCheck.ok) {
  if (bCheck.reason === 'BUDGET_EXCEEDED') throw new Error('Agent budget exceeded. Task checkpointed.');
  if (bCheck.reason === 'CIRCUIT_OPEN') {
    await sleep(5000);
    continue; // back-off
  }
  // Inject Byzantine recovery prompt
  injectRecoveryMessage(`[SYSTEM] Fault detected: ${bCheck.reason}. You appear to be in a loop. Stop current approach and try something completely different or use request_help.`);
}
```

---

### LS-09 — Context Compression (SWE-agent ACI Pattern)

**Problem**: Context window overflows on 30+ step tasks, causing catastrophic forgetting.
**Research**: SWE-agent history processor + context folding (arXiv:2510.11967) + Chain-of-Agents for large docs.

**Files**:
- `proxy-bridge/src/lib/ContextCompressor.ts` — NEW file
- `proxy-bridge/src/lib/AutonomousRunner.ts` — Wire compressor into message building

**New File: ContextCompressor.ts**:
```typescript
interface FoldedSubtask {
  goal: string;
  outcome: string;          // 1-sentence summary
  keyDecisions: string[];   // bullet points
  artifacts: string[];      // files changed, functions created
  timestamp: string;
}

export class ContextCompressor {
  private foldedHistory: FoldedSubtask[] = [];
  private readonly KEEP_RECENT = 5;       // messages to keep in full
  private readonly FOLD_THRESHOLD = 20;   // fold when active context > N messages

  // History processor — collapse old messages
  processHistory(messages: Message[]): Message[] {
    if (messages.length <= this.KEEP_RECENT) return messages;

    const recent = messages.slice(-this.KEEP_RECENT);
    const old = messages.slice(0, -this.KEEP_RECENT);

    const seenErrors = new Set<string>();
    const collapsed = old.map(msg => {
      if (msg.role === 'tool') {
        const firstLine = msg.content.split('\n')[0];
        return { ...msg, content: `[truncated] ${firstLine}...` };
      }
      if (msg.role === 'assistant' && msg.content.length > 200) {
        return { ...msg, content: msg.content.slice(0, 200) + '...[truncated]' };
      }
      if (msg.content.includes('Error')) {
        const key = msg.content.slice(0, 50);
        if (seenErrors.has(key)) return { ...msg, content: '[duplicate error omitted]' };
        seenErrors.add(key);
      }
      return msg;
    });

    return [...collapsed, ...recent];
  }

  // Context folding — compress completed subtask into ~50 tokens
  async foldSubtask(goal: string, activeMessages: Message[], llm: LLMClient): Promise<void> {
    const trajectory = activeMessages.map(m => `[${m.role}]: ${m.content}`).join('\n');
    const summary = await llm.complete(`
Summarize what was accomplished for this subtask in exactly this format:
Goal: ${goal}
Trajectory:
${trajectory.slice(0, 3000)}

Return:
OUTCOME: (1 sentence)
DECISIONS: (max 3 bullet points, each < 10 words)
ARTIFACTS: (comma-separated file paths changed)
`);

    this.foldedHistory.push({
      goal,
      outcome: extractSection(summary, 'OUTCOME'),
      keyDecisions: extractBullets(summary, 'DECISIONS'),
      artifacts: extractSection(summary, 'ARTIFACTS').split(',').map(s => s.trim()),
      timestamp: new Date().toISOString()
    });
  }

  // Build compressed context header for new subtask
  buildContextHeader(): string {
    if (!this.foldedHistory.length) return '';
    return `
## Previous Work Summary
${this.foldedHistory.map(f =>
  `[Done: ${f.goal}]\n  ${f.outcome}\n  Changed: ${f.artifacts.join(', ')}`
).join('\n')}

`;
  }
}
```

---

## 6. Implementation Order

| Step | Task | Files | Effort |
|---|---|---|---|
| 1 | ProposalService — Challenge/Judgment types + challenge() + judge() | `ProposalService.ts` | Medium |
| 2 | Create SwarmSynthesizer.ts | NEW `SwarmSynthesizer.ts` | Small |
| 3 | ProjectTaskManager — setWorkEnvironment + checkDependencies | `ProjectTaskManager.ts` | Small |
| 4 | Add tool definitions (LS-01 through LS-07) | `ToolDefinitions.ts` | Small |
| 5 | Add case handlers + scope guard in write_file | `ToolExecutor.ts` | Medium |
| 6 | Wire synthesizer into HeartbeatService | `HeartbeatService.ts` | Tiny |
| 7 | Create ByzantineDetector.ts | NEW `ByzantineDetector.ts` | Medium |
| 8 | Create ContextCompressor.ts | NEW `ContextCompressor.ts` | Medium |
| 9 | AutonomousRunner — Reflexion error recovery + Byzantine + compressor | `AutonomousRunner.ts` | Large |
| 10 | AgentSession — checkpoint save/restore | `AgentSession.ts` | Medium |
| 11 | Update agent system prompts (autonomy protocol) | Agent prompt strings | Small |

---

## 7. Verification Checklist

1. **LS-01 set_work_environment**: Worker A scope = `['/src/A.tsx']`. Write to `B.tsx` → `SCOPE_VIOLATION` error.
2. **LS-02 write/read_findings**: Write finding → read_findings → JSON array with entry and correct filtering.
3. **LS-03 read_swarm_context**: In project with history → returns all 6 fields correctly.
4. **LS-04 challenge/judge**: Submit proposal → challenge (severity=critical) → judge (confidence=75, stressor="XSS via localStorage") → verify status='pending' + stressor set + roundtable message broadcast.
5. **LS-04 judge w/o stressor at <80**: `judge(id, agent, 75, "ok")` → throws "stressor is required" error.
6. **LS-05 task deps**: FEAT-02 has `(depends_on: FEAT-01)`. Claim FEAT-02 while FEAT-01 pending → `{ success: false, blocked: true, waitingOn: ["FEAT-01"] }`.
7. **LS-06 synthesizer**: HeartbeatService run → `.queenbee/session-summary.md` written with all 5 sections.
8. **LS-07 request_help**: Agent calls request_help → message in roundtable with type='help_request'.
9. **LS-07 Reflexion**: Trigger same error 3x → verify recovery prompt injected in next turn.
10. **LS-07 checkpoint**: Start task, kill session, re-run → agent continues from last checkpoint.
11. **LS-08 circuit breaker**: Emit same action 6 times in a row → `ACTION_LOOP` detected → recovery prompt injected.
12. **LS-08 entropy**: Pass 20+ words of pure repetition → `LOW_ENTROPY_GARBAGE` detected.
13. **LS-09 context folding**: After 20 messages, `processHistory()` → old messages collapsed to summaries, last 5 kept intact.

---

## 8. Research Insights Mapping

| Research Concept | Implementation |
|---|---|
| **Free-MAD** (anti-conformity debate) | LS-04: `challenge_proposal` → `judge_proposal` cycle |
| **CP-WBFT** (Byzantine tolerance) | LS-04: confidence < 60 auto-rejects; LS-08: detector weights faulty agents down |
| **PLAS / ATLAS** (priority scheduling) | LS-05: `checkDependencies()` enforces critical-path task ordering |
| **AIOS Access Manager** | LS-01: `set_work_environment` scope enforcement |
| **Blackboard architecture** | LS-02: `findings.json` structured knowledge alongside roundtable |
| **H-MEM aggregation** | LS-03: `read_swarm_context` 1-call hierarchical grounding |
| **Reflexion** (Shinn et al. 2023) | LS-07 Layer 1: 3x failure → verbal reflection → recovery prompt |
| **LATS** (ICML 2024) | LS-07 Layer 2: `request_help` + `escalate_to_expert` tree of alternatives |
| **Voyager skill library** | LS-07: expert routing based on verified skill capability |
| **SWE-agent ACI** | LS-09: windowed file view, history processor, context folding |
| **MAST failure taxonomy** (2025) | LS-08: ByzantineDetector — 5 detection signals |
| **LangGraph checkpointing** | LS-07 Layer 3: `AgentCheckpoint` schema with pending_writes |
| **Stressor-driven mutation** | LS-04: judge() enforces actionable stressor when confidence < 80 |
| **Constitutional AI** | LS-07 Layer 4: system prompt enforces "never say I can't" |
| **Confidence decay** | Existing MemoryStore.decayConfidence() — auto-prune if < 0.3 |
| **Mixed motive detection** | LS-04: orchestrator Pareto check before approving conflicting proposals |

---

## 9. GSD Task References

Tracked in `GSD_TASKS.md` under `## 🔵 LEOSWARM INTEGRATION`:

| Task | Description | Priority |
|---|---|---|
| `LS-01` | `set_work_environment` — file scope isolation | HIGH |
| `LS-02` | `write_finding` / `read_findings` — structured blackboard | HIGH |
| `LS-03` | `read_swarm_context` — unified 1-call grounding | HIGH |
| `LS-04` | `challenge_proposal` / `judge_proposal` — Free-MAD debate | HIGH |
| `LS-05` | Task dependency enforcement — hard blocking | MEDIUM |
| `LS-06` | SwarmSynthesizer — session audit trail | MEDIUM |
| `LS-07` | Truly Autonomous Agent Protocol — 4-layer recovery | HIGH |
| `LS-08` | Byzantine Circuit Breaker — loop/garbage detection | HIGH |
| `LS-09` | Context Compression — SWE-agent ACI pattern | MEDIUM |

---

## 10. Sources

- Reflexion (Shinn et al. 2023) — https://arxiv.org/abs/2303.11366
- LATS (Zhou et al. ICML 2024) — https://arxiv.org/abs/2310.04406
- Voyager (Wang et al. 2023) — https://arxiv.org/abs/2305.16291
- SWE-agent (Yang et al. NeurIPS 2024) — https://arxiv.org/abs/2405.15793
- Context-Folding (arXiv:2510.11967)
- MetaGPT (Hong et al. ICLR 2024) — https://arxiv.org/abs/2308.00352
- MAST failure taxonomy (2025) — https://arxiv.org/abs/2503.13657
- AutoGPT Forge Protocols — https://docs.agpt.co/forge/components/protocols/
- LangGraph Checkpointing — https://docs.langchain.com/oss/python/langgraph/persistence
- Byzantine fault tolerance — https://arxiv.org/html/2401.06451v1
