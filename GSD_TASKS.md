# GSD Task Queue (Autonomous)

## 🔴 Phase 1: Industrial Core (Done)
- [x] Connect Zustand Store to WebSocket Bridge (Real-time UI updates).
- [x] Implement Multi-Account Keyring (Secure local storage for tokens).
- [x] Universal Auth & Account State Manager.

## 🟡 Phase 2: Git & Worktree Lifecycle (Done)
- [x] Implement WorkTree Lifecycle Manager (Auto-setup on branch creation).
- [x] Build Forge Adapter for Multi-Forge (GitHub/GitLab) CLI integration.
- [x] Conflict Resolver (Initial logic).

## 🟢 Phase 3: Developer Parity (Done)
- [x] Build "Auto Context" watcher (IDESyncHook).
- [x] Add Voice Transcription (WhisperTranscriber).
- [x] Native Filesystem Bridge (Electron IPC).
- [x] Terminal Session Manager.

## 🔵 Phase 4: Autonomous Operations (Done)
- [x] PerfMonitor & HealthCheck.
- [x] Accessibility Agent.
- [x] Inbox Triage.
- [x] Visual Verification Engine.

## 🟣 Phase 5: Production Build (Current)
- [/] Configure `electron-builder` (Configured, build running).
- [ ] Compile React Frontend (Vite Build).
- [ ] Build macOS Binary (.dmg).
- [ ] Final End-to-End Test.

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

## 🐝 PHASE 12: THE SOVEREIGN SWARM (Execution & Protocol) [DONE]
> **Goal**: Replace manual triggers with the `@qb` protocol, prevent swarm file conflicts, and implement typed worker spawning.
> **Priority Order**: @qb alias → File Event Bus → Worker Templates → Staggered Launch → Deep-Think → Polish

### 🔴 P1 — Swarm UX Entry Point
- [x] `QB-01`: [Frontend] **Command Alias Engine**
  - **Priority**: P1 — Unlocks the entire swarm UX
  - **Description**: Map `@qb` to the internal swarm orchestration workflow.
  - **Context**: Update `handleSendMessage` in `CodexLayout.tsx`. Use a regex `^@qb\s+` to intercept.
  - **Criteria**: Typing `@qb build a login page` should trigger the same logic as the previous `.zip` command.
  - **Worker**: FRONTEND

### 🔴 P1 — Swarm Safety (File Conflicts)
- [x] `NB-01`: [Backend] **File Change Event Bus**
  - **Priority**: P1 — Prevents the #1 swarm failure mode (agents overwriting each other's files)
  - **Description**: Track which agents own which files. When `write_file` is called, check if another active agent has also written to the same file. If so, inject a system message alert into the other agent's context via Roundtable.
  - **Files**: NEW `proxy-bridge/src/lib/FileWatcher.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts` (write_file handler), MODIFY `proxy-bridge/src/lib/Roundtable.ts`
  - **Implementation**:
    - `FileWatcher`: In-memory map of `filePath → { lastWriter: agentId, timestamp }`. No fs.watch needed — just track on write_file tool calls.
    - On write_file: Check if `lastWriter !== currentAgent`. If conflict, post to Roundtable: `"⚠️ {agentId} modified {file} which was last edited by {otherAgent}"`
    - Expose `getFileOwnership()` for diagnostics
  - **Criteria**: Worker A edits `App.tsx`, Worker B gets a system message alert without needing `chat_with_team`.
  - **Worker**: BACKEND

### 🟠 P2 — Core Swarm Execution
- [x] `QB-05`: [Backend] **Worker Prompt Templating**
  - **Priority**: P2 — Specialized prompts prevent "jack-of-all-trades" LLM drift
  - **Description**: Create specialized worker personas with focused system prompts.
  - **Files**: NEW `proxy-bridge/src/lib/prompts/workers/ui-bee.ts`, NEW `proxy-bridge/src/lib/prompts/workers/logic-bee.ts`, NEW `proxy-bridge/src/lib/prompts/workers/test-bee.ts`, NEW `proxy-bridge/src/lib/prompts/workers/index.ts`
  - **Implementation**:
    - `UI_BEE`: Focus on components, styling, accessibility. Tools: write_file, read_file, search. No shell access.
    - `LOGIC_BEE`: Focus on business logic, APIs, data flow. Full tool access.
    - `TEST_BEE`: Focus on test writing, coverage. Tools: write_file, read_file, run_shell (test commands only).
    - `getWorkerPrompt(type: WorkerType)`: Returns the full system prompt for the worker type.
    - Architect selects template based on task analysis.
  - **Criteria**: Architect can reference `UI_BEE` in spawn_worker and the worker gets a specialized prompt.
  - **Worker**: BACKEND

- [x] `QB-06`: [Integration] **Parallel Launch Sequencer**
  - **Priority**: P2 — OOM/rate-limit protection for multi-worker launches
  - **Description**: Stagger worker launches instead of spawning all at once.
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolExecutor.ts` (spawn_worker handler), MODIFY `proxy-bridge/src/lib/PolicyStore.ts`
  - **Implementation**:
    - Add `max_parallel_launches` to PolicyStore defaults (default: 3)
    - On spawn_worker: Check active worker count. If at limit, queue with 500ms delay between launches.
    - Emit `WORKER_LAUNCHING` socket event with stagger index for frontend animation
    - Track active workers per swarm session in SessionManager
  - **Criteria**: Spawning 5 workers triggers staggered launches (3 immediate, 2 queued). No OOM.
  - **Worker**: INTEGRATION

### 🟡 P3 — Swarm Intelligence
- [x] `NB-03`: [Backend] **Memory Distillation from Team Chat**
  - **Priority**: P3 — Turns team decisions into persistent rules
  - **Description**: Periodically scan `team_chat.jsonl` and extract "Agreed Standards" into MemoryStore.
  - **Files**: MODIFY `proxy-bridge/src/lib/MemoryDistillation.ts`, MODIFY `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Implementation**:
    - Add `distillTeamChat(projectPath)` to MemoryDistillation — reads last 20 Roundtable messages, asks LLM to extract rules/standards
    - Run from HeartbeatService tick (every 5min, only if new messages since last distillation)
    - Store extracted rules as `type: 'team_standard'` in MemoryStore
  - **Criteria**: Architect says "Use Tailwind for all styling" → becomes a persistent preference for all workers.
  - **Worker**: BACKEND

- [x] `QB-03`: [Backend] **Architect "Lens" Mode (Tool-Based)**
  - **Priority**: P3 — Refinement, not critical path
  - **Description**: Add a `scout_project` tool that the Architect calls itself to scan the codebase structure.
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolDefinitions.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **NOTE**: Changed from original design (separate background agent) to a single tool call. Spawning a second LLM call in parallel is expensive and complex. The Architect already has `list_directory` and `search_file_content` — this tool just bundles them into a structured summary.
  - **Implementation**:
    - `scout_project` tool: Calls list_directory recursively (max depth 3), counts files by extension, identifies key config files (package.json, tsconfig, etc.), returns a 500-token structured summary.
    - Architect directive updated to call `scout_project` as STEP 1 before deep analysis.
  - **Criteria**: Architect calls scout_project → gets "Found 12 modules, 3 config files, primary language: TypeScript".
  - **Worker**: BACKEND

- [x] `QB-04`: [Backend] **Requirement Checklist (Guideline-Based)**
  - **Priority**: P3 — Refinement
  - **Description**: Guide the Architect to output structured requirements before proposing workers.
  - **Files**: MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts` (architect directive)
  - **NOTE**: Changed from original design (forced JSON output) to a system prompt guideline with fallback parsing. Hard-forcing JSON schema is fragile across providers.
  - **Implementation**:
    - Update architect directive STEP 2 to include: "Output requirements as a markdown checklist: `- [ ] REQ-01: Description`"
    - Add a `parseRequirements(content)` helper that extracts `- [ ] REQ-XX:` patterns from response
    - Frontend renders parsed requirements as interactive checklist (if found), falls back to raw text
  - **Criteria**: Architect outputs "- [ ] REQ-01: Login page with OAuth" → UI renders as a ticked checklist.
  - **Worker**: BACKEND + FRONTEND

### 🟢 DONE — Swarm UX Fixes (Architect Flow & Display)

- [DONE] `QB-07`: [Backend] **Architect Approval Gate (spawn_worker Blocking)**
  - **Files**: `proxy-bridge/src/lib/AgentSession.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: Added `blockedTools` mechanism to AgentSession. Architect sessions start with `spawn_worker` blocked, forcing the LLM to present its worker assignment plan in message content. Unblocked on user follow-up message (approval). Prevents architects from silently spawning workers without showing prompts.
  - **Worker**: BACKEND

- [DONE] `QB-08`: [Frontend] **Execution Plan in AgentStepsPanel Sidebar**
  - **Files**: `dashboard/src/components/agents/AgentStepsPanel.tsx`, `dashboard/src/components/layout/AgenticWorkbench.tsx`
  - **Description**: `<plan>` and `<plan_update>` blocks are now extracted from messages and rendered as a structured card in the right-side AgentStepsPanel (goal, numbered steps with progress indicators, current step highlighting). Stripped from inline message content to avoid duplication.
  - **Worker**: FRONTEND

