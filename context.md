# Queen Bee - VoxYZ Gap Implementation Context Dump
# Date: 2026-02-09
# Status: PLANNING COMPLETE, IMPLEMENTATION NOT STARTED

## WHAT WAS REQUESTED

User provided a VoxYZ-inspired architecture prompt requesting implementation of:
- PolicyStore, MemoryStore, EventLog (foundation)
- Heartbeat service with stale task recovery
- ProposalService + TriggerEngine
- ReactionMatrix
- Memory Distillation in AgentSession
- Roundtable (optional, policy-gated)

User caveats:
- "don't trust the prompt's assumptions - verify current implementation always"
- "document everything in progress.txt"
- "fill in GSD_TASKS.md after understanding current implementation"
- "log all work so another LLM can continue"

## CURRENT ARCHITECTURE (VERIFIED BY AUDIT)

### Core Agent Files:
1. **AgentSession.ts** (`proxy-bridge/src/lib/AgentSession.ts`)
   - Think→Act→Observe loop
   - Emits events: step_start, message, tool_start, tool_end, tool_error, agent_status
   - Memory flush at end via `summarizeSession()` → writes to MEMORY.md
   - Uses `sessionManager.isAborted(threadId)` to check abort (method was MISSING - see below)
   - Constructor: projectPath, systemPrompt, maxSteps(10), providerId, threadId, apiKey, mode

2. **AutonomousRunner.ts** (`proxy-bridge/src/lib/AutonomousRunner.ts`)
   - Wraps AgentSession with roles: solo | orchestrator | worker
   - Modes: local | worktree | cloud
   - composerMode: code | chat | plan
   - `streamIntermediateSteps()` - main entry, calls sessionManager.register() then cleanup()
   - `executeRecursiveLoop()` - Plan→Execute→Fix with verification
   - `getEnhancedContext()` - builds system prompt with file tree, tasks, memory, mode/role directives
   - `verifyTask()` - LLM-based QA review of agent output

3. **ToolExecutor.ts** (`proxy-bridge/src/lib/ToolExecutor.ts`)
   - 12 tools: write_file, read_file, run_shell, create_worktree, write_memory, read_memory, spawn_worker, report_completion, check_status, plan_tasks, add_task, claim_task
   - Command allowlist for run_shell (BP-01 done)
   - Path jail validation
   - `spawn_worker` ONLY broadcasts UI_UPDATE event - does NOT actually spawn agent processes
   - `write_memory` appends to MEMORY.md with mutex lock
   - `report_completion` updates workerRegistry + PLAN.md

4. **SessionManager.ts** (`proxy-bridge/src/lib/SessionManager.ts`) - **INCOMPLETE**
   - Only has: getSignal(), abortThread()
   - **MISSING**: register(), cleanup(), isAborted()
   - These ARE called by AutonomousRunner and AgentSession
   - **FIX NEEDED FIRST** (was about to fix when interrupted)

5. **EventLoopManager.ts** (`proxy-bridge/src/lib/EventLoopManager.ts`)
   - Socket.io event hub ("nervous system")
   - Handles: LOG_RELAY, PROJECT_SELECT, CMD_SUBMIT, TOOL_APPROVAL, RUNTIME_QUERY/EXEC/RESPONSE
   - FileWatcher triggers DIFF_UPDATE and UI_UPDATE on file changes
   - Uses broadcast() from socket-instance.ts

6. **ProjectTaskManager.ts** - Per-project PLAN.md management
7. **TaskManager.ts** - Global GSD_TASKS.md management
8. **UnifiedLLMService.ts** - Multi-provider LLM (OpenAI, Anthropic, Gemini, Mistral, NVIDIA, Ollama)

### What Does NOT Exist (VoxYZ Gaps):
- No `.queenbee/` directory structure per project
- No PolicyStore (JSON-based policy config)
- No MemoryStore (structured memory beyond MEMORY.md)
- No EventLog (structured event logging)
- No HeartbeatService (agent liveness tracking)
- No ProposalService (agent proposals for risky actions)
- No TriggerEngine (event-driven automation)
- No ReactionMatrix (agent responses to events)
- No Memory Distillation (compress/summarize memory)
- No Roundtable (multi-agent discussion protocol)
- spawn_worker doesn't actually spawn processes

