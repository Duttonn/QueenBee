## 🧩 PHASE 7: AGENT COORDINATION & ARCHITECTURE (VoxYZ Gap Implementation)
> **Goal**: Implement the "nervous system" for agents: PolicyStore, MemoryStore, EventLog, Heartbeat, and structured coordination.

### 🟡 PHASE 7.1: FOUNDATION
- [x] `P7-01`: [Backend] Create PolicyStore (JSON config)
  - **Files**: `proxy-bridge/src/lib/PolicyStore.ts`, `proxy-bridge/src/pages/api/policies.ts`
  - **Description**: JSON-backed policy store for runtime configuration (max agents, timeouts, feature flags).
  - **Worker**: BACKEND

- [x] `P7-02`: [Backend] Create EventLog (Structured Events)
  - **Files**: `proxy-bridge/src/lib/EventLog.ts`, `proxy-bridge/src/pages/api/events.ts`
  - **Description**: Append-only JSONL log of all system events (tool calls, approvals, errors, memory writes).
  - **Worker**: BACKEND

- [x] `P7-03`: [Backend] Create MemoryStore (Structured Memory)
  - **Files**: `proxy-bridge/src/lib/MemoryStore.ts`
  - **Description**: Structured JSON memory store replacing flat MEMORY.md. Supports types (insight, pattern), confidence scores, and deduplication.
  - **Worker**: BACKEND

- [x] `P7-04`: [Integration] Wire Foundation into ToolExecutor & AgentSession
  - **Files**: `proxy-bridge/src/lib/ToolExecutor.ts`, `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: Update core executors to emit events to EventLog, check policies, and use MemoryStore.
  - **Worker**: BACKEND

### 🟠 PHASE 7.2: HEARTBEAT & RECOVERY
- [x] `P7-05`: [Backend] Implement HeartbeatService
  - **Files**: `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Description**: Periodic system pulse. Detects stale tasks and recovers them.
  - **Worker**: BACKEND

### 🔴 PHASE 7.3: COORDINATION & LOGIC
- [x] `P7-06`: [Backend] Implement ProposalService
  - **Files**: `proxy-bridge/src/lib/ProposalService.ts`
  - **Description**: Gatekeeper for risky actions. Agents propose work, system approves/rejects based on policy.
  - **Worker**: BACKEND

- [x] `P7-07`: [Backend] Implement TriggerEngine & ReactionMatrix
  - **Files**: `proxy-bridge/src/lib/TriggerEngine.ts`, `proxy-bridge/src/lib/ReactionMatrix.ts`
  - **Description**: Event-driven automation. Triggers fire actions on events. Matrix maps agent reactions to outcomes.
  - **Worker**: BACKEND

### 🟣 PHASE 7.4: ADVANCED CAPABILITIES

- [x] `P7-08`: [Backend] Implement Memory Distillation & Injection

- [x] `P7-09`: [Backend] Implement Roundtable Protocol (Optional)

## 🏗 PHASE 7.5: TRINITY UPGRADE (Industrial Hardening)
> **Source**: Live testing + crash analysis. Harden agentic loop for production reliability.

- [DONE] `TU-01`: [Backend] Shell Resilience - Script-First Pattern
  - **Files**: `proxy-bridge/src/lib/ToolExecutor.ts` (lines 605-631)
  - **Description**: Complex commands (heredocs, >1000 chars, multiline) auto-wrapped in temp `.sh` scripts to avoid shell buffer/syntax errors. Cleanup on completion.
  - **Worker**: BACKEND

- [DONE] `TU-02`: [Backend] Circuit Breaker - Stop Infinite Tool Loops
  - **Files**: `proxy-bridge/src/lib/AgentSession.ts` (failureTracker, circuit_breaker event)
  - **Description**: Track consecutive failures per tool. After 3 failures, inject system message telling agent to stop using that tool and find alternative. Emits `circuit_breaker` event to UI.
  - **Worker**: BACKEND

- [DONE] `TU-03`: [Backend] Structured Thought Protocol - Plan Before Act
  - **Files**: `proxy-bridge/src/lib/AutonomousRunner.ts` (getEnhancedContext system prompt)
  - **Description**: System prompt now requires `<plan>` blocks before tool use and `<plan_update>` blocks after failures. Agent must declare GOAL/STEPS/CURRENT_STEP. Plan blocks are extracted and emitted as `plan_update` events.
  - **Worker**: BACKEND