- [DONE] `QB-09`: [Frontend] **Requirements Styled Card in Markdown**
  - **Files**: `dashboard/src/components/layout/AgenticWorkbench.tsx`
  - **Description**: `- [ ] REQ-XX:` checklist lines are extracted from assistant messages and rendered as a styled Requirements card with blue gradient header, checkbox indicators, and REQ-ID badges. Remaining markdown renders normally below.
  - **Worker**: FRONTEND

- [DONE] `QB-10`: [Frontend] **Swarm Sidebar Naming Fix**
  - **Files**: `dashboard/src/components/layout/Sidebar.tsx`
  - **Description**: Swarm groups now show "Setup" as placeholder when no user request found. Once the user sends an `@qb` request, the swarm label updates to show the cleaned request summary (stripped of `@qb` prefix, truncated to 30 chars).
  - **Worker**: FRONTEND

- [DONE] `QB-11`: [Frontend] **Socket Tool Call Name & Arguments Fix**
  - **Files**: `dashboard/src/hooks/useSocketEvents.ts`, `dashboard/src/components/layout/CodexLayout.tsx`
  - **Description**: Fixed blank "Executed" rows in tool call display. Socket `TOOL_EXECUTION` updates now always include `name: data.tool`. String arguments from OpenAI API are parsed to objects. `spawn_worker` calls render as styled amber cards with task ID and instruction preview.
  - **Worker**: FRONTEND

- [DONE] `QB-12`: [Backend] **Architect Spawn Flow Fix**
  - **Files**: `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: Fixed architect failing to spawn workers after user approval. Three issues: (1) No system nudge injected when `spawn_worker` unblocked — architect didn't know to retry. (2) Empty response fallback asked for "summary" instead of telling architect to spawn. (3) BLOCKED error message too vague — now gives explicit instructions (output REQ checklist, worker assignments, wait). Also increased architect `maxSteps` to 20.
  - **Worker**: BACKEND

- [DONE] `QB-13`: [Frontend+Backend] **Worker Thread Visibility & Dedup**
  - **Files**: `dashboard/src/hooks/useSocketEvents.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Fixed spawned workers not appearing in swarm sidebar. `SPAWN_THREAD` event from `UI_UPDATE` was broadcast but never handled on the frontend — added handler in `useSocketEvents` that creates a thread with `isWorker: true`. Also added dedup guard in `handleSpawnWorker` so the same taskId can't be spawned twice (prevents duplicate FEAT-01). Frontend dedup checks `parentTaskId` on existing threads.
  - **Worker**: FULLSTACK

- [DONE] `QB-14`: [Frontend] **Plan Approve/Reject UI Buttons**
  - **Files**: `dashboard/src/components/layout/CodexLayout.tsx`
  - **Description**: Added `PlanApprovalBar` component that appears above the composer when the architect presents a plan (detects `<plan>`, `REQ-`, or `Worker Assignment` in last assistant message). Shows "Revise" and "Approve & Launch" buttons. Clicking sends the approval/rejection message directly, removing ambiguity for the architect.
  - **Worker**: FRONTEND

### 🟢 DONE — Swarm Communication & Roundtable Fixes

- [DONE] `QB-15`: [Backend] **Roundtable Path Resolution (Workers → Main Project)**
  - **Files**: `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/lib/AgentSession.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`, `proxy-bridge/src/lib/Roundtable.ts`
  - **Description**: Workers were writing roundtable messages to their worktree path (`/worktrees/worker-ui-bee-123/.queenbee/team_chat.jsonl`) instead of the main project. Added `mainProjectPath` propagation through the entire chain: `_doSpawnWorker` → `runBackgroundWorker` → `AutonomousRunner` → `AgentSession` → `ToolExecutor`. All `chat_with_team` calls, `getEnhancedContext` roundtable reads, auto-post completion summaries, and swarm-complete messages now use the shared main project `team_chat.jsonl`.
  - **Worker**: BACKEND

- [DONE] `QB-16`: [Backend] **Roundtable Live Polling in Agent Loop**
  - **Files**: `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: Agents only saw roundtable context once at session creation. Added `injectNewRoundtableMessages()` method that polls `team_chat.jsonl` at the top of each loop iteration, filters messages newer than a watermark timestamp, excludes self-echoes, and injects them as `[ROUNDTABLE UPDATE]` system messages. Agents can now see and respond to user posts and teammate messages during execution.
  - **Worker**: BACKEND

- [DONE] `QB-17`: [Backend] **Worker Completion Auto-Post to Roundtable**
  - **Files**: `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: `runBackgroundWorker` now guarantees a completion summary is posted to the shared roundtable even if the LLM never calls `chat_with_team`. `extractWorkerSummary` collects file paths with line stats (+X/-Y lines) from `write_file` results plus the last assistant message. Posted as `[DONE]` with full summary. Swarm-complete message also posted when all workers finish.
  - **Worker**: BACKEND

- [DONE] `QB-18`: [Backend] **WORKER_STATUS Socket Events**
  - **Files**: `proxy-bridge/src/lib/ToolExecutor.ts`, `dashboard/src/hooks/useSocketEvents.ts`
  - **Description**: Backend now emits `WORKER_STATUS` socket events when workers start, complete, or fail. Frontend `SPAWN_THREAD` handler persists `instructions`, `worktreePath`, and `workerStatus` on thread objects. `WORKER_STATUS` handler updates status on matching worker threads.
  - **Worker**: FULLSTACK

- [DONE] `QB-19`: [Frontend] **AgentStepsPanel Rewrite (Worker & Architect Views)**
  - **Files**: `dashboard/src/components/agents/AgentStepsPanel.tsx`
  - **Description**: Full rewrite with three view modes: (1) Worker thread view — parses task instructions into checklist steps with completion tracking from tool calls, status badge. (2) Architect launched view — `WorkerOverviewCard` showing all workers with status indicators, task counts, progress bars, and aggregate swarm progress. (3) Architect pre-launch — existing 3-phase pipeline stepper. Normal threads unchanged.
  - **Worker**: FRONTEND

- [DONE] `QB-20`: [Backend] **Roundtable swarmId Filtering**
  - **Files**: `proxy-bridge/src/lib/Roundtable.ts`
  - **Description**: `getFormattedContext()` now accepts optional `swarmId` parameter to filter messages per swarm session, preventing cross-swarm message leakage.
  - **Worker**: BACKEND

### 🟢 P4 — Token Optimization & Polish
- [x] `NB-02`: [Frontend] **Roundtable "Mentions"**
  - **Priority**: P4 — Token savings, not blocking
  - **Description**: User can tag a specific worker in the group chat using `@WorkerName`.
  - **Context**: Inject the user message ONLY into that worker's context to save tokens.
  - **Criteria**: Visual highlight in `RoundtablePanel.tsx`.
  - **Worker**: FRONTEND

- [x] `QB-02`: [Frontend] **Visual Command Suggester**
  - **Priority**: P4 — Polish, not blocking
  - **Description**: When user types `@`, show a suggestion dropdown.
  - **Context**: Similar to `MentionDropdown.tsx` but specialized for system commands.
  - **Criteria**: Show `@qb` with a Hexagon icon and the subtitle "Summon Hive Architect."
  - **Worker**: FRONTEND

## 🧠 PHASE 14: SWARM INTELLIGENCE & SELF-OPTIMIZATION
> **Goal**: Implement advanced multi-agent coordination patterns from research for smarter, more resilient agent swarms.
> **Based on**: notebookresearch/prompts.md deep analysis of AIOS, DSPy, Byzantine Fault Tolerance, and Swarm architectures.

### 🟡 PHASE 14.1: ENHANCED BUILDER AUTONOMY
> **Source**: Reflexion strategy, Self-Critique patterns

- [x] `SI-01`: [Backend] **Builder Self-Critique Protocol**
  - **Files**: MODIFY `proxy-bridge/src/lib/prompts/workers/logic-bee.ts`, `proxy-bridge/src/lib/prompts/workers/ui-bee.ts`, `proxy-bridge/src/lib/prompts/workers/test-bee.ts`
  - **Description**: Add mandatory self-critique step before proposal submission. Builder must generate `<thought>` block analyzing own output for errors, security risks, and efficiency before submitting. Format: `<thought>[Self-Critique] → [Plan of Correction] → [Final Response]</thought>`
  - **Trigger**: Before any `swarm_propose` or `swarm_complete_task` call
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `SI-02`: [Backend] **Stuck Loop Detection & Recovery**
  - **Files**: MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: Implement Semantic Circularity Index - track tool call signatures between retries. If agent repeats exact same failing tool calls, inject "STOP. Take a completely different approach" deep-think reset. Based on Failure-Aware Retry (TU-04) enhancement.
  - **Logic**: Calculate embedding similarity between last N tool calls. If similarity > 0.9, trigger recovery.
  - **Worker**: BACKEND
  - **Estimate**: 3h