## CRITICAL FIX NEEDED FIRST

### SessionManager.ts - Add missing methods

Current file (23 lines) only has getSignal() and abortThread().
Need to add:

```typescript
// Add to SessionManager class:
private activeThreads = new Set<string>();

register(threadId: string) {
  this.activeThreads.add(threadId);
  if (!this.threadControllers.has(threadId)) {
    this.threadControllers.set(threadId, new AbortController());
  }
  this.emit('thread_registered', threadId);
}

cleanup(threadId: string) {
  this.activeThreads.delete(threadId);
  this.threadControllers.delete(threadId);
  this.emit('thread_cleaned', threadId);
}

isAborted(threadId: string): boolean {
  const controller = this.threadControllers.get(threadId);
  return controller ? controller.signal.aborted : false;
}

getActiveThreads(): string[] {
  return Array.from(this.activeThreads);
}
```

## IMPLEMENTATION PLAN (Phase 7: VoxYZ Agent Coordination)

### Phase 7.1: Foundation (PolicyStore + EventLog + MemoryStore)
**Files to create:**
- `proxy-bridge/src/lib/PolicyStore.ts` - JSON policy config per project stored in `.queenbee/policies.json`
- `proxy-bridge/src/lib/EventLog.ts` - Append-only JSONL event log at `.queenbee/events.jsonl`
- `proxy-bridge/src/lib/MemoryStore.ts` - Structured memory store at `.queenbee/memory.json` (replaces/supplements MEMORY.md)

**PolicyStore design:**
```typescript
interface Policy {
  id: string;
  rule: string; // e.g. "max_concurrent_agents", "require_approval_for_shell", "auto_commit"
  value: any;
  scope: 'global' | 'project';
}
// Read from .queenbee/policies.json, fallback to defaults
// API: get(key), set(key, value), getAll(), evaluate(action) → allowed/denied
```

**EventLog design:**
```typescript
interface EventEntry {
  timestamp: string;
  type: string; // 'tool_call' | 'agent_start' | 'agent_end' | 'error' | 'approval' | 'memory_write'
  agentId: string;
  threadId?: string;
  data: any;
}
// Append-only JSONL file
// API: log(entry), query(filter), tail(n)
```

**MemoryStore design:**
```typescript
interface MemoryEntry {
  id: string;
  category: 'architecture' | 'convention' | 'knowledge' | 'issue';
  content: string;
  agentId: string;
  timestamp: string;
  confidence: number; // 0-1
  references: string[]; // file paths
}
// JSON file with structured entries
// API: add(entry), query(category), getRecent(n), distill()
```

**Files to modify:**
- `proxy-bridge/src/lib/ToolExecutor.ts` - Wire EventLog into tool execution, add policy checks
- `proxy-bridge/src/lib/AgentSession.ts` - Wire EventLog into agentic loop events

**API routes to create:**
- `proxy-bridge/src/pages/api/policies.ts` - GET/POST policies
- `proxy-bridge/src/pages/api/events.ts` - GET event log with filters

### Phase 7.2: Heartbeat Service
**Files to create:**
- `proxy-bridge/src/lib/HeartbeatService.ts`

**Design:**
```typescript
// Tracks agent liveness via periodic pings
// Stores heartbeats in .queenbee/heartbeats.json
// API: ping(agentId, threadId), isAlive(agentId), getStaleAgents(thresholdMs)
// Recovery: if agent stale for >60s, mark task as failed, notify orchestrator
```

**Wire into:**
- AgentSession.runLoop() - ping at each step
- AutonomousRunner.streamIntermediateSteps() - ping on start/end
- EventLoopManager - periodic stale check (setInterval)

### Phase 7.3: ProposalService + TriggerEngine
**Files to create:**
- `proxy-bridge/src/lib/ProposalService.ts` - Agent proposes risky actions, waits for approval
- `proxy-bridge/src/lib/TriggerEngine.ts` - Event patterns → automatic actions

**ProposalService:**
```typescript
// When agent wants to do something risky (delete files, push to remote, modify config)
// Instead of executing directly, creates a Proposal
// Proposal: { id, agentId, action, reason, status: 'pending'|'approved'|'rejected' }
// Stored in .queenbee/proposals.json
// Integrates with existing TOOL_APPROVAL socket flow
```