- [DONE] `TU-04`: [Backend] Failure-Aware Retry - Detect Stuck Loops
  - **Files**: `proxy-bridge/src/lib/AutonomousRunner.ts` (extractToolSignature, lastAttemptToolSignature)
  - **Description**: Tracks tool call signatures between retries. If agent repeats the exact same failing tool calls, injects "STOP. Take a completely different approach" deep-think reset.
  - **Worker**: BACKEND

- [DONE] `TU-05`: [Backend] Smart Context Pruning - Token Pressure Sensor
  - **Files**: `proxy-bridge/src/lib/AgentSession.ts` (estimateTokens, pruneMessages)
  - **Description**: Estimates token usage per step (~4 chars/token). At >80k tokens, auto-prunes old messages keeping system prompt + last 10 messages. Emits `context_pruned` event.
  - **Worker**: BACKEND

- [DONE] `TU-06`: [Backend] Semantic File Chunking - Symbol Map for Large Files
  - **Files**: `proxy-bridge/src/lib/ToolExecutor.ts` (extractSymbolMap), `proxy-bridge/src/lib/ToolDefinitions.ts`
  - **Description**: Files >200 lines return a symbol map (function/class/interface names with line numbers) instead of full content. `read_file` now accepts `startLine`/`endLine` params for targeted reads. Language-aware patterns for TS/JS/Python/C/OpenCL.
  - **Worker**: BACKEND

## 🧠 PHASE 8: THE MIRROR (Personal Agent Infrastructure)
> **Goal**: Transform the robust worker into a learning apprentice that mimics user style.

### 🟢 PHASE 8.1: FEEDBACK LOOPS
- [x] `PAI-01`: [Backend] Implement **DiffLearner**
  - **Files**: `proxy-bridge/src/lib/learning/DiffLearner.ts`
  - **Logic**: Triggered on `git merge` or manual fix.
    1. Compare `agent_commit` vs `user_correction_commit`.
    2. Send Diff to LLM with prompt: "What did the user change stylistically? Extract 1 rule."
    3. Save rule to `MemoryStore` (type: 'preference').

- [x] `PAI-02`: [Backend] Implement **StyleScraper** (RAG for Style)
  - **Files**: `proxy-bridge/src/lib/learning/StyleScraper.ts`
  - **Logic**: Before `write_file`, search DB for files with similar extension/path.
  - **Action**: Inject "User Code Samples" into the context window so the LLM mimics the style (indentation, comments, imports).

### 🟠 PHASE 8.2: EXPLICIT ALIGNMENT
- [x] `PAI-03`: [Backend] Create **`teach_agent`** Tool
  - **Description**: Allows user to explicitly set a rule. "Never use lodash".
  - **Storage**: High-priority section in `MemoryStore`.

- [x] `PAI-04`: [Backend] **System Prompt Dynamic Injection**
  - **Logic**: Update `AutonomousRunner` to query `MemoryStore` for 'preferences' and 'anti-patterns' before every session and inject them at the TOP of the prompt.

## 🔧 PHASE 9: OPENCLAW PORT (Industrial-Grade Patterns)
> **Source**: Deep analysis of `old_docs/openclaw/` codebase. Port battle-tested patterns into Queen Bee.
> **Priority Order**: Auth Rotation → Tool Sanitization → Lane Queuing → File Locks → History Management

### 🔴 CRITICAL — Provider Reliability