### 🟠 PHASE 14.2: JUDGMENT & CONSENSUS ENHANCEMENTS
> **Source**: Free-MAD debate strategies, Byzantine Fault Tolerance

- [x] `SI-03`: [Backend] **False Consensus Detection**
  - **Files**: MODIFY `proxy-bridge/src/lib/ProposalService.ts`, NEW `proxy-bridge/src/lib/ConsensusAnalyzer.ts`
  - **Description**: Detect when Reviewer and Devil's Advocate agree for wrong reasons (groupthink). Implement semantic similarity check between agent reasoning chains. If agreement reached with similarity > 0.95, inject "Anti-Conformity" stress test - force agents to find flaws.
  - **Metrics**: Track confidence trajectory over debate rounds
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `SI-04`: [Backend] **Confidence-Based Mutation Flow**
  - **Files**: MODIFY `proxy-bridge/src/lib/ProposalService.ts`
  - **Description**: Implement refined scoring: 90-100 (Ship), 80-89 (Approved), 70-79 (Mutation required with specific stressor), 60-69 (Mutation + major rethink), <60 (Reject). Ensure stressor is specific, not vague.
  - **Validation**: If confidence < 80, extract specific STRESSOR and broadcast MUTATE command
  - **Worker**: BACKEND
  - **Estimate**: 2h

### 🔴 PHASE 14.3: MEMORY & KNOWLEDGE EVOLUTION
> **Source**: DSPy Meta-Prompt Optimization, Memory Decay algorithms

- [x] `SI-05`: [Backend] **Confidence-Based Memory Decay**
  - **Files**: MODIFY `proxy-bridge/src/lib/MemoryStore.ts`
  - **Description**: Implement Feedback-Driven Confidence Decay. On task failure involving memories, reduce confidence_score by decay_rate (0.2). If confidence < prune_threshold (0.3), auto-delete memory. On success, reinforce confidence (cap at 1.0).
  - **Logic**: `memory.confidence *= (1 - decay_rate)` on failure
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `SI-06`: [Backend] **RAG-Style Context Retrieval**
  - **Files**: NEW `proxy-bridge/src/lib/ContextRetriever.ts`, MODIFY `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: Replace full brain load with semantic retrieval. On `swarm_recall`, perform vector search against MemoryStore. Return top-K relevant memories instead of entire brain. Implement Semantic Lookaside Buffer (SLB) for caching recent retrievals.
  - **Implementation**: Embed query, similarity search against stored memories, inject top 5 matches
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `SI-07`: [Backend] **KPI-Driven Prompt Auto-Tuning**
  - **Files**: NEW `proxy-bridge/src/lib/PromptOptimizer.ts`, MODIFY `proxy-bridge/src/lib/CostTracker.ts`
  - **Description**: Track rejection_rate per worker type. If rejection_rate > 0.25, analyze failed proposals and auto-generate improved instructions for that worker. Store optimized prompts in MemoryStore with 'prompt_optimization' type.
  - **Trigger**: Daily or on 10+ rejections
  - **Worker**: BACKEND
  - **Estimate**: 5h

### 🟢 PHASE 14.4: ESCALATION & SAFETY
> **Source**: Human-in-the-loop protocols, Byzantine detection

- [x] `SI-08`: [Backend] **Human Escalation Protocol**
  - **Files**: NEW `proxy-bridge/src/lib/EscalationManager.ts`, MODIFY `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Description**: Define 3 confusion thresholds: (1) Consensus Instability - majority oscillates without converging (confidence < 0.75 for 3+ rounds), (2) Operational Stupection - agent repeats same action 3+ times without progress, (3) Regression Drift - mutation causes >10% success rate drop on golden tasks. Trigger @hive alert on threshold breach.
  - **API**: `/api/escalation/status` returns current escalation state
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `SI-09`: [Backend] **Toxic Agent Detection**
  - **Files**: NEW `proxy-bridge/src/lib/AgentReputation.ts`, MODIFY `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Description**: Implement Peer-Ranked Reputation system. Track per-agent: acceptance_rate, rejection_count, challenge_survival_rate. Agents with <0.3 reputation get lower priority in task assignment. Implement Byzantine detection - if agent outputs conflict with consensus factual basis, flag and isolate.
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `SI-10`: [Backend] **Medic Emergency Role**
  - **Files**: NEW `proxy-bridge/src/lib/MedicAgent.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Implement /medic role that activates after 3 task failures. Medic has super-permissions: (1) Context Injection - force correct observations into Builder, (2) Rollback Authority - restore files to pre-failure state, (3) Consensus Override - bypass stuck Reviewer. Triggered automatically or via @medic command.
  - **Worker**: BACKEND
  - **Estimate**: 5h

### 🔵 PHASE 14.5: SCALABILITY PATTERNS
> **Source**: Hierarchical Sub-Hives, Contract-Based Communication

- [x] `SI-11`: [Backend] **Sub-Hive Specialization**
  - **Files**: MODIFY `proxy-bridge/src/lib/HiveOrchestrator.ts`, NEW `proxy-bridge/src/lib/SubHiveRegistry.ts`
  - **Description**: Support hierarchical hives: Root Hive → Sub-Hives (UI, Backend, Data). Each Sub-Hive has isolated memory and tools. Communication only via typed contracts (JSON schemas). Large projects spawn Sub-Hives instead of flat worker pools.
  - **Implementation**: Contract Net Protocol - Sub-Hives propose capabilities, Root assigns tasks
  - **Worker**: BACKEND
  - **Estimate**: 6h

- [x] `SI-12`: [Backend] **Contract-Based Worker Communication**
  - **Files**: NEW `proxy-bridge/src/lib/ContractManager.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Workers communicate via formal API contracts instead of natural language. When Worker A needs data from Worker B, it reads from contract-defined interface file. Prevents hallucinations from miscommunications.
  - **Schema**: Define input/output contracts in `.queenbee/contracts/`
  - **Worker**: BACKEND
  - **Estimate**: 4h

### 🟣 PHASE 14.6: VISUAL & MULTIMODAL FEEDBACK
> **Source**: Multimodal Feedback Loops, Visual Verification

- [x] `SI-13`: [Backend] **Visual UI Validation Loop**
  - **Files**: MODIFY `proxy-bridge/src/lib/VisualVerificationEngine.ts`, NEW `proxy-bridge/src/lib/ScreenshotComparator.ts`
  - **Description**: For UI tasks, capture screenshots at key steps. Implement Visual Planner - generate "expected visual" description, compare with actual screenshot using VLM. Calculate visual fidelity score. Reject if score < 0.7.
  - **Integration**: Wire into Reviewer for UI task validation
  - **Worker**: BACKEND
  - **Estimate**: 5h

- [x] `SI-14`: [Frontend] **Swarm KPI Dashboard**
  - **Files**: NEW `dashboard/src/components/layout/SwarmMetricsPanel.tsx`, MODIFY `dashboard/src/store/useHiveStore.ts`
  - **Description**: Real-time dashboard showing: tasks_completed, tasks_rejected, avg_task_duration_min, rejection_rate, active_agents, memories_count. Based on Streamlit dashboard concept from research. Polls `/api/diagnostics` every 10s.
  - **Visual**: KPI cards with trend arrows, color-coded health (green/orange/red)
  - **Worker**: FRONTEND
  - **Estimate**: 3h

## 🎨 PHASE 13: THE QUEEN'S AESTHETIC (Apple-Grade Polish)
> **Goal**: Transition from "Developer Tool" to "Professional OS Experience."
> **STATUS**: DEFERRED — Phase 12 must stabilize first. UI polish on moving targets is wasted effort.
> **WHEN**: Only after @qb protocol, worker templates, and file bus are stable and tested.

### 🟡 PHASE 13.1: ICONOGRAPHY & MOTION (DEFERRED)
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

### 🟠 PHASE 13.2: FEEDBACK & STATE (DEFERRED)
- [ ] `QA-04`: [Frontend] **Neural Pulse Indicator**
  - **Description**: The `@qb` command box should have a subtle "breathing" glow when the Architect is thinking.
  - **Context**: Border-color animation in `ComposerBar`. Depends on `@qb` protocol (QB-01) being stable.
  - **Criteria**: Light amber glow (`#F59E0B`).

- [ ] `QA-05`: [Frontend] **Status Pastille Revamp**
  - **Description**: Replace the blue dot with a "Pill" that shows the current agent's specific sub-action (e.g., "Indexing...", "Refactoring...").
  - **Context**: Use the `queenStatus` from `useHiveStore`.
  - **Criteria**: Max 12 characters, font-mono, text-[8px].

## 🚧 PHASE 15: BUG FIXES & FEATURE ENHANCEMENTS
> **Goal**: Fix critical bugs and implement missing features from user feedback.

### 🔴 CRITICAL — Bug Fixes