**TriggerEngine:**
```typescript
// Watches EventLog for patterns
// Trigger: { pattern: EventFilter, action: AutomatedAction }
// Examples: "on file_change in src/ → run tests", "on commit → update changelog"
// Stored in .queenbee/triggers.json
```

### Phase 7.4: ReactionMatrix
**Files to create:**
- `proxy-bridge/src/lib/ReactionMatrix.ts`

**Design:**
```typescript
// Maps event types to agent reactions
// Reaction: { eventType, agentRole, action, priority }
// Examples: "on test_failure → worker auto-fix", "on security_finding → alert inbox"
// Integrates with EventLoopManager socket events
```

### Phase 7.5: Memory Distillation
**Modify:**
- `proxy-bridge/src/lib/AgentSession.ts` - Replace summarizeSession() with MemoryStore.distill()
- `proxy-bridge/src/lib/MemoryStore.ts` - Add distill() method that compresses old entries

### Phase 7.6: Roundtable (Optional)
**Files to create:**
- `proxy-bridge/src/lib/Roundtable.ts` - Multi-agent discussion protocol, policy-gated

### Phase 7.7: Real spawn_worker
**Modify:**
- `proxy-bridge/src/lib/ToolExecutor.ts` - Make spawn_worker actually create an AutonomousRunner instance in a worktree

## FILES ALREADY MODIFIED THIS SESSION (UNCOMMITTED)

Check `git status` - there are uncommitted changes from Phase 6 work:
- proxy-bridge/src/pages/api/git/generate-message.ts
- dashboard/src/services/api.ts
- dashboard/src/components/layout/CodexLayout.tsx
- dashboard/src/components/layout/Sidebar.tsx
- dashboard/src/components/layout/AgenticWorkbench.tsx
- dashboard/src/components/layout/AutomationDashboard.tsx
- dashboard/src/store/useHiveStore.ts
- proxy-bridge/src/lib/AutonomousRunner.ts
- proxy-bridge/src/lib/UnifiedLLMService.ts
- proxy-bridge/src/pages/api/projects/threads.ts
- GSD_TASKS.md
- Plus new files: architecture/, ARCHITECTURE_SOUDURE.md, proxy-bridge/src/pages/api/git/stage-lines.ts

## COMMITS PUSHED THIS SESSION
- 5eca366, 3a91ffa, 73b4281, b019109 (all on origin/main)

## EXECUTION ORDER FOR NEXT LLM

1. **Fix SessionManager.ts** - Add register(), cleanup(), isAborted(), getActiveThreads() (code above)
2. **Commit uncommitted changes** - `git add` the modified files and commit as "feat: phase 6 codex parity + TS fixes"
3. **Create `.queenbee/` directory** in proxy-bridge data dir or per-project
4. **Implement Phase 7.1** - PolicyStore.ts, EventLog.ts, MemoryStore.ts + API routes
5. **Wire into existing code** - ToolExecutor, AgentSession, AutonomousRunner
6. **Implement Phase 7.2** - HeartbeatService.ts
7. **Implement Phase 7.3** - ProposalService.ts, TriggerEngine.ts
8. **Implement Phase 7.4-7.6** - ReactionMatrix, Memory Distillation, Roundtable
9. **Fix spawn_worker** - Make it actually spawn AutonomousRunner instances
10. **Update GSD_TASKS.md** with Phase 7 tasks (template below)

## REMAINING P6/BP TASKS (NOT DONE)
- P6-08: Skills recommended (DONE by agent but verify)
- P6-09: Inline diff viewer in chat (DONE by agent but verify)
- P6-10: Env/branch selectors (DONE by agent but verify)
- P6-13: Phase cards clickable (DONE by agent but verify)
- BP-08 through BP-12: Were marked DONE in GSD but verify actual implementation
- BUG-01: Whisper 500 error - still open

## KEY ENV/CONFIG
- Backend: proxy-bridge on port 3000 (Next.js API routes)
- Frontend: dashboard on port 5173 (Vite + React)
- Data dir: `~/.codex/` (Paths.ts)
- FRONTEND_URL, API_BASE_URL, OAUTH_REDIRECT_URI env vars
- Multi-provider LLM: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, etc.