- [x] `OC-01`: [Backend] Auth Profile Rotation & Cooldown System
  - **Files**: NEW `proxy-bridge/src/lib/AuthProfileManager.ts`, MODIFY `proxy-bridge/src/lib/UnifiedLLMService.ts`
  - **Reference**: `old_docs/openclaw/src/agents/auth-profiles/usage.ts`
  - **Problem**: UnifiedLLMService crashes if the selected provider fails (rate limit, billing, auth error). No automatic failover.
  - **Fix**: Implement auth profile rotation with:
    - Per-provider cooldown tracking: `cooldownUntil` (temporary, e.g. rate limit) vs `disabledUntil` (billing, longer)
    - Per-failure-reason tracking: Different backoff for `auth` vs `rate_limit` vs `billing` vs `timeout`
    - Exponential backoff: 1min → 5min → 25min → 1h max cooldown
    - Failure window: Reset error count after 24h of no failures
    - Auto-rotation: On provider failure, mark with cooldown and try next available provider
    - Config-driven: Per-provider overrides in `.queenbee/policies.json`
  - **Implementation**:
    ```
    AuthProfileManager:
    - profiles: Map<providerId, ProfileUsageStats>
    - markFailure(providerId, reason): void  — increments error count, sets cooldown
    - getNextAvailable(preferredId): string  — returns first non-cooled-down provider
    - isInCooldown(providerId): boolean
    - resetProfile(providerId): void

    ProfileUsageStats: { lastUsed, cooldownUntil, disabledUntil, errorCount, failureCounts, lastFailureAt }
    AuthProfileFailureReason: 'auth' | 'rate_limit' | 'billing' | 'timeout' | 'format' | 'unknown'
    ```
  - **Wire into**: UnifiedLLMService.chat() — wrap in try/catch, on failure call markFailure() + getNextAvailable() + retry
  - **Validation**: Kill OpenAI key → agent auto-switches to Gemini/Anthropic within same turn
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `OC-02`: [Backend] Tool Schema Sanitization Per Provider
  - **Files**: NEW `proxy-bridge/src/lib/ToolSchemaBridge.ts`, MODIFY `proxy-bridge/src/lib/AgentSession.ts`
  - **Reference**: `old_docs/openclaw/src/agents/schema/clean-for-gemini.ts`
  - **Problem**: We send identical tool definitions to all LLM providers. Gemini rejects many JSON Schema keywords (`additionalProperties`, `$ref`, `format`, `minLength`, etc.). OpenAI requires top-level `type: "object"`.
  - **Fix**: Implement provider-specific schema transformation:
    - `cleanSchemaForGemini()`: Strip unsupported keywords (20+ blacklisted), resolve $ref with cycle detection, flatten anyOf/oneOf literals to enum, convert const to enum
    - `normalizeForOpenAI()`: Force `type: "object"` on root if missing, merge union properties
    - `sanitizeToolsForProvider(tools, providerId)`: Apply correct transforms based on target
  - **Implementation**:
    ```
    GEMINI_UNSUPPORTED = ['patternProperties', 'additionalProperties', '$schema', '$id', '$ref', '$defs',
      'definitions', 'examples', 'minLength', 'maxLength', 'minimum', 'maximum', 'multipleOf',
      'pattern', 'format', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties']

    cleanSchemaForGemini(schema): recursively strip unsupported keys, flatten literal unions, resolve $refs
    sanitizeToolsForProvider(tools, providerId): if gemini → cleanForGemini, if openai → normalizeForOpenAI
    ```
  - **Wire into**: AgentSession.runLoop() before unifiedLLMService.chat() — transform AGENT_TOOLS based on providerId
  - **Validation**: Switch to Gemini → no schema validation errors. Switch to OpenAI → no "missing type" errors.
  - **Worker**: BACKEND
  - **Estimate**: 3h

### 🟠 HIGH — Concurrency & Data Integrity

- [x] `OC-03`: [Backend] Lane-Based Command Queuing
  - **Files**: NEW `proxy-bridge/src/lib/CommandQueue.ts`, NEW `proxy-bridge/src/lib/Lanes.ts`, MODIFY `proxy-bridge/src/pages/api/chat.ts`
  - **Reference**: `old_docs/openclaw/src/process/command-queue.ts`, `old_docs/openclaw/src/agents/pi-embedded-runner/lanes.ts`
  - **Problem**: Multiple simultaneous prompts (user + automations + swarm workers) can corrupt shared state (MEMORY.md, PLAN.md, session data). No serialization.
  - **Fix**: Implement lane-based queuing:
    - `CommandLane` enum: Main, Cron, Subagent, Nested
    - `enqueueCommandInLane(lane, task, opts)`: Promise-based queue with per-lane concurrency limits
    - Session lanes: `session:<threadId>` — serialize operations on same thread
    - Global lane: Coordinate across sessions
    - Nested queueing: session lane → global lane prevents deadlocks
    - Wait metrics: `warnAfterMs`, `onWait` callback for monitoring queue pressure
    - `setCommandLaneConcurrency(lane, max)`: Runtime adjustment
  - **Wire into**: chat.ts endpoint — wrap AutonomousRunner.streamIntermediateSteps() in session lane
  - **Validation**: Send 3 prompts simultaneously → processed sequentially, no file corruption
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `OC-04`: [Backend] File-Lock Persistence for Session State
  - **Files**: NEW `proxy-bridge/src/lib/SessionWriteLock.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts` (write_memory), MODIFY `proxy-bridge/src/lib/ProjectTaskManager.ts`
  - **Reference**: `old_docs/openclaw/src/agents/session-write-lock.ts`
  - **Problem**: MEMORY.md uses in-process Mutex (only works single-process). PLAN.md has no locking at all. Cross-process corruption possible with swarm workers.
  - **Fix**: Implement filesystem-based write locks:
    - `acquireSessionWriteLock(filePath, opts)`: Exclusive create via `fs.open("wx")`
    - Re-entrant: Same process can acquire multiple times, counter tracks depth
    - Stale detection: Check PID liveness, auto-remove locks older than 30 minutes
    - Cleanup on exit: `process.on("exit")` + SIGINT/SIGTERM/SIGQUIT handlers
    - Lock payload: `{ pid, createdAt }` for debugging
    - Exponential backoff: 50ms * attempt, max 1s between retries, 10s timeout
  - **Wire into**: ToolExecutor.handleWriteMemory() (replace Mutex), ProjectTaskManager file writes
  - **Validation**: Two concurrent agents writing MEMORY.md → no data loss or corruption
  - **Worker**: BACKEND
  - **Estimate**: 3h