- [x] `FIX-04`: [Backend] **Roundtable Agents Not Responding**
  - **Description**: Roundtable agents are not responding to messages. Investigate and fix the communication channel between workers and roundtable.
  - **Files**: `proxy-bridge/src/lib/Roundtable.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Worker**: BACKEND

- [x] `FIX-05`: [Frontend] **Architect Approve Button Incorrectly Popping Up**
  - **Description**: The plan approve button appears even when not using @qb command, in plan mode, and when just @-mentioning a file.
  - **Files**: `dashboard/src/components/layout/CodexLayout.tsx`
  - **Context**: Fix the detection logic for when to show the approve bar (should only show during @qb swarm workflow)
  - **Worker**: FRONTEND

- [x] `FIX-06`: [Frontend] **Workflow Panel Tab Not Reopenable**
  - **Description**: When the agent workflow panel is closed, there's no way to reopen it.
  - **Files**: `dashboard/src/components/layout/CodexLayout.tsx`, `dashboard/src/components/layout/Sidebar.tsx`
  - **Context**: Add a toggle button in the sidebar or header to reopen the workflow panel
  - **Worker**: FRONTEND

- [x] `FIX-07`: [Frontend] **Voice Command Not Working**
  - **Description**: Voice input is not being captured or processed correctly.
  - **Files**: `dashboard/src/hooks/useVoiceRecording.ts`, `dashboard/src/components/layout/CodexLayout.tsx`
  - **Worker**: FRONTEND

- [x] `FIX-08`: [Frontend] **Adding Files to Prompt Context**
  - **Description**: Attaching files to the prompt context is broken or not working as expected.
  - **Files**: `dashboard/src/components/layout/CodexLayout.tsx`
  - **Context**: Fix the file attachment flow via the Plus button
  - **Worker**: FRONTEND

- [ ] `FIX-09`: [Frontend] **Embedded Terminal & Open in Terminal**
  - **Description**: The embedded terminal is not working properly and "Open in Terminal" button is broken.
  - **Files**: `dashboard/src/components/layout/XtermTerminal.tsx`, `dashboard/src/components/layout/AgenticWorkbench.tsx`
  - **Worker**: FRONTEND

### 🟠 HIGH — Feature Implementation

- [ ] `FEAT-01`: [Backend] **Implement Swarm Features from Leoswarm**
  - **Description**: Port over all swarm features implemented in the leoswarm project.
  - **Context**: Need access to leoswarm project to review implementation
  - **Worker**: BACKEND

- [ ] `FEAT-02`: [Fullstack] **Implement/Fix Automations**
  - **Description**: Automations feature is not fully functional. Several bugs found during audit.
  - **Files**: `dashboard/src/components/layout/AutomationDashboard.tsx`, `dashboard/src/store/useAppStore.ts`, `proxy-bridge/src/lib/db.ts`, `proxy-bridge/src/lib/CronManager.ts`, `proxy-bridge/src/pages/api/automations.ts`
  - **Context**: Bugs found (in priority order):
    1. **DELETE URL bug** (`useAppStore.ts:132`): `deleteAutomation` uses `${API_BASE}/automations` (missing `/api`) — should be `${API_BASE_ROUTES}/automations`. Same issue in `uninstallSkill` line 165.
    2. **Days field not saved**: Backend `db.ts` Automation type and `automations.ts` POST handler don't include a `days` field. Frontend sends days but backend ignores them — cron never uses specific weekdays.
    3. **Days → Cron conversion missing**: `CronManager.convertToCron` only converts `HH:MM` to daily cron. Days array (e.g., `['Mo','Tu','We','Th','Fr']`) is never used to build the weekday part of the cron (e.g., `0 9 * * 1-5`).
    4. **No feedback on "Run Now"**: Result from `runAutomation` is only logged to console, never displayed in the UI.
    5. **Hardcoded URL in AutomationDetailsModal** (`AutomationDashboard.tsx:625`): Uses `http://127.0.0.1:3000/api/automations` directly instead of `API_BASE`. Also calls `window.location.reload()` instead of updating state.
    6. **Template grid hidden after first automation**: Once any automation exists, the template grid disappears. The "+ Create New" modal should optionally show templates.
  - **Worker**: FULLSTACK

- [ ] `FEAT-03`: [Fullstack] **Implement Skills as Project-Scoped SKILL.md Files**
  - **Description**: Skills feature needs proper implementation. Current system just stores skill names in DB with no real capability. Worktrees use `.gemini/skills/<name>/SKILL.md` format that agents load as context.
  - **Files**: `dashboard/src/components/layout/SkillsManager.tsx`, `proxy-bridge/src/pages/api/skills.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/lib/AgentSession.ts`
  - **Template**: `worktrees/p3-01/.gemini/skills/electron-expert/SKILL.md` (frontmatter: name, description; body: markdown knowledge)
  - **Context**: Key findings:
    1. **Current implementation is a stub**: `skills.ts` POST just marks skills as "installed" in DB, there's no real functionality. The `available` list is hardcoded.
    2. **The real pattern** (from worktree): Skills live in `.gemini/skills/<slug>/SKILL.md` inside the project directory. Each SKILL.md has YAML frontmatter (name, description) and a markdown knowledge base.
    3. **Backend needed**: `GET /api/skills?projectPath=...` should scan `.gemini/skills/` for installed skills. `POST /api/skills` should create a new SKILL.md file. `DELETE /api/skills?id=...` should remove the skill dir.
    4. **Agent integration needed**: `AutonomousRunner` or `AgentSession` should read installed skills from `.gemini/skills/` and prepend them to the system prompt when running in the context of that project.
    5. **Frontend needed**: SkillsManager should let users create skills with a name, description, and markdown body. Skill "install" from the available list should scaffold a SKILL.md from the template. A text editor for the skill body would be ideal.
  - **Worker**: FULLSTACK

- [ ] `FEAT-04`: [Backend] **OAuth for All Models — Finish Real Implementation**
  - **Description**: OAuth is partially set up but broken for Anthropic and OpenAI due to placeholder client IDs.
  - **Files**: `proxy-bridge/src/lib/auth-manager.ts`, `proxy-bridge/src/pages/api/auth/login.ts`, `proxy-bridge/src/pages/api/auth/callback.ts`, `dashboard/src/components/settings/CustomizationPanel.tsx`
  - **Context**: Key findings:
    1. **Anthropic OAuth**: `auth-manager.ts:55` uses `client_id=official-id-here` — Anthropic doesn't expose a public OAuth API; needs to be removed or replaced with API key flow only.
    2. **OpenAI Codex OAuth**: `auth-manager.ts:65` same placeholder — OpenAI also doesn't offer public OAuth for API access; remove.
    3. **Google OAuth**: Properly implemented with real PKCE flow, token refresh, etc. Works.
    4. **Qwen OAuth**: Has a real client_id (`f0304373b74a44d2b584a3fb70ca9e56`) but no token exchange/refresh implemented.
    5. **Kimi/Moonshot**: `KimiAdapter.ts` exists but isn't registered as a provider in `UnifiedLLMService.ts`.
    6. **Recommendation**: Remove fake OAuth for Anthropic/OpenAI (API key only). Complete Qwen token exchange. Wire up Kimi to UnifiedLLMService.
  - **Worker**: BACKEND

- [ ] `FEAT-05`: [Backend] **Fix & Complete Model Provider Support**
  - **Description**: Some model providers are missing or broken in UnifiedLLMService.
  - **Files**: `proxy-bridge/src/lib/UnifiedLLMService.ts`, `proxy-bridge/src/lib/providers/`, `proxy-bridge/src/lib/KimiAdapter.ts`
  - **Context**: Key findings:
    1. **Kimi/Moonshot not wired**: `KimiAdapter.ts` exists but is never instantiated in `UnifiedLLMService.registerProfile()` or `initFromEnv()`. Need to add a `KimiProvider` wrapper and register it for `moonshot`/`kimi` provider IDs.
    2. **AnthropicProvider ignores custom apiBase**: `registerProfile()` calls `new AnthropicProvider(key)` without passing `profile.apiBase` — custom Anthropic-compatible endpoints (e.g. local proxies) don't work.
    3. **Qwen/Alibaba**: No provider registered at all despite Qwen OAuth setup existing.
    4. **chatStream auto-routing**: The model-name-based routing for streaming (`auto` mode) only checks for gemini/gpt/claude/mistral in model names — Kimi and Qwen are unhandled.
    5. **Fix priority**: Wire KimiAdapter → OpenAI-compatible wrapper → register for `moonshot`/`kimi`. Pass `apiBase` to AnthropicProvider.
  - **Worker**: BACKEND

- [ ] `FEAT-06`: [Frontend/Backend] **Deep Inspector**
  - **Description**: Implement a deep code inspector for analyzing project structure, dependencies, and live agent state.
  - **Files**: NEW `dashboard/src/components/inspector/DeepInspector.tsx`, `proxy-bridge/src/pages/api/inspector/index.ts`
  - **Context**: Nothing exists yet. Suggested design:
    - **Backend** `/api/inspector?projectPath=...` — returns: file tree with sizes, dependency graph (package.json deps), active agent sessions, cost breakdown per session, memory usage, open worktrees.
    - **Frontend** `DeepInspector.tsx` — tabbed panel: (1) File Tree with sizes and type breakdown, (2) Dependency Graph (d3 or similar), (3) Agent Sessions (live from DiagnosticCollector), (4) Cost breakdown (from CostTracker `/api/costs`).
    - Wire into Sidebar as a new "Inspector" view option. Consider the `DiagnosticCollector.ts` and `CostTracker.ts` already available.
  - **Worker**: FULLSTACK

- [ ] `FEAT-07`: [Frontend/Backend] **QueenBee Chrome Extension**
  - **Description**: Create a Chrome extension for browser integration — capture pages, send to QueenBee agent.
  - **Files**: NEW `chrome-extension/manifest.json`, `chrome-extension/popup.html`, `chrome-extension/content.js`, `chrome-extension/background.js`
  - **Context**: Nothing exists yet. Suggested design:
    - **Extension** (Manifest V3): popup with "Send page to QueenBee" and "Capture element" buttons. Content script that lets user click to highlight elements and extract HTML/text.
    - **Background service worker**: POSTs captured content to `http://localhost:3000/api/browser-capture` and opens the dashboard if closed.
    - **Backend** `proxy-bridge/src/pages/api/browser-capture.ts`: receives `{ url, title, content, elementHtml }` and creates a new message in the active session's inbox or creates a project context item.
    - Pack with `npm run build:extension` using a simple Webpack config.
  - **Worker**: FULLSTACK

- [ ] `FEAT-08`: [Frontend/Backend] **Integrated Navigator (Orchids-style)**
  - **Description**: Add an integrated web navigator with element picking — select any HTML element to add to agent context.
  - **Files**: NEW `dashboard/src/components/navigator/BrowserPanel.tsx`, `dashboard/src/components/navigator/ElementPicker.tsx`, `proxy-bridge/src/pages/api/browser/`
  - **Context**: Nothing exists yet. QueenBee already has `BrowserControlService.ts` and `BrowserRelay.ts` in the backend. Suggested design:
    - **Frontend** `BrowserPanel.tsx`: embedded `<iframe>` or `<webview>` (Electron) with address bar and navigation controls. "Pick Element" button activates ElementPicker overlay.
    - **ElementPicker**: injects a script into the iframe/webview to highlight hovered elements; on click, extracts outerHTML and sends to `onElementPicked(html)` callback which appends to the composer context.
    - **Backend**: Leverage existing `BrowserControlService.ts` for navigation. Add `GET /api/browser/screenshot` and `GET /api/browser/dom?selector=...` for headless element extraction.
    - Wire into Sidebar as a new "Navigator" view with split-pane layout (browser + agent chat).
  - **Worker**: FULLSTACK

---

## 🔵 LEOSWARM INTEGRATION
> **Goal**: Add governance, scope isolation, autonomous error recovery, and session synthesis to the QueenBee swarm. Full implementation plan in `LEOSWARM_PLAN.md`.
> **Research basis**: Reflexion (Shinn 2023), LATS (ICML 2024), Voyager, SWE-agent, MAST failure taxonomy (2025), Free-MAD, CP-WBFT, PLAS, AIOS Access Manager.

### 🔴 HIGH PRIORITY

- [x] `LS-01`: [Backend] **set_work_environment tool** — Per-task file scope isolation
  - **Files**: `proxy-bridge/src/lib/ToolDefinitions.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`, `proxy-bridge/src/lib/ProjectTaskManager.ts`
  - **Description**: Researcher agents call this to lock which files a builder can modify. ToolExecutor validates write_file against scope, throws `SCOPE_VIOLATION` if out of bounds. Storage: `.queenbee/work-environments.json` (`{ [taskId]: { files, notes, setAt } }`). Uses glob/minimatch for pattern matching.
  - **Key method**: `ptm.setWorkEnvironment(taskId, files[], notes?)` + `ptm.getWorkEnvironment(taskId)`
  - **Worker**: BACKEND

- [x] `LS-02`: [Backend] **write_finding / read_findings tools** — Structured research blackboard
  - **Files**: `proxy-bridge/src/lib/ToolDefinitions.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Agent findings stored in `.queenbee/findings.json` (separate from roundtable JSONL). Schema: `{ id, taskId, agentId, title, content, tags[], confidence, timestamp }`. Filterable by taskId/agentId/tags. Enables research lineage tracking separate from conversation.
  - **Worker**: BACKEND

- [x] `LS-03`: [Backend] **read_swarm_context tool** — Unified hierarchical brain aggregation
  - **Files**: `proxy-bridge/src/lib/ToolDefinitions.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Single call returns: MISSION (first 500 chars of PLAN.md), task counts (pending/inProgress/done), last 3 roundtable messages, top 5 memories by confidence, open proposals, session-summary.md snippet. Replaces 4+ separate calls for agent grounding. ~100 tokens instead of ~400.
  - **Worker**: BACKEND

- [x] `LS-04`: [Backend] **challenge_proposal / judge_proposal tools** — Free-MAD debate cycle
  - **Files**: `proxy-bridge/src/lib/ProposalService.ts`, `proxy-bridge/src/lib/ToolDefinitions.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Add Challenge/Judgment types to ProposalService. `challenge()` stores risks/questions/severity. `judge()` scores 0-100 → derives level → sets status. Thresholds: ≥90=ship, ≥80=approved, ≥70=mutation_required+stressor, ≥60=mutation_major+stressor, <60=rejected. `stressor` is REQUIRED if confidence < 80 (must be actionable, not vague). Judge posts roundtable message with outcome.
  - **Worker**: BACKEND

- [x] `LS-07`: [Backend] **Truly Autonomous Agent Protocol** — 4-layer minimal-HITL recovery
  - **Files**: `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/lib/AgentSession.ts`, `proxy-bridge/src/lib/ToolDefinitions.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: 4 layers of error recovery:
    1. **Reflexion** (Shinn 2023): On 3x same error → auto-inject verbal reflection prompt. Sliding window of 3 reflections. Do NOT retry same action.
    2. **Inter-agent escalation**: `request_help` tool broadcasts to roundtable. `escalate_to_expert` routes to specialist (UI_BEE, LOGIC_BEE, DATA_BEE, SECURITY_BEE, ARCHITECT_BEE).
    3. **Checkpoint save/restore**: `AgentCheckpoint` schema saved after each successful tool call to `.queenbee/checkpoints/{sessionId}-step-{n}.json`. Restore on reconnect.
    4. **System prompt enforcement**: Append autonomy protocol — "NEVER say I can't. Follow decision tree: lack knowledge→read_memory, lack tool→request_help, failed 3x→request_help with context."
  - **Worker**: BACKEND

- [x] `LS-08`: [Backend] **Byzantine Circuit Breaker** — Loop & garbage detection
  - **Files**: NEW `proxy-bridge/src/lib/ByzantineDetector.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: 5 fault signals: (1) Output hash repetition, (2) Action n-gram loop (window=6), (3) Stall >60s same state, (4) Low token entropy <3 bits (repetitive garbage), (5) Token explosion >3x expected. Circuit breaker: 3 failures → OPEN (30s backoff) → HALF_OPEN (probe) → CLOSED. On fault: inject recovery prompt, not crash. Based on MAST 2025 failure taxonomy.
  - **Worker**: BACKEND

### 🟠 MEDIUM PRIORITY

- [x] `LS-05`: [Backend] **Task dependency enforcement** — Hard blocking on depends_on
  - **Files**: `proxy-bridge/src/lib/ProjectTaskManager.ts`, `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Parse `(depends_on: TASK-ID, TASK-ID2)` from PLAN.md task lines. `claimTask()` checks if all dependencies are marked `[x]` (done) before allowing claim. Returns `{ success: false, blocked: true, waitingOn: ["TASK-ID"] }` if blocked. Prevents out-of-order task execution.
  - **Worker**: BACKEND

- [x] `LS-06`: [Backend] **SwarmSynthesizer — Session summary generation**
  - **Files**: NEW `proxy-bridge/src/lib/SwarmSynthesizer.ts`, `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Description**: `synthesizeSwarmSession(projectPath)` reads: last 20 roundtable messages + last 10 findings + judged proposals + PLAN.md task status. Writes structured markdown to `.queenbee/session-summary.md` (5 sections: Completed Tasks, In-Progress, Key Findings, Proposal Outcomes, Roundtable Activity). Called at end of each heartbeat cycle. Output also read by `read_swarm_context`.
  - **Worker**: BACKEND

- [x] `LS-09`: [Backend] **Context Compression** — SWE-agent ACI pattern for long tasks
  - **Files**: NEW `proxy-bridge/src/lib/ContextCompressor.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: Two mechanisms: (1) **History processor** — keep last 5 messages in full, collapse older to single-line summaries, deduplicate repeated errors. (2) **Context folding** — after each subtask completes, compress full trajectory to: outcome (1 sentence) + key decisions (3 bullets) + artifacts (file list). Full trajectory discarded (~10x token reduction). Both from SWE-agent (arXiv:2405.15793) + context-folding (arXiv:2510.11967).
  - **Worker**: BACKEND

---