### 🟡 MEDIUM — Context Efficiency

- [x] `OC-05`: [Backend] Turn-Based History Limiting with LRU Eviction
  - **Files**: MODIFY `proxy-bridge/src/lib/AgentSession.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Reference**: `old_docs/openclaw/src/agents/pi-embedded-runner/history.ts`, `old_docs/openclaw/src/auto-reply/reply/history.ts`
  - **Problem**: Current pruning is token-estimate-based (rough 4 chars/token). No turn-based limiting. No per-session configurable limits. No LRU eviction for session history map.
  - **Fix**: Implement OpenClaw-style history management:
    - `limitHistoryTurns(messages, limit)`: Count user turns from end, slice at limit
    - Per-session history limits: Configurable in `.queenbee/policies.json`
    - LRU eviction: In-memory session cache with MAX_HISTORY_KEYS (1000), oldest evicted
    - `appendHistoryEntry()`: Refresh insertion order on access (prevents eviction of active sessions)
    - Multi-stage validation: Sanitize → validate provider turns → limit → compact
  - **Validation**: Long conversation with 50+ turns → only last N turns sent to LLM
  - **Worker**: BACKEND
  - **Estimate**: 2h

### 🟢 DONE — Advanced Reliability & Observability (OpenClaw Port Cont.)
> **Source**: Filtered analysis of 14 OpenClaw patterns for multi-agent dev apps.

- [x] `OC-06`: [Backend] Exponential Backoff w/ Jitter for Tool Execution
  - **Files**: NEW `proxy-bridge/src/lib/RetryUtils.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: `withRetry()` utility with configurable exponential backoff (factor=2, jitter=true), AbortSignal integration, max delay cap. Wraps shell command execution in ToolExecutor.
  - **Worker**: BACKEND

- [x] `OC-07`: [Backend] Spawn Fallback - StdIO Resilience
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolExecutor.ts` (runShellCommand)
  - **Description**: Detects EBADF errors from `child_process.exec`, logs diagnostic warning, and retries via `withRetry`. Both script-first and direct exec paths handle EBADF gracefully.
  - **Worker**: BACKEND

- [x] `OC-08`: [Backend] Multi-Agent Session Cost Tracking
  - **Files**: NEW `proxy-bridge/src/lib/CostTracker.ts`, MODIFY `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: JSONL-based cost log per project (`.queenbee/costs.jsonl`). Logs timestamp, agentId, threadId, model, tokens, cost per LLM call. `getSummary()` aggregates by agent and model. Wired into AgentSession.runLoop() after each LLM response.
  - **Worker**: BACKEND

- [x] `OC-09`: [Backend] Diagnostic Logging & Stuck Session Detection
  - **Files**: MODIFY `proxy-bridge/src/lib/EventLog.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: SecurityAuditor logs warnings/blocks for dangerous commands and secret leaks. EventLog emits structured step_start/step_end/tool_error events. HeartbeatService already detects stale tasks.
  - **Worker**: BACKEND

- [x] `OC-10`: [Backend] Security Audit Framework (Agent Guard)
  - **Files**: NEW `proxy-bridge/src/lib/SecurityAuditor.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Static audit for commands (rm -rf, fork bombs, curl|bash, dd, mkfs) and content (API keys, JWTs, GitHub PATs). Blocks high/critical risk operations. Wired into write_file, read_file, read_file_range, and runShellCommand.
  - **Worker**: BACKEND

## 🚀 PHASE 10: OPERATIONAL EXCELLENCE (Filtered OpenClaw Patterns)
> **Source**: Deep analysis of 14 OpenClaw patterns, filtered for multi-agent multi-workspace dev app relevance.
> **Goal**: Production-grade reliability, observability, and remote oversight for autonomous agent swarms.
> **Priority**: Model Fallback → Exec Approval → Diagnostic Collector → Dedup Cache

### 🔴 P1 — Agent Resilience

- [x] `OP-01`: [Backend] Model Fallback Chains with Provider Health Integration
  - **Files**: MODIFY `proxy-bridge/src/lib/UnifiedLLMService.ts`, MODIFY `proxy-bridge/src/lib/AuthProfileManager.ts`
  - **Reference**: `old_docs/openclaw/src/agents/model-fallback.test.ts`
  - **Problem**: Current failover tries all providers sequentially. No configurable fallback chains per use-case (e.g., "for code gen, prefer Claude → GPT-4 → Gemini"). No integration between model selection and provider health.
  - **Fix**: Implement configurable fallback chains:
    - Per-task fallback chains in `.queenbee/policies.json`: `{ "fallbackChains": { "code": ["anthropic", "openai", "gemini"], "chat": ["gemini", "openai"] } }`
    - Chain selection based on `composerMode` (code/architect/chat)
    - Skip entire chain if all profiles for a provider are in cooldown
    - Emit `provider_fallback` event when switching chains
  - **Validation**: Kill Anthropic key while in "code" mode → auto-switches to OpenAI seamlessly
  - **Worker**: BACKEND
  - **Estimate**: 3h

### 🟠 P2 — Remote Oversight

- [x] `OP-02`: [Backend] Exec Approval via Webhook (Discord/Slack)
  - **Files**: NEW `proxy-bridge/src/lib/ExternalApprovalBridge.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`, NEW `proxy-bridge/src/pages/api/tools/webhook-confirm.ts`
  - **Reference**: `old_docs/openclaw/src/config/types.approvals.ts`
  - **Problem**: Shell approval only works through the browser UI. If the user closes the dashboard, autonomous agents stall indefinitely waiting for approval.
  - **Fix**: Forward approval requests to external webhooks:
    - Config: `.queenbee/policies.json` → `{ "approvalWebhook": { "url": "https://discord.com/api/webhooks/...", "timeout": 300000 } }`
    - On pending confirmation, POST formatted message to webhook with approve/reject buttons
    - Webhook callback endpoint at `/api/tools/webhook-confirm` resolves the pending promise
    - Fallback to UI if webhook fails or times out
    - Support Discord (embed format) and Slack (Block Kit) payload formats
  - **Validation**: Agent requests `rm -rf node_modules` → Discord message appears → click Approve → command runs
  - **Worker**: BACKEND
  - **Estimate**: 4h

### 🟡 P3 — Observability