## 🧬 PHASE 16: GROUP-EVOLVING AGENTS (GEA)
> **Goal**: Implement the Group-Evolving Agents paradigm (UCSB, arXiv:2602.04837, Feb 2026) — agents that share evolutionary experience across sessions, reflect collectively, and self-modify their workflows without human intervention. On SWE-bench Verified, GEA achieves 71% pass rate vs 56.7% for solo evolution baselines, matching top human-designed frameworks at zero added inference cost.
>
> **Core idea**: Shift the unit of evolution from individual agents to *groups*. Each session, top-K agents (scored by Performance × √Novelty) pool their evolutionary traces. A Reflection LLM analyzes the pool and generates "evolution directives" — workflow changes, new tool strategies, prompt patches — that the next agent generation inherits. Beneficial discoveries never die in isolated branches.
>
> **Research basis**: GEA (arXiv:2602.04837), AFlow/MCTS workflow search (ICLR 2025 Oral, arXiv:2410.10762), Reflexion already in LS-07, Darwin Godel Machine (DGM).
>
> **What QueenBee already has**: `ByzantineDetector` (fault signals), `ContextCompressor` (history), `MemoryStore` (memory), `SwarmSynthesizer` (session summary), `Roundtable` (inter-agent comms), Reflexion in `AutonomousRunner` (LS-07). What's missing: the *cross-session evolutionary feedback loop* (Archive → Score → Select → Reflect → Evolve → Deploy).

### 🔴 HIGH PRIORITY — Core Evolutionary Loop

- [x] `GEA-01`: [Backend] **Experience Archive** — Persistent cross-session evolutionary trace store
  - **Files**: NEW `proxy-bridge/src/lib/ExperienceArchive.ts`, NEW `proxy-bridge/src/pages/api/experience-archive.ts`
  - **Storage**: `.queenbee/experience-archive.jsonl` (append-only, one JSON object per line)
  - **Description**: Stores every completed agent session's evolutionary trace. Schema per entry:
    ```ts
    {
      id: string,                   // uuid
      agentId: string,
      sessionId: string,
      projectPath: string,
      timestamp: number,
      toolHistory: Array<{ tool: string, args: object, outcome: 'success'|'fail'|'timeout', durationMs: number }>,
      taskOutcomes: Array<{ taskId: string, success: boolean }>,
      successRate: number,          // 0–1
      toolVector: number[],         // binary presence vector over all known tools (for novelty calc)
      codePatches: string[],        // unified diffs applied during session
      promptStrategies: string[],   // notable prompt patterns used
      performanceScore: number,     // filled by GEA-02
      noveltyScore: number,         // filled by GEA-02
      combinedScore: number,        // performanceScore × √noveltyScore
    }
    ```
  - **API**: `GET /api/experience-archive?projectPath=&limit=20&sortBy=combinedScore` → returns top entries. `POST /api/experience-archive` → append entry.
  - **Class**: `ExperienceArchive.append(entry)`, `ExperienceArchive.query({ projectPath, limit, sortBy })`, `ExperienceArchive.getToolVocabulary()` (union of all tools ever seen → used to build toolVector).
  - **Worker**: BACKEND

- [x] `GEA-02`: [Backend] **Performance-Novelty Scorer** — Score agents after each session
  - **Files**: `proxy-bridge/src/lib/AgentSession.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/lib/ExperienceArchive.ts`
  - **Description**: Wired into `AgentSession` `onSessionEnd`. Computes two scores and persists to archive:
    1. **Performance** = `tasksCompleted / totalTasks` (from ProjectTaskManager) OR `toolSuccessRate` if no tasks.
    2. **Novelty** = cosine distance between this session's `toolVector` and the mean toolVector of last 20 archive entries. Measures how *different* this agent's tool usage was from the population.
    3. **Combined** = `performance × √novelty` (GEA paper Algorithm 1). Balances exploitation (high perf) and exploration (behavioral diversity).
  - **Emit**: `experience:scored` socket event with `{ sessionId, performance, novelty, combined }` so dashboard can show it.
  - **Worker**: BACKEND

- [x] `GEA-03`: [Backend] **Reflection Module** — Group LLM call generating cross-agent evolution directives
  - **Files**: NEW `proxy-bridge/src/lib/GEAReflection.ts`, `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Description**: Triggered at end of each heartbeat cycle (after SwarmSynthesizer). Selects top-K (K=2 default, configurable in PolicyStore) archive entries by `combinedScore` for the current project. Aggregates their traces into a "collective experience pool":
    - Tool invocation histories (what tools, in what order, outcome)
    - Success patterns (tool sequences that preceded `success: true` task outcomes)
    - Failure patterns (tool sequences preceding `fail` outcomes)
    - Code patches applied
  - Makes one LLM call (`claude-sonnet-4-6`) with the pool as context and this system prompt:
    > "You are an evolution reflection engine. Analyze the collective experience traces from top agents below. Identify: (1) tool usage patterns that correlate with success, (2) failure patterns to avoid, (3) novel tools or workflows that appeared in high-novelty agents. Output evolution directives as JSON: `{ workflowDirectives: string[], toolPreferences: string[], promptPatches: string[], avoidPatterns: string[] }`. Be specific and actionable."
  - Stores output to `.queenbee/evolution-directives.json` with timestamp and source agent IDs.
  - **Worker**: BACKEND

- [x] `GEA-04`: [Backend] **Evolution Module** — Apply directives to per-project agent config
  - **Files**: NEW `proxy-bridge/src/lib/GEAEvolution.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Storage**: `.queenbee/evolved-config.json`
  - **Description**: Reads `evolution-directives.json`, produces a patch to the agent's runtime config:
    ```ts
    {
      systemPromptAppend: string,    // extra instructions derived from directives
      toolOrderHints: string[],      // preferred tool order for this project
      avoidPatterns: string[],       // injected as "AVOID:" warnings in system prompt
      retryThresholdOverride?: number, // tighten/loosen circuit breaker
      lastEvolvedAt: number,
      sourceDirectiveIds: string[],
    }
    ```
  - `AutonomousRunner.getEnhancedContext()` loads `evolved-config.json` for the session's `projectPath` and appends `systemPromptAppend` + `avoidPatterns` to the system prompt. Tool order hints fed to ToolExecutor as priority list.
  - Versioned: keep last 5 evolved configs in `.queenbee/evolved-config-history.jsonl` for rollback.
  - **Worker**: BACKEND

### 🟠 HIGH PRIORITY — Self-Healing & Observability

- [x] `GEA-05`: [Backend] **Group-Based Self-Healing** — Peer-assisted bug repair on Byzantine fault
  - **Files**: `proxy-bridge/src/lib/ByzantineDetector.ts`, `proxy-bridge/src/lib/GEAReflection.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: When `ByzantineDetector` transitions a session to OPEN state (3+ fault signals), trigger a group-repair cycle instead of just a backoff:
    1. Query ExperienceArchive for the K=2 healthy agents with highest `combinedScore` from the same project.
    2. Run a *repair reflection* LLM call: "Agent `{id}` is stuck. Fault signals: `{signals}`. Here are traces from healthy peers: `{traces}`. Diagnose the failure mode and generate a recovery directive (specific prompt patch or tool avoidance rule) to unblock the agent."
    3. Inject the repair directive as a system message into the stuck agent's context (on HALF_OPEN probe attempt).
    4. Track repair iterations in the fault event log. Target: ≤2 iterations (vs GEA paper's 1.4 vs DGM's 5).
  - **Metric**: Emit `byzantine:repair_attempted` and `byzantine:repair_succeeded` events with `iterationCount`.
  - **Worker**: BACKEND

- [x] `GEA-06`: [Backend] **Evolutionary Trace Emitter** — Wire agent loop to emit structured trace events
  - **Files**: `proxy-bridge/src/lib/ToolExecutor.ts`, `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: Instrument the agent loop to emit fine-grained trace events consumed by ExperienceArchive:
    - **ToolExecutor**: after each tool call, emit `trace:tool_use` event `{ tool, args (sanitized, no secrets), outcome, durationMs, sessionId }`.
    - **AgentSession**: on session end, aggregate into `toolHistory[]`, compute `toolVector` (binary array across vocabulary), collect `codePatches` (any `write_file` diffs), collect `taskOutcomes` from ProjectTaskManager.
    - Auto-persist to ExperienceArchive via `ExperienceArchive.append()`. No manual wiring needed after this task.
  - **Note**: Sanitize args — strip file contents, tokens, passwords. Only keep structural metadata (file path, tool name, success/fail).
  - **Worker**: BACKEND

### 🟡 MEDIUM PRIORITY — Workflow Search (AFlow-Inspired)

- [x] `GEA-07`: [Backend] **MCTS Workflow Optimizer** — Automated workflow search over operator compositions
  - **Files**: NEW `proxy-bridge/src/lib/WorkflowOptimizer.ts`
  - **Research**: AFlow (ICLR 2025 Oral, arXiv:2410.10762) — reformulates workflow as code-represented graph searched via MCTS. Achieves 5.7% avg improvement over SOTA, enabling smaller models to beat GPT-4o at 4.55% cost.
  - **Description**: Implement a lightweight MCTS-style search over agentic workflow *operators* (predefined composable patterns):
    - **Operators** (from AFlow): `Ensemble` (run prompt N times → LLM vote), `ReviewRevise` (generate → critique → refine, up to 3 rounds), `Sequential` (chain tools A→B→C), `Parallel` (fan-out then aggregate).
    - **MCTS tree**: each node = a complete workflow configuration (operator composition + tool priority hints). UCB1 selection: `score + C × √(ln(N)/n)`.
    - **Evaluation**: run a small test task against each candidate workflow, score by success. Successful workflows stored as candidates in ExperienceArchive.
    - **Trigger**: run after GEA-03 reflection, during low-activity periods (HeartbeatService idle cycles). Max 5 MCTS rollouts per cycle to limit cost.
    - **Output**: best operator composition merged into `evolved-config.json` `workflowOperators` field. `AutonomousRunner` reads and applies operator wrapping around LLM calls.
  - **Worker**: BACKEND

### 🟢 LOW PRIORITY — Frontend Observability

- [x] `GEA-08`: [Frontend] **Evolution Dashboard Panel** — Visualize agent evolution history and directives
  - **Files**: NEW `dashboard/src/components/evolution/EvolutionPanel.tsx`, `dashboard/src/components/evolution/AgentArchiveList.tsx`
  - **Description**: New sidebar panel ("Evolution" tab) with three sections:
    1. **Agent Archive**: table of recent sessions from `GET /api/experience-archive`, columns: Session ID, Date, Performance, Novelty, Combined Score, Tools Used count. Sortable.
    2. **Current Directives**: renders `.queenbee/evolution-directives.json` — shows `workflowDirectives`, `toolPreferences`, `avoidPatterns` as styled lists with category badges.
    3. **Evolved Config**: shows active `evolved-config.json` patches applied to current project — `systemPromptAppend` in a code block, tool order hints as ordered list.
  - Wire via new socket event `experience:scored` (GEA-02) to live-update scores as sessions end.
  - **Worker**: FRONTEND

---

## 🔬 PHASE 17: NEXT-GEN AGENT INTELLIGENCE
> **Goal**: Implement the top 5 findings from a parallel research survey of 28 papers adjacent to GEA (Feb 2026). Each task is ranked by implementability × impact. Research sources: SWE-Pruner (arXiv:2601.16746), ContextEvolve (arXiv:2602.02597), Huxley-Godel Machine (arXiv:2510.21614), DecentLLMs (arXiv:2507.14928), A-MEM (arXiv:2502.12110), MAGMA (arXiv:2601.03236), MAGELLAN (arXiv:2502.07709), Self-Evolving Agents Survey (arXiv:2508.07407), ICML Position Paper (arXiv:2506.05109).

### 🔴 HIGH PRIORITY

- [x] `P17-01`: [Backend] **Goal-Conditioned Context Pruning** — Semantic relevance-based message pruning
  - **Files**: `proxy-bridge/src/lib/ContextCompressor.ts`
  - **Research**: SWE-Pruner (arXiv:2601.16746) + ContextEvolve (arXiv:2602.02597). 20–40% token reduction, <1% performance degradation.
  - **Description**: Augment `ContextCompressor` with a goal-conditioned relevance pass after the existing positional truncation. When an agent starts a subtask, it declares a concise goal description (e.g., "Fix race condition in TaskManager.claimTask()"). The compressor scores each retained message segment against the goal using cosine similarity on lightweight embeddings (or an LLM-scored relevance call for the first N segments). Segments below threshold are replaced with `[pruned: low relevance to current goal]`. Two-pass compression: (1) existing positional/deduplication pass, (2) goal-conditioned relevance pass.
  - **Key method**: `ContextCompressor.pruneByGoal(messages, goalDescription, threshold=0.3)` — called from `AutonomousRunner` after each subtask completion when goal can be extracted from the `<plan>` block.
  - **Fallback**: if no goal description is available, skip goal-pass and use existing compressor unchanged.
  - **Worker**: BACKEND

- [x] `P17-02`: [Backend] **Geometric Median Consensus Aggregation** — Byzantine-robust debate scoring
  - **Files**: `proxy-bridge/src/lib/Roundtable.ts`, `proxy-bridge/src/lib/ProposalService.ts`
  - **Research**: DecentLLMs (arXiv:2507.14928). Geometric Median (GM) via Weiszfeld's algorithm is Byzantine-resistant with >50% honest agents (vs. classical 2/3 threshold).
  - **Description**: Replace mean/majority aggregation in QueenBee's Free-MAD debate and Roundtable consensus with Geometric Median aggregation. When multiple evaluators score a proposal (0–100 in the existing system), aggregate using GM instead of average. Weiszfeld's algorithm converges in ~50 iterations:
    ```
    guess = mean of scores (init)
    for 50 iterations:
      weights[i] = 1 / dist(score[i], guess)   (1e10 if dist < 1e-10)
      guess = weighted_mean(scores, weights)
    ```
  - Add `geometricMedian(scores: number[][]): number[]` as a utility in a new `proxy-bridge/src/lib/consensus.ts` file, wire into `ProposalService.judgeProposal()` and any Roundtable aggregation steps.
  - **Why**: QueenBee's ByzantineDetector catches individual agent faults. GM aggregation ensures that even during partial-Byzantine conditions (e.g., 40% of evaluators are OPEN-state faulty), the consensus score is not distorted.
  - **Worker**: BACKEND

- [x] `P17-03`: [Backend] **Clade-Metaproductivity (CMP) Selection** — Lineage-aware parent agent selection
  - **Files**: `proxy-bridge/src/lib/ExperienceArchive.ts`, `proxy-bridge/src/lib/GEAReflection.ts`
  - **Research**: Huxley-Godel Machine (arXiv:2510.21614). HGM showed that selecting by *descendant potential* outperforms selecting by current score while using less compute.
  - **Description**: Add a `cmBonus` field to `ArchiveEntry` (default 0). When a new session is archived and its `agentId` traces back to a parent session (via a new `parentSessionId` field), update the parent's `cmBonus` = average delta of descendant `combinedScore` vs parent's `combinedScore`. Modify `GEAReflection.reflect()` to select top-K parents using the CMP-weighted score: `0.6 × combinedScore + 0.3 × cmBonus + 0.1 × noveltyScore` instead of raw `combinedScore`. Add `parentSessionId?: string` to `ArchiveEntry` — set by `AutonomousRunner` when a session is spawned from a worker (carry `parentThreadId` through).
  - **Expected impact**: The swarm evolves toward agents with high *future* potential, not just current performance — avoids local optima.
  - **Worker**: BACKEND

### 🟠 MEDIUM PRIORITY

- [x] `P17-04`: [Backend] **Semantic Graph Memory (A-MEM / MAGMA)** — Link-aware memory store
  - **Files**: `proxy-bridge/src/lib/MemoryStore.ts`
  - **Research**: A-MEM (arXiv:2502.12110, NeurIPS 2025) + MAGMA (arXiv:2601.03236). A-MEM: Zettelkasten-style semantic links between memories. MAGMA: 4 orthogonal graph views (semantic, temporal, causal, entity). 45.5% higher reasoning accuracy, 95% token reduction on long-context benchmarks.
  - **Description**: Upgrade `MemoryStore` to maintain a semantic link graph alongside the flat storage:
    1. **On insert**: after storing a new memory entry, run a link analysis pass — LLM-generate keywords+tags, then compute cosine similarity against last 50 entries. Any entry with similarity >0.75 gets a bidirectional semantic link.
    2. **Temporal links**: automatically link each new memory to the 3 most recent memories (temporal adjacency).
    3. **Causal links**: if a new memory's content contains phrases like "because", "caused by", "as a result of", or references a past error, attempt to link to memories matching the referenced cause.
    4. **Graph retrieval**: add `MemoryStore.getWithLinks(id)` → returns the memory + its linked memories (1-hop traversal). Update `read_memory` tool to use graph traversal when `depth > 0` is specified.
  - **Schema change**: add `semanticLinks: string[]`, `temporalLinks: string[]`, `causalLinks: string[]` to the `MemoryEntry` type.
  - **Worker**: BACKEND