- [x] `OP-03`: [Backend] Diagnostic Collector with Stuck Session Detection
  - **Files**: NEW `proxy-bridge/src/lib/DiagnosticCollector.ts`, MODIFY `proxy-bridge/src/lib/SessionManager.ts`, MODIFY `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Reference**: `old_docs/openclaw/src/logging/diagnostic.ts`
  - **Problem**: No centralized diagnostics. HeartbeatService detects stale tasks but doesn't detect stuck LLM calls or zombie sessions. No queue depth visibility.
  - **Fix**: Implement structured diagnostic collector:
    - `DiagnosticCollector.record(event)`: Structured events (session_start, session_end, tool_execution, stuck_detected, queue_pressure)
    - Stuck detection: If a session hasn't emitted a heartbeat in >2 minutes, emit `stuck_detected` event
    - Queue pressure: Monitor CommandQueue lane depths, warn when >3 items queued
    - Activity summary: Every 60s, log active sessions, queue depths, provider health
    - API endpoint: `/api/diagnostics` returns current system health snapshot
  - **Validation**: Stall an agent on purpose → `stuck_detected` event appears within 2 minutes
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `OP-04`: [Backend] Enhanced Cost Dashboard with Daily/Tool Breakdown
  - **Files**: MODIFY `proxy-bridge/src/lib/CostTracker.ts`, NEW `proxy-bridge/src/pages/api/costs.ts`
  - **Reference**: `old_docs/openclaw/src/infra/session-cost-usage.ts`
  - **Problem**: CostTracker logs entries and has basic summary, but no time-series, no per-tool breakdown, no daily aggregation, no latency tracking.
  - **Fix**: Enhance CostTracker:
    - Add `tool` field to cost entries (which tool triggered the LLM call)
    - Add `latencyMs` field (time from request to response)
    - `getDailySummary()`: Aggregate costs by date
    - `getToolBreakdown()`: Which tools generate the most LLM calls
    - `getLatencyStats()`: p50, p95, p99 latency per provider
    - API endpoint: `/api/costs?range=7d&groupBy=model`
  - **Validation**: Run a 10-step agent task → cost dashboard shows breakdown by tool and model
  - **Worker**: BACKEND
  - **Estimate**: 2h

### 🟢 P4 — Event Integrity

- [x] `OP-05`: [Backend] Deduplication Cache for Socket Events
  - **Files**: NEW `proxy-bridge/src/lib/DedupeCache.ts`, MODIFY `proxy-bridge/src/lib/socket-instance.ts`
  - **Reference**: `old_docs/openclaw/src/infra/dedupe.ts`
  - **Problem**: In multi-agent swarms, duplicate socket events can trigger redundant UI updates or double tool executions. No idempotency layer.
  - **Fix**: Implement lightweight dedup cache:
    - `DedupeCache<T>`: In-memory Map with TTL (default 30s) and max size (default 1000)
    - LRU eviction: Oldest entries evicted when size exceeded
    - `has(key)` / `set(key, value)` / `get(key)`: Standard cache ops
    - Auto-prune: On every `set()`, remove entries older than TTL
    - Wire into `broadcast()` in socket-instance.ts — skip if same event was sent within TTL window
  - **Validation**: Trigger same tool_end event twice in 100ms → only one reaches the frontend
  - **Worker**: BACKEND
  - **Estimate**: 1h

### 🔵 P5 — Future (MAYBE — Needs Adaptation)

- [ ] `OP-06`: [Backend] Dynamic Model Discovery (Ollama Auto-Detect)
  - **Files**: MODIFY `proxy-bridge/src/lib/UnifiedLLMService.ts`
  - **Problem**: Users must manually configure Ollama models. No auto-detection of locally available models.
  - **Fix**: On startup, probe `http://127.0.0.1:11434/api/tags` to discover available Ollama models. Register each as a provider with its actual name. Refresh on demand via API.
  - **Estimate**: 2h

- [ ] `OP-07`: [Backend] Per-Thread Configurable History Limits
  - **Files**: MODIFY `proxy-bridge/src/lib/AgentSession.ts`, MODIFY `proxy-bridge/src/lib/PolicyStore.ts`
  - **Problem**: Turn-based pruning (8 turns) is global. Long-running architecture sessions need more context, quick Q&A threads need less.
  - **Fix**: Per-thread `maxTurns` override stored in PolicyStore. Default 8, configurable 2-20 via API.
  - **Estimate**: 1h

- [ ] `OP-08`: [Backend] Agent-to-Agent Targeted Routing
  - **Files**: MODIFY `proxy-bridge/src/lib/Roundtable.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Problem**: Roundtable is broadcast-only. Orchestrator can't send a private message to a specific worker without others seeing it.
  - **Fix**: Add `sendTo(agentId, message)` alongside existing `post()` broadcast. Worker receives via system message injection.
  - **Estimate**: 2h

## 🐝 PHASE 11: HIVE SWARM & ARCHITECTURAL COORDINATION
> **Goal**: Implement high-level strategic swarm planning led by an Architect agent.

### 🟡 PHASE 11.1: STRATEGIC ROLES
- [x] `HS-01`: [Backend] Implement **Architect Role**
  - **Files**: `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: Added 'architect' to AgentRole enum. Updated `getEnhancedContext` with Architect directive: Deep codebase analysis, goal/KPI definition, worker proposal, and prompt generation.
  - **Worker**: BACKEND

- [x] `HS-02`: [Integration] **Hive Swarm Workflow Command**
  - **Files**: `dashboard/src/components/layout/CodexLayout.tsx`
  - **Description**: Detect `@dashboard/projects/QueenBee/hive-swarm-workflow.zip` in user prompt. Automatically create and select a "🐝 Hive Architect" thread with the correct agentId.
  - **Worker**: INTEGRATION

### 🟠 PHASE 11.2: SOCIAL COORDINATION (ROUNDTABLE)
- [x] `HS-03`: [Full-Stack] **Roundtable UI Panel**
  - **Files**: `dashboard/src/components/agents/RoundtablePanel.tsx`, `proxy-bridge/src/pages/api/roundtable/`
  - **Description**: Created a dedicated group chat component for the swarm. Implemented messages/send API endpoints. Support for user intervention in the shared social log.
  - **Worker**: FULL-STACK

- [x] `HS-04`: [Frontend] **Sidebar Thread Grouping**
  - **Files**: `dashboard/src/components/layout/Sidebar.tsx`
  - **Description**: Group threads under a "🐝 Swarm Session" folder based on `parentTaskId`. Integrated Roundtable link into each swarm group.
  - **Worker**: FRONTEND

### 🔴 PHASE 11.3: WORKBENCH UX POLISH
- [x] `HS-05`: [Frontend] **Auto-Expanding Composer**
  - **Files**: `dashboard/src/components/layout/CodexLayout.tsx`
  - **Description**: Converted prompt input to an auto-expanding textarea that grows vertically up to 3x size for long requests.
  - **Worker**: FRONTEND

- [x] `HS-06`: [Frontend] **Active Agent Indicators**
  - **Files**: `dashboard/src/components/layout/Sidebar.tsx`
  - **Description**: Render animated spinning loader icon for threads with active/thinking agents. Loader persists until final response is received.
  - **Worker**: FRONTEND

- [x] `HS-07`: [Frontend] **Unread Notification Pastilles**
  - **Files**: `dashboard/src/store/useHiveStore.ts`, `dashboard/src/components/layout/Sidebar.tsx`
  - **Description**: Added `unreadThreads` state. Display blue notification dot next to background threads that have finished work or received team messages.
  - **Worker**: FRONTEND

- [x] `FIX-03`: [Integration] **Tool Approval Payload Fix**
  - **Files**: `proxy-bridge/src/lib/EventLoopManager.ts`
  - **Description**: Resolved "Unknown tool: undefined" error during manual tool approval by correctly passing `tool` and `args` to the executor.
  - **Worker**: INTEGRATION

## 🐝 PHASE 12: THE SOVEREIGN SWARM (Execution & Protocol)
> **Goal**: Replace manual triggers with the `@qb` protocol and implement ephemeral worker isolation.

### 🟡 PHASE 12.1: THE QUEEN'S PROTOCOL (@qb)
- [ ] `QB-01`: [Frontend] **Command Alias Engine**
  - **Description**: Map `@qb` to the internal swarm orchestration workflow.
  - **Context**: Update `handleSendMessage` in `CodexLayout.tsx`. Use a regex `^@qb\s+` to intercept.
  - **Criteria**: Typing `@qb build a login page` should trigger the same logic as the previous `.zip` command.

- [ ] `QB-02`: [Frontend] **Visual Command Suggester**
  - **Description**: When user types `@`, show a high-end suggestion list.
  - **Context**: Similar to `MentionDropdown.tsx` but specialized for system commands.
  - **Criteria**: Show `@qb` with a Hexagon icon and the subtitle "Summon Hive Architect."

### 🟠 PHASE 12.2: ARCHITECTURAL DEEP-THINK
- [ ] `QB-03`: [Backend] **Architect "Lens" Mode**
  - **Description**: Implement a "Background Scout" agent that runs immediately when `@qb` is called.
  - **Context**: While the Architect talks to the user, a secondary worker should call `list_directory` and `search_file_content` to build a 500-token summary of the project architecture.
  - **Criteria**: Architect response should include "Scouting complete: Found [N] modules" without blocking the user conversation.

- [ ] `QB-04`: [Backend] **KPI & Requirement Schema**
  - **Description**: Force the Architect to output a JSON-structured requirement list before worker proposal.
  - **Context**: Update `AutonomousRunner.ts` architect directive to include a `VALIDATE_REQUIREMENTS` step.
  - **Criteria**: Render these as a "Checklist" in the UI, not just raw text.