- [x] `P17-05`: [Backend] **Triggered Evolution + Metacognitive Planning** — Performance-adaptive evolution scheduling
  - **Files**: NEW `proxy-bridge/src/lib/MetacognitivePlanner.ts`, `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/lib/HeartbeatService.ts`
  - **Research**: Self-Evolving Agents Survey (arXiv:2508.07407) — identifies "triggered evolution" as underexplored. ICML Position Paper (arXiv:2506.05109) — intrinsic metacognition requires second-order self-assessment. MAGELLAN (arXiv:2502.07709) — learning progress (LP) as a curriculum signal.
  - **Description**: Add a `MetacognitivePlanner` that tracks per-task-type success rates and triggers evolution only when LP stagnates:
    1. **Competence model**: sliding window of last 20 outcomes per task type (detected from task description keywords). Success rate = fraction succeeded. LP = delta between first-half and second-half of window.
    2. **Trigger condition**: LP ≤ 0.05 for ≥10 attempts on a task type → emit `evolution:triggered` event with `{ taskType, stagnationRate }`.
    3. **Focused reflection**: GEAReflection's `reflect()` accepts an optional `focusTaskType` param — when triggered, it filters the experience pool to only entries matching that task type, generating targeted directives.
    4. **HeartbeatService integration**: currently runs reflection on every cycle. Change to: run full reflection only when `MetacognitivePlanner.hasTrigger()` returns true OR every 10 cycles regardless. This saves LLM cost on healthy projects.
    5. **Second-order reflection**: if a task type triggers 3 times in a row without LP improvement, inject a meta-reflection: "Your reflection strategy for this task type is not working. Analyze WHY your directives are failing and suggest changes to the reflection approach itself."
  - **Persistence**: `.queenbee/metacognitive-state.json`
  - **Worker**: BACKEND

### 📚 FURTHER RESEARCH — Future Candidates (not yet scheduled)

> Papers from the Feb 2026 survey not yet assigned to phases. Ranked by future relevance.

- **Agent0** (arXiv:2511.16043) — Coach-athlete co-evolution: a Curriculum agent proposes increasingly hard tasks while an Executor agent solves them. Both evolve together, no human data needed. Relevant for QueenBee's swarm spawn logic.
- **SWE-RL** (arXiv:2512.18552, Meta FAIR) — Self-play for coding: agent injects bugs of increasing complexity, then repairs them via RL. +10.4 pts on SWE-bench Verified. No human-labeled issues. Possible QueenBee testing harness.
- **EvoAgentX** (github.com/EvoAgentX/EvoAgentX) — Open-source framework combining AFlow MCTS + DSPy prompt optimization + auto-evaluation in one pipeline. Swap-in optimizer architecture compatible with QueenBee's WorkflowOptimizer.
- **CP-WBFT** (arXiv:2511.10400) — LLM self-confidence as a 6th Byzantine signal: prompt-side probes (consistency across paraphrases) + decoder-side probes (token probability entropy). Directly extends QueenBee's `ByzantineDetector` with 2 new signals.
- **EvolveR** (arXiv:2510.16079) — Distills interaction trajectories into generalized strategy principles with RL-weighted retrieval. Complements QueenBee's Reflexion (which keeps flat verbal buffer) with structured principle extraction.
- **MAGELLAN** (arXiv:2502.07709, ICML 2025) — Learning progress prediction for curriculum agents. LP generalizes to unseen goal types via embedding similarity. Used as the mathematical foundation for P17-05.
- **Self-Evolving Multi-Agent Networks** (OpenReview:4R71pdPBZp) — Network topology evolution: agents + edges between them are dynamically added/removed based on performance. Meta-level above GEA's fixed group structure. Future QueenBee swarm topology optimization.
- **AWM: Agent Workflow Memory** (arXiv:2409.07429) — Induces reusable workflow routines from trajectories, stores as indexed memory. +24.6%/+51.1% on Mind2Web/WebArena. Would upgrade QueenBee's MemoryStore with procedural workflow recall.
- **SEAL** (arXiv:2506.10943) — LLM generates its own finetuning directives (data restructuring + hyperparameters). Relevant if QueenBee integrates local model hosting.
- **Multi-Agent Evolve** (arXiv:2510.23595) — Proposer/Solver/Judge from a single LLM in a self-play RL loop. +4.54% avg on 22 benchmarks with Qwen2.5-3B. No external data.
---

## 🐝 PHASE 18: COMPOSIO ORCHESTRATION PATTERNS
> **Goal**: Adopt key patterns from Composio Agent Orchestrator to enhance QueenBee's agent lifecycle management, activity detection, and PR automation.
> **Research**: Deep analysis of Composio Agent Orchestrator from `old_docs/agent-orchestrator/`
> **Priority**: P0 (Critical) → P1 (High) → P2 (Medium)

### 🔴 P0 — LIFECYCLE STATE MACHINE

- [x] `CO-01`: [Backend] **Add Lifecycle States to AutonomousRunner**
  - **Files**: MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: Replace simple `starting | running | completed | failed` states with formal state machine from Composio:
    ```
    spawning → working → pr_open → ci_failed → review_pending → changes_requested → approved → mergeable → merged
    ```
  - **Implementation**:
    - Add `SessionLifecycleState` enum with all states
    - Track state transitions in session metadata
    - Emit lifecycle events on state changes (`session.spawned`, `session.working`, `session.pr_open`, etc.)
    - Wire into UI via socket events
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `CO-02`: [Backend] **Activity Detection via JSONL Introspection**
  - **Files**: MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`, NEW `proxy-bridge/src/lib/ActivityDetector.ts`
  - **Description**: Implement Composio-style activity detection by reading Claude Code's JSONL session files
  - **Implementation**:
    - Read `~/.claude/projects/{encoded-path}/*.jsonl`
    - Parse last entry for activity type: `user`, `tool_use`, `progress` → active; `permission_request` → waiting_input; `error` → blocked
    - Detect `idle` when no new entries for >5 minutes
    - States: `active`, `ready`, `idle`, `waiting_input`, `blocked`, `exited`
    - Emit `activity_state_changed` socket events
  - **Worker**: BACKEND
  - **Estimate**: 4h

### 🟠 P1 — REACTIONS & PR AUTOMATION

- [x] `CO-03`: [Backend] **Implement Reactions System**
  - **Files**: NEW `proxy-bridge/src/lib/ReactionsEngine.ts`, MODIFY `proxy-bridge/src/lib/PolicyStore.ts`
  - **Description**: Composio-style automatic responses to events
  - **Implementation**:
    ```yaml
    reactions:
      ci-failed:
        auto: true
        action: send-to-agent
        retries: 3
        escalateAfter: 30m
      changes-requested:
        auto: true
        action: send-to-agent
        escalateAfter: 1h
      approved-and-green:
        auto: true
        action: auto-merge
    ```
    - Add reactions config to PolicyStore
    - ReactionsEngine listens to lifecycle events
    - Actions: `send-to-agent` (forward details to worker), `notify` (alert human), `auto-merge`
    - Escalation: after N retries or time threshold
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `CO-04`: [Backend] **PR Lifecycle Polling**
  - **Files**: MODIFY `proxy-bridge/src/lib/LifecycleManager.ts` (or new file), MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Track PR status, CI checks, and reviews via GitHub API
  - **Implementation**:
    - Poll PR state on lifecycle tick (every 30s)
    - Track: PR exists?, CI status (passing/failing), review status (approved/changes_requested), merge readiness
    - Update session lifecycle state based on PR state
    - Detect when workers create PRs via PostToolUse hooks or GitHub API
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `CO-05`: [Backend] **PostToolUse Metadata Auto-Update Hooks**
  - **Files**: NEW `proxy-bridge/src/lib/MetadataHooks.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Auto-update session metadata when agents run git/gh commands
  - **Implementation**:
    - Intercept `gh pr create` → update `pr` and `status` in metadata
    - Intercept `git checkout -b` / `git switch -c` → update `branch`
    - Intercept `gh pr merge` → update `status` to `merged`
    - Store metadata in flat key=value files in session directory
  - **Worker**: BACKEND
  - **Estimate**: 2h

### 🟡 P2 — ENHANCED ORCHESTRATION

- [x] `CO-06`: [Backend] **Auto-Merge Capability**
  - **Files**: MODIFY `proxy-bridge/src/lib/ReactionsEngine.ts`, MODIFY `proxy-bridge/src/lib/ForgeAdapter.ts`
  - **Description**: Automatically merge PRs when approved + CI passes
  - **Implementation**:
    - In ReactionsEngine, when state reaches `mergeable` and reaction `approved-and-green.auto` is true
    - Call GitHub/GitLab API to merge
    - Emit `merge.completed` event
    - Handle merge conflicts gracefully (notify human)
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `CO-07`: [Backend] **Git Worktree Session Manager**
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`, NEW `proxy-bridge/src/lib/SessionWorktreeManager.ts`
  - **Description**: Adopt Composio's worktree-based isolation pattern
  - **Implementation**:
    - Ensure each session has isolated git worktree
    - Hash-based directory naming to prevent collisions: `{hash}-{projectId}/worktrees/{sessionId}/`
    - Proper cleanup on session termination
    - Archive completed sessions
  - **Worker**: BACKEND
  - **Estimate**: 2h

### 🟢 P3 — FUTURE ENHANCEMENTS

- [ ] `CO-08`: [Backend] **Plugin Architecture (8-Slot System)**
  - **Files**: NEW `proxy-bridge/src/lib/plugins/`
  - **Description**: Consider adopting Composio's plugin pattern for swappable abstractions (Runtime, Agent, Workspace, Tracker, SCM, Notifier, Terminal, Lifecycle)
  - **Note**: Lower priority — QueenBee's current tool-based approach works well. This is for future extensibility.
  - **Worker**: BACKEND