### 🔴 PHASE 12.3: WORKER SPAWNING (MICRO-TASKS)
- [ ] `QB-05`: [Backend] **Worker Prompt Templating**
  - **Description**: Create specialized worker personas: `UI_BEE`, `LOGIC_BEE`, `TEST_BEE`.
  - **Context**: Store prompts in `proxy-bridge/src/lib/prompts/workers/`.
  - **Criteria**: Architect selects template based on task type.

- [ ] `QB-06`: [Integration] **Parallel Launch Sequencer**
  - **Description**: Instead of launching all workers at once (OOM risk), implement a staggered launch.
  - **Context**: `ToolExecutor.handleSpawnWorker` should check `PolicyStore` for `max_parallel_launches`.
  - **Criteria**: Workers launch every 500ms with a cascading "Honey-Drop" animation in the sidebar.

## 🧠 PHASE 13: THE NEURAL BUS (Roundtable v2)
> **Goal**: Transform the group chat into a functional message bus for agent-to-agent data sharing.

### 🟡 PHASE 13.1: AGENT SUBSCRIPTIONS
- [ ] `NB-01`: [Backend] **File Change Event Bus**
  - **Description**: Agents can "subscribe" to a file. If Worker A edits `App.tsx`, Worker B (UI) gets a system message alert.
  - **Context**: `FileWatcher.ts` emits to the `Roundtable`.
  - **Criteria**: No manual `chat_with_team` needed for critical file sync.

- [ ] `NB-02`: [Frontend] **Roundtable "Mentions"**
  - **Description**: User can tag a specific worker in the group chat using `@WorkerName`.
  - **Context**: Inject the user message ONLY into that worker's context to save tokens.
  - **Criteria**: Visual highlight in `RoundtablePanel.tsx`.

### 🟠 PHASE 13.2: COLLECTIVE MEMORY (CORTEX)
- [ ] `NB-03`: [Backend] **Memory Distillation Worker**
  - **Description**: Background agent that periodically reads `team_chat.jsonl` and extracts "Agreed Standards" into the Cortex.
  - **Context**: Use `MemoryDistillation.ts`.
  - **Criteria**: If Architect says "Use Tailwind," this becomes a permanent style rule for the session.

## 🎨 PHASE 14: THE QUEEN'S AESTHETIC (Apple-Grade Polish)
> **Goal**: Transition from "Developer Tool" to "Professional OS Experience."

### 🟡 PHASE 14.1: ICONOGRAPHY & MOTION
- [ ] `QA-01`: [Frontend] **Custom Hex-Glyph Library**
  - **Description**: Replace Lucide icons with custom SVG paths inspired by honeycomb geometry.
  - **Context**: `dashboard/src/assets/icons/`.
  - **Criteria**: Consistent 1.5px stroke, Zinc-900 palette.

- [ ] `QA-02`: [Frontend] **"Honey-Flow" Transitions**
  - **Description**: Implement smooth layout transitions when folders expand or agents spawn.
  - **Context**: Use `LayoutGroup` from `framer-motion`.
  - **Criteria**: No sudden jumps; sidebar items should slide and fade with 300ms ease-out.

- [ ] `QA-03`: [Frontend] **Glassmorphism Refinement**
  - **Description**: Subtle backdrop blur on sidebar and composer (12px blur, 0.05 opacity).
  - **Context**: Apply to `Sidebar.tsx` and `CodexLayout.tsx`.
  - **Criteria**: Must remain readable; Zinc-50/80 background.

### 🟠 PHASE 14.2: FEEDBACK & STATE
- [ ] `QA-04`: [Frontend] **Neural Pulse Indicator**
  - **Description**: The `@qb` command box should have a subtle "breathing" glow when the Architect is thinking.
  - **Context**: Border-color animation in `ComposerBar`.
  - **Criteria**: Light amber glow (`#F59E0B`).

- [ ] `QA-05`: [Frontend] **Status Pastille Revamp**
  - **Description**: Replace the blue dot with a "Pill" that shows the current agent's specific sub-action (e.g., "Indexing...", "Refactoring...").
  - **Context**: Use the `queenStatus` from `useHiveStore`.
  - **Criteria**: Max 12 characters, font-mono, text-[8px].
