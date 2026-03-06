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

## 🧩 RESEARCH: Multi-Agent Team Orchestration Patterns
> **Source**: Analysis of awesome-llm-apps multi-agent teams section
> **Reference**: https://github.com/Shubhamsaboo/awesome-llm-apps#-multi-agent-teams
> **STATUS**: ✅ IMPLEMENTED — Key patterns extracted and built into QueenBee

### Multi-Agent Team Projects to Study
Based on the awesome-llm-apps repository, here are key multi-agent team implementations:

| Project | Description | Relevance |
|---------|-------------|-----------|
| **AG2 Adaptive Research Team** | Adaptive research with AG2 framework | Swarm coordination patterns |
| **AI Services Agency (CrewAI)** | CrewAI-based service agency | Role-based agent orchestration |
| **Multimodal Coding Agent Team** | Multi-modal code generation | UI/code coordination |
| **AI Travel Planner Agent Team** | Multi-stage planning | Task decomposition |
| **AI Self-Evolving Agent** | Self-improving agent | Learning & adaptation (HIGH PRIORITY) |
| **AI Competitor Intelligence** | Competitive analysis | Research coordination |
| **AI Finance Agent Team** | Financial analysis | Specialized roles |
| **AI Legal Agent Team** | Legal research | Multi-specialist coordination |
| **AI Recruitment Agent Team** | HR workflows | Sequential task flow |

### Key Patterns to Extract
1. **Role-Based Specialization** - Different agents for different tasks
2. **Adaptive Research** - Dynamic task allocation based on agent capabilities
3. **Multi-Modal Coordination** - Handling different input/output types
4. **Self-Evolution** - Agent learning from past interactions
5. **Sequential Workflows** - Ordered task execution with dependencies

### ✅ Implementation Derived from Research
- **[x] P0 — Coverage Threshold Check** (`CompletionGate.ts`): `checkCoverage()` method reads `.coverage-thresholds.json`, runs `test:coverage` script if no summary exists, and blocks DONE transitions if any metric (lines/functions/branches/statements) falls below threshold. Implements the metaswarm "never ship undertested code" pattern.
- **[x] P1 — Fresh Reviewer / Anti-Anchoring** (`LLMJudge.ts`): `freshSession` option rotates the judge provider away from both the worker provider AND the last-used judge to prevent anchoring bias across evaluation rounds. `selectFreshJudgeProvider()` tracks `lastJudgeProvider` and excludes it on next call.
- **[x] P2 — 4-Phase Execution Loop** (`ExecutionLoop.ts`): Full `IMPLEMENT → VALIDATE → ADVERSARIAL_REVIEW → COMMIT` pipeline with max 3 retry iterations, continuation prompt injection on failure, and `EXECUTION_LOOP_COMPLETE` socket event on commit. Adversarial review uses `freshSession: true` to get a different-provider judgment each time.

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
  - **Logic**: Before `write_to_file`, search DB for files with similar extension/path.
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
  - **Description**: Static audit for commands (rm -rf, fork bombs, curl|bash, dd, mkfs) and content (API keys, JWTs, GitHub PATs). Blocks high/critical risk operations. Wired into write_to_file, read_file, read_file_range, and runShellCommand.
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
  - **Description**: Track which agents own which files. When `write_to_file` is called, check if another active agent has also written to the same file. If so, inject a system message alert into the other agent's context via Roundtable.
  - **Files**: NEW `proxy-bridge/src/lib/FileWatcher.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts` (write_to_file handler), MODIFY `proxy-bridge/src/lib/Roundtable.ts`
  - **Implementation**:
    - `FileWatcher`: In-memory map of `filePath → { lastWriter: agentId, timestamp }`. No fs.watch needed — just track on write_to_file tool calls.
    - On write_to_file: Check if `lastWriter !== currentAgent`. If conflict, post to Roundtable: `"⚠️ {agentId} modified {file} which was last edited by {otherAgent}"`
    - Expose `getFileOwnership()` for diagnostics
  - **Criteria**: Worker A edits `App.tsx`, Worker B gets a system message alert without needing `chat_with_team`.
  - **Worker**: BACKEND

### 🟠 P2 — Core Swarm Execution
- [x] `QB-05`: [Backend] **Worker Prompt Templating**
  - **Priority**: P2 — Specialized prompts prevent "jack-of-all-trades" LLM drift
  - **Description**: Create specialized worker personas with focused system prompts.
  - **Files**: NEW `proxy-bridge/src/lib/prompts/workers/ui-bee.ts`, NEW `proxy-bridge/src/lib/prompts/workers/logic-bee.ts`, NEW `proxy-bridge/src/lib/prompts/workers/test-bee.ts`, NEW `proxy-bridge/src/lib/prompts/workers/index.ts`
  - **Implementation**:
    - `UI_BEE`: Focus on components, styling, accessibility. Tools: write_to_file, read_file, search. No shell access.
    - `LOGIC_BEE`: Focus on business logic, APIs, data flow. Full tool access.
    - `TEST_BEE`: Focus on test writing, coverage. Tools: write_to_file, read_file, run_shell (test commands only).
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
  - **Description**: `runBackgroundWorker` now guarantees a completion summary is posted to the shared roundtable even if the LLM never calls `chat_with_team`. `extractWorkerSummary` collects file paths with line stats (+X/-Y lines) from `write_to_file` results plus the last assistant message. Posted as `[DONE]` with full summary. Swarm-complete message also posted when all workers finish.
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

- [x] `FIX-09`: [Frontend] **Embedded Terminal & Open in Terminal**
    - **Description**: The embedded terminal is not working properly and "Open in Terminal" button is broken.
    - **Files**: `dashboard/src/components/layout/XtermTerminal.tsx`, `dashboard/src/components/layout/AgenticWorkbench.tsx`
    - **Fix**: Rewrote XtermTerminal with live connection status indicator, reconnect button, proper `cwd` passthrough from active project, and polling transport fallback. Fixed terminal socket server to pass `cwd` from query param, use richer shell env, and handle pty spawn errors. Fixed Electron "Open in Terminal" to use AppleScript via new `open-in-terminal` IPC handler in main.ts + preload.ts exposure instead of erroneously calling the HTTP executeCommand API.
    - **Worker**: FRONTEND + ELECTRON

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

## 🗺 PHASE 19: IMPACT ANALYSIS & CODE GRAPH
> **Goal**: Implement live, code-driven (not AI-inferred) dependency and call graph visualizer for proactive impact analysis.

- [x] `FEAT-19`: [Fullstack] **Live Impact Analysis & Code Graph Visualizer**
  - **Files**: `proxy-bridge/src/lib/tools/GraphEngine.ts`, `proxy-bridge/src/pages/api/graph/*`, `dashboard/src/components/navigator/CodeGraphPanel.tsx`
  - **Description**: Two-layer analysis: (1) File-level dependencies using `skott` (with tsconfig path alias resolution), (2) Function-level call graph using `@ast-grep/napi` — catches class methods (`method_definition`), top-level functions, and arrow/fn-expression variables. Tested + accuracy-audited against QueenBee itself (248 files, 21 fns on ToolExecutor, 9 on AgentFactory, real circular dep `ToolExecutor→AutonomousRunner→AgentSession→ToolExecutor`).
  - **Tools**: `scout_impact(filePath)`, `graph_find_callers(fnName)`, `graph_summary()`.
  - **UI**: Interactive force-directed canvas graph (zero deps, HTML5 Canvas). Features: drag-to-pin, scroll-to-zoom, pan, click for blast-radius sidebar (direct + transitive dependents, imports, npm packages, functions list, orphan/circular warnings). All labels accurate.
  - **Accuracy fixes applied**: class method extraction, thirdParty field, `.next/` leakage, page-file false orphans, self-node in transitive deps, callerFn attribution for `const x = call()` patterns.
  - **Worker**: FULLSTACK


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

---

## 🚀 PHASE 18: CAPABILITY UPGRADE — Competitive Parity & Quality (Derived from 11-Repo Analysis)
> **Goal**: Close the gaps identified by comparing QueenBee against 11 peer projects. Three tracks: ADD missing features, IMPROVE existing ones, CONSOLIDATE redundant ones.
> **Source**: `/tmp/repo-analysis/DEBATE_REPORT.md`

---

### 🔴 P1 — BUILD NOW (Week 1-2) — Highest impact, contained scope

- [x] `P18-01`: [Backend] **Hash-Anchored Edit Tool (Hashline)**
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`, NEW `proxy-bridge/src/lib/HashlineIndex.ts`
  - **Description**: Tag every file line with a content hash on read. Edit operations validate hash before applying — stale-line errors become impossible. Source: oh-my-opencode (6.7% → 68.3% edit success rate improvement).
  - **Implementation**:
    - `HashlineIndex.ts`: per-worktree `Map<filePath, Map<lineNum, sha256[:8]>>`, populated lazily on `read_file`
    - Extend `read_file` tool: add `with_hashes?: boolean` param; when true, return lines as `"LINE#1:a3f9| content"`
    - New `hashline_edit` tool: accepts `{ file, edits: [{lineId: "LINE#1:a3f9", newContent}] }`, validates each hash before writing
    - On hash mismatch: return typed error `{ error: "STALE_LINE", lineId, currentHash }` — forces agent to re-read
    - Keep existing `write_file` for full-file rewrites; `hashline_edit` for surgical edits
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `P18-02`: [Backend] **Completion Enforcement State Machine**
  - **Files**: MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`, NEW `proxy-bridge/src/lib/CompletionGate.ts`
  - **Description**: Refuse to mark a task DONE until proof of completeness: unchecked TodoWrite items, unresolved test failures, or failed checklist gate all trigger continuation (up to 10 rounds). Source: accomplish + oh-my-opencode + intellegix (3 independent convergences).
  - **Implementation**:
    - `CompletionGate.ts`: checks (1) last agent message for unchecked `- [ ]` items, (2) `traceToolHistory` for failed test runs, (3) CLAUDE.md "## Completion Gate" section for unchecked gates
    - In `AutonomousRunner`: before transitioning to `APPROVED`, call `CompletionGate.check(session)`
    - If gate fails: re-enter `WORKING` state with forced continuation prompt listing what's incomplete
    - Cap at 10 continuation attempts; surface as `WAITING_INPUT` if still incomplete after cap
    - Emit `COMPLETION_GATE_FAILED` socket event with details for dashboard visibility
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `P18-03`: [Backend] **Frozen Snapshot Injection (Prefix Cache Stability)**
  - **Files**: MODIFY `proxy-bridge/src/lib/AgentSession.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: Capture AGENTS.md + memory context as a frozen snapshot at session start. Pass as immutable `system` param on every LLM call — never re-scan per turn. Exploits Anthropic prefix cache (~90% cost reduction on repeated prefix). Source: hermes-agent.
  - **Implementation**:
    - In `AgentSession.initialize()`: read AGENTS.md + call `MemoryStore.getAll()` once → build `systemSnapshot: string`
    - Store `systemSnapshot` + `frozenAt: Date` on session
    - Pass `systemSnapshot` as the `system` field to every `UnifiedLLMService.chat()` call
    - `ContextCompressor` may only operate on `messages[]`, never on `systemSnapshot`
    - Track Anthropic `cache_creation_input_tokens` / `cache_read_input_tokens` in `CostTracker` for cache hit rate visibility
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `P18-04`: [Backend] **Credential Scrubbing in Tool Outputs**
  - **Files**: NEW `proxy-bridge/src/lib/CredentialScrubber.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`, MODIFY `proxy-bridge/src/lib/Roundtable.ts`, MODIFY `proxy-bridge/src/lib/ExperienceArchive.ts`
  - **Description**: Post-process all ToolExecutor outputs, Roundtable broadcasts, and ExperienceArchive entries to redact API keys, tokens, and secrets. Source: goclaw (7-step output sanitization pipeline).
  - **Implementation**:
    - `CredentialScrubber.ts`: regex patterns for OpenAI (`sk-[A-Za-z0-9]{48}`), Anthropic (`sk-ant-[A-Za-z0-9\-]{95}`), GitHub (`gh[pos]_[A-Za-z0-9]{36}`), AWS (`AKIA[A-Z0-9]{16}`), generic `(api[_-]?key|token|secret)\s*[:=]\s*\S+`
    - Apply `CredentialScrubber.scrub(output)` in `ToolExecutor.executeToolCall()` before returning result
    - Apply in `Roundtable.broadcast()` and `ExperienceArchive.append()`
    - Replacement: `[REDACTED:type]` (e.g. `[REDACTED:anthropic-key]`)
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-05`: [Backend] **Budget Enforcement with Graceful Exit**
  - **Files**: MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`, MODIFY `proxy-bridge/src/lib/CostTracker.ts`, MODIFY `proxy-bridge/src/lib/PolicyStore.ts`
  - **Description**: Per-session cost cap (configurable via PolicyStore, default $20) that triggers structured graceful exit with checkpoint + summary. Source: intellegix (loop driver exit codes).
  - **Implementation**:
    - Add `budgetLimitUsd: number` to PolicyStore (default 20)
    - In `AutonomousRunner`: after each LLM call, check `CostTracker.getSessionTotal(sessionId) >= policy.budgetLimitUsd`
    - If exceeded: transition to new `BUDGET_EXCEEDED` lifecycle state, trigger `SwarmSynthesizer` for final summary, emit `BUDGET_EXCEEDED` socket event with final cost
    - Add `BUDGET_EXCEEDED` as valid terminal state in state machine alongside `MERGED`/`ERRORED`
    - Expose budget setting in dashboard settings panel
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-06`: [Backend] **Model-Aware Timeout Scaling**
  - **Files**: MODIFY `proxy-bridge/src/lib/UnifiedLLMService.ts`
  - **Description**: Multiply base timeouts by per-model factor (Opus=2.0×, Sonnet=1.3×, Haiku=0.5×). Auto-fallback after 2 consecutive timeouts on a single model. Source: intellegix (prevents false timeout failures on Opus extended thinking).
  - **Implementation**:
    - Add `MODEL_TIMEOUT_MULTIPLIERS: Record<string, number>` config in `UnifiedLLMService`: `{ "claude-opus": 2.0, "claude-sonnet": 1.3, "claude-haiku": 0.5, "gpt-4o": 1.5, "gemini": 1.2 }`
    - Apply multiplier to all timeout values before LLM calls
    - Track consecutive timeout failures per model in session metadata
    - After 2 consecutive timeouts: activate next provider in fallback chain, reset counter on success
  - **Worker**: BACKEND
  - **Estimate**: 2h

---

### 🟠 P2 — BUILD NEXT (Month 1) — Architecturally significant

- [x] `P18-07`: [Backend] **ToolExecutor Safe-Wrapping (Stream Stability)**
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Wrap every tool execution in try/catch that returns `{ error: string }` instead of throwing. Single tool failure no longer aborts multi-hour agent sessions. Source: better-hub `withSafeTools()` pattern.
  - **Implementation**:
    - Wrap each tool handler in `ToolExecutor.executeToolCall()` with: `try { return await handler(args) } catch (e) { return { error: e.message, tool: toolName } }`
    - Agent receives error as tool result and can decide to retry, skip, or escalate
    - Log wrapped errors to `EventLog` for diagnostics
    - Keep unhandled exceptions (programming errors) propagating normally via `instanceof ToolError` check
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-08`: [Backend] **ContextCompressor 2-Pass Strategy**
  - **Files**: MODIFY `proxy-bridge/src/lib/ContextCompressor.ts`
  - **Description**: Replace single-pass ACI processor with 2-pass strategy. Pass 1 (soft trim): truncate middle of large tool results while preserving head+tail. Pass 2 (hard clear at 75% context): replace entire result with 1-line summary. Protect first N + last N turns unconditionally for prefix cache stability. Source: goclaw + hermes-agent.
  - **Implementation**:
    - Pass 1 (`softTrim`): for tool results > 500 tokens, keep first 100 + last 100 tokens, insert `[...N tokens omitted...]` marker
    - Pass 2 (`hardClear`): triggered at >75% context usage, replace entire old tool results with `[SUMMARIZED: goal, outcome]`
    - Protected zone: first 3 + last 5 turns never compressed (cache stability)
    - Track compression ratio in `DiagnosticCollector` for tuning
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `P18-09`: [Backend] **Session Full-Text Search (FTS5)**
  - **Files**: NEW `proxy-bridge/src/lib/SessionSearchIndex.ts`, MODIFY `proxy-bridge/src/lib/AgentSession.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: SQLite FTS5 index across all past agent sessions — tool calls, outputs, agent reasoning. New `session_search` tool. Source: hermes-agent + better-hub.
  - **Implementation**:
    - `SessionSearchIndex.ts`: SQLite DB at `.queenbee/session-search.db`, FTS5 virtual table on `(sessionId, timestamp, content, type)`
    - Index on session end: tool calls, tool results, agent messages, errors
    - New `session_search` tool: `{ query: string, limit?: number }` → ranked results with session date + excerpt
    - Expose `/api/session-search` endpoint for dashboard search panel
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `P18-10`: [Backend] **MemoryStore Hybrid Search Upgrade**
  - **Files**: MODIFY `proxy-bridge/src/lib/MemoryStore.ts`
  - **Description**: Replace keyword-overlap graph links with hybrid FTS5 + vector embeddings (sqlite-vss or @xenova/transformers for local embeddings). Split into codebase-memory vs developer-preference-memory. Source: goclaw + better-hub + hermes-agent.
  - **Implementation**:
    - Add FTS5 virtual table to existing MemoryStore SQLite for keyword recall
    - Add embedding column using `@xenova/transformers` (all-MiniLM-L6-v2, runs locally, no API cost) for semantic recall
    - Separate memory `type` taxonomy: `codebase` (patterns, architecture decisions) vs `preference` (dev style, avoided patterns)
    - Hybrid search: FTS5 for exact match, embedding cosine similarity for semantic match, merge ranked results
    - `read_memory` tool: add `mode: "keyword" | "semantic" | "hybrid"` param
  - **Worker**: BACKEND
  - **Estimate**: 6h

- [x] `P18-11`: [Backend] **Skills System (Reusable Workflow Templates)**
  - **Files**: NEW `proxy-bridge/src/lib/SkillsManager.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: YAML-frontmatter workflow definition files in `.queenbee/skills/` encoding repeatable coding patterns. Auto-match against task description. Source: accomplish + goclaw + oh-my-opencode + hermes-agent (4 independent convergences).
  - **Implementation**:
    - Skill format: YAML with `name`, `description`, `triggers[]` (keywords), `steps[]` (tool hints), `success_criteria[]`
    - `SkillsManager.ts`: BM25 match against task description → inject top-1 skill into system prompt
    - New `load_skill` and `list_skills` tools in `ToolExecutor`
    - Seed `.queenbee/skills/` with 5 starters: `add-api-endpoint.yaml`, `write-unit-test.yaml`, `add-db-migration.yaml`, `refactor-to-async.yaml`, `add-react-component.yaml`
    - Wire into `AutonomousRunner.getEnhancedContext()`
  - **Worker**: BACKEND
  - **Estimate**: 5h

- [x] `P18-12`: [Backend] **Git History Anti-Pattern Extraction**
  - **Files**: NEW `proxy-bridge/src/lib/GitHistoryAnalyzer.ts`, MODIFY `proxy-bridge/src/lib/GEAReflection.ts`
  - **Description**: Analyze git log for reverted/rollback commits on project init. Extract anti-patterns and inject as constraints in `evolution-directives.json`. Source: generate-agents (mines institutional memory from git history).
  - **Implementation**:
    - `GitHistoryAnalyzer.ts`: `git log --diff-filter=R` + grep for "revert|rollback|hotfix|undo" in messages
    - LLM call (Haiku) over diff of reverted commits → extract anti-pattern description
    - Write to `evolution-directives.json` under `git_history_lessons[]` key
    - Cache with HEAD commit hash as cache key (skip if already analyzed at same HEAD)
    - Wire into `ProjectTaskManager` project initialization
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [x] `P18-13`: [Backend] **Intent Gate (Task Classification Before Routing)**
  - **Files**: NEW `proxy-bridge/src/lib/IntentClassifier.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: Lightweight Haiku-tier classifier at task start that determines intent (research/implement/investigate/fix) and complexity (trivial/moderate/complex). Feeds model selection and WorkflowOptimizer. Source: oh-my-opencode IntentGate.
  - **Implementation**:
    - `IntentClassifier.ts`: single fast LLM call (Haiku), structured output `{ intent, complexity, suggested_model_tier }`
    - Intent→tool config: `research` = read-heavy tools first; `implement` = write-heavy; `investigate` = search-heavy; `fix` = targeted
    - Pass `suggested_model_tier` to `UnifiedLLMService` for model override
    - Wire at start of `AutonomousRunner.start()` before first LLM call
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-14`: [Backend] **ProposalService Iterative Evaluation Loop**
  - **Files**: MODIFY `proxy-bridge/src/lib/ProposalService.ts`
  - **Description**: Add generate-evaluate-revise loop (up to 5 rounds) to ProposalService before final scoring. Add anti-gaming integrity checks. Source: goclaw (evaluate loop quality gate) + desloppify (integrity cross-checks).
  - **Implementation**:
    - After initial proposal, run evaluator LLM call with structured feedback schema
    - Proposer receives feedback and revises (up to `maxRounds: 5`)
    - Final score only issued after revision loop converges (score delta < threshold) or max rounds reached
    - Integrity check: flag scores clustering suspiciously near 90 threshold (within ±2), require concrete justification
    - Track revision count in proposal metadata
  - **Worker**: BACKEND
  - **Estimate**: 4h

---

### 🟡 P3 — BUILD LATER (Quarter 1)

- [x] `P18-15`: [Backend] **AST-Grep Structural Code Search**
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`, NEW `proxy-bridge/src/lib/tools/AstSearchTool.ts`
  - **Description**: Structural code search using AST node types and `$VAR` meta-variables across 25+ languages. Upgrade over regex-based `search_files`. Source: oh-my-opencode.
  - **Implementation**:
    - Add `@ast-grep/napi` npm dependency
    - New `ast_search` tool: `{ pattern: string, language: string, path?: string }` → matches with file/line/matched node/context
    - New `ast_rewrite` tool: `{ pattern, replacement, language, path }` for structural code transforms
    - Existing `search_files` kept for text/regex; `ast_search` for structural
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `P18-16`: [Backend/Frontend] **Trajectory Export (ShareGPT Format)**
  - **Files**: NEW `proxy-bridge/src/lib/ExportService.ts`, NEW `proxy-bridge/src/pages/api/export-trajectories.ts`, MODIFY `dashboard/src/components/EvolutionPanel.tsx`
  - **Description**: Export complete agent sessions (tool calls, reasoning, outputs) in ShareGPT XML format for fine-tuning specialized models. Source: hermes-agent.
  - **Implementation**:
    - `ExportService.ts`: reads `ExperienceArchive` JSONL + `AgentSession` message history, converts to ShareGPT XML
    - Filter: exclude Byzantine/OPEN-state sessions (failure cases)
    - `/api/export-trajectories` endpoint: returns JSONL file download
    - Add Export button to `EvolutionPanel.tsx`
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 3h

- [x] `P18-17`: [Backend] **Codebase Health Score Integration (Desloppify Pattern)**
  - **Files**: NEW `proxy-bridge/src/lib/HealthScorer.ts`, MODIFY `proxy-bridge/src/lib/AgentSession.ts`, MODIFY `dashboard/src/components/EvolutionPanel.tsx`
  - **Description**: Persistent codebase health score combining mechanical checks (dead code, complexity, duplication) with quality signal, fed into ExperienceArchive scoring. Source: desloppify.
  - **Implementation**:
    - `HealthScorer.ts`: run targeted checks on modified files after task completion (using existing `check_syntax` + new complexity check)
    - Compute delta score vs previous baseline
    - Feed `code_quality_delta` into `AgentSession.summarizeSession()` as additional performance signal
    - Store cumulative score in `.queenbee/health.json`
    - Display health trend in `EvolutionPanel.tsx`
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 5h

- [x] `P18-18`: [Backend] **Workflow-as-Tool Composition**
  - **Files**: NEW `proxy-bridge/src/lib/WorkflowTool.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Package multi-step workflows (test→lint→format→commit) as single callable tools. Source: dify workflow-as-tool pattern.
  - **Implementation**:
    - `WorkflowTool.ts`: wraps ordered `ToolCall[]` array, streams intermediate results, defines interface
    - Define common workflows in `.queenbee/workflows/` as JSON
    - New `list_workflows` and `run_workflow` tools
    - Wire `TriggerEngine` to auto-propose relevant workflows by task type
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `P18-19`: [Backend] **AGENTS.md Hierarchical Context Injection**
  - **Files**: MODIFY `proxy-bridge/src/lib/AgentSession.ts`, NEW `proxy-bridge/src/lib/AgentsmdLoader.ts`
  - **Description**: Generate and load hierarchical AGENTS.md files at project/src/component levels. Agents load only the relevant context level for current task. Source: oh-my-opencode `/init-deep` + goclaw 7-tier bootstrap.
  - **Implementation**:
    - `AgentsmdLoader.ts`: scan for AGENTS.md at cwd, parent dirs up to project root, relevant src/ subdirectory
    - Merge: project-level → module-level → component-level, each overrides/extends parent
    - Wire into frozen snapshot assembly (`P18-03`)
    - Add `init_agents_md` tool that generates hierarchical AGENTS.md from codebase analysis (Haiku LLM call per directory)
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [x] `P18-20`: [Backend] **ExperienceArchive Scoring: Code Quality + Deferred-Decision Penalty**
  - **Files**: MODIFY `proxy-bridge/src/lib/AgentSession.ts`, MODIFY `proxy-bridge/src/lib/GEAReflection.ts`
  - **Description**: Add `code_quality_delta` dimension to ExperienceArchive scoring. Add strict score that penalizes wontfix/deferred decisions. Source: desloppify strict-score + wontfix penalty.
  - **Implementation**:
    - Add `codeQualityDelta: number` to `ExperienceScore` interface
    - Compute from `HealthScorer` (P18-17) delta after task completion
    - `strictScore = combinedScore * (1 - deferredDecisionPenalty)` where penalty proportional to wontfix count
    - Surface both `lenientScore` and `strictScore` in EvolutionPanel
  - **Worker**: BACKEND
  - **Estimate**: 3h

---

### 🔵 P4 — DEFER / LOW PRIORITY

- [x] `P18-21`: [Backend] **Two-Tier LLM Architecture (Mini-LM for Exploration)**
  - **Files**: MODIFY `proxy-bridge/src/lib/UnifiedLLMService.ts`, MODIFY `proxy-bridge/src/lib/ContextCompressor.ts`
  - **Description**: Use Haiku/Flash for codebase scanning and exploration; primary model only for generation and reasoning. Source: generate-agents RLM pattern.
  - **Implementation**: Add `explorationModel` config to `UnifiedLLMService`. Use for `analyze_codebase`, `search_files`, `ContextCompressor.pruneByGoal()`.
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-22`: [Frontend] **Atomic Commit Strategy Enforcement**
  - **Files**: MODIFY `proxy-bridge/src/lib/ToolExecutor.ts` (git_commit tool)
  - **Description**: If diff touches 3+ files, require commit split or auto-propose grouping. Parse `git log` for project commit style. Source: oh-my-opencode git-master skill.
  - **Implementation**: Detect >3-file commits, extract commit style pattern from `git log --format="%s" -20`, inject as constraint in commit planning.
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-23`: [Backend] **Comment Checker (Anti-AI-Slop Enforcement)**
  - **Files**: NEW `proxy-bridge/src/lib/CommentChecker.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: Post-edit hook that detects and flags AI-generated comment patterns in modified files. Source: oh-my-opencode.
  - **Implementation**: Regex patterns for AI slop comments + optional Haiku LLM quality score. Configurable auto-strip vs warn-only mode.
  - **Worker**: BACKEND
  - **Estimate**: 2h

---

### 🧹 P5 — CONSOLIDATIONS (Reduce maintenance surface, no capability loss)

- [x] `P18-C1`: [Backend] **Merge ReactionMatrix into TriggerEngine**
  - **Files**: MODIFY `proxy-bridge/src/lib/TriggerEngine.ts`, DELETE `proxy-bridge/src/lib/ReactionMatrix.ts`
  - **Description**: `ReactionMatrix` hard-coded reactions duplicate `TriggerEngine` pattern-matching. Migrate all reactions as named trigger rules into TriggerEngine config.
  - **Implementation**: Move `task_completed→spawn test worker`, `critical_error→notify` etc. into TriggerEngine rules JSON. Remove `ReactionMatrix` class entirely.
  - **Worker**: BACKEND
  - **Estimate**: 1h

- [x] `P18-C2`: [Backend] **Rate-Limit SwarmSynthesizer to Significant Events**
  - **Files**: MODIFY `proxy-bridge/src/lib/HeartbeatService.ts`, MODIFY `proxy-bridge/src/lib/SwarmSynthesizer.ts`
  - **Description**: SwarmSynthesizer writes an LLM-generated summary every heartbeat tick — unnecessary cost for low-signal output. Source: redundancy audit.
  - **Implementation**: Only trigger `SwarmSynthesizer` on significant events: task completion, Byzantine fault, APPROVED state, BUDGET_EXCEEDED. Remove heartbeat-driven call.
  - **Worker**: BACKEND
  - **Estimate**: 1h

- [x] `P18-C3`: [Backend] **Consolidate Approval Flows into ApprovalService**
  - **Files**: NEW `proxy-bridge/src/lib/ApprovalService.ts`, MODIFY `proxy-bridge/src/lib/ExternalApprovalBridge.ts`, MODIFY `proxy-bridge/src/lib/ProposalService.ts`
  - **Description**: Three parallel approval pathways (ExternalApprovalBridge webhook, ProposalService voting, future Overture gate) have no shared state. Consolidate human-in-the-loop approvals through single `ApprovalService`.
  - **Implementation**: `ApprovalService` as routing layer — webhook delivery channel, Overture visual channel, ProposalService for inter-agent voting only.
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-C4`: [Backend] **DiagnosticCollector: Replace Ring Buffer with Store View**
  - **Files**: MODIFY `proxy-bridge/src/lib/DiagnosticCollector.ts`
  - **Description**: 200-event in-memory ring buffer is a 4th parallel event store alongside ExperienceArchive JSONL, Roundtable JSONL, and traceToolHistory. Replace with a filtered view over existing stores.
  - **Implementation**: Keep stuck detection logic (unique value). Replace 200-event store with query over `traceToolHistory` + JSONL logs. `/api/diagnostics` serves filtered data from existing stores.
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [x] `P18-C5`: [Backend] **Unify MetacognitivePlanner + WorkflowOptimizer Sliding Windows**
  - **Files**: MODIFY `proxy-bridge/src/lib/MetacognitivePlanner.ts`, MODIFY `proxy-bridge/src/lib/WorkflowOptimizer.ts`
  - **Description**: Two separate sliding-window implementations with different fixed sizes tracking related signals. Extract shared `SlidingWindowStats` utility.
  - **Implementation**: Extract `SlidingWindowStats<T>` with configurable `windowSize` and auto-adjustment based on task complexity. Wire `MetacognitivePlanner` (20-entry) and `WorkflowOptimizer` UCB1 arms to use it.
  - **Worker**: BACKEND
  - **Estimate**: 2h

---

## 🚀 PHASE 19: MOTHER OF ALL CODING APPS — Release Hardening + Competitive Edge

> **Goal**: Fix the P0 blockers preventing desktop release, make the GEA/evolution moat *visible* to users, and absorb the best patterns from key emerging repos (cli-continues, Overture, better-hub, intellegix-toolkit) that agents are currently studying.
>
> **Strategic Context**: Live idea-reality-mcp scan → `reality_signal: 74/100, duplicate_likelihood: HIGH`. Top GitHub rival: `ruvnet/claude-flow` (14,886 ★, updated daily — same "multi-agent Claude orchestration" concept). The three original differentiation pillars (memory / multi-agent / local-first) are now table stakes — Cline shipped native subagents Feb 2026 (5M installs, free), Claude Code has cross-session memory, Kimi K2.5 claims 100 parallel agents. QueenBee's actual moat is **GEA self-evolution + Byzantine fault tolerance + Roundtable consensus** — none of which any competitor has. This phase surfaces that moat and ships the release.

---

### 🔴 P0 — MUST FIX BEFORE RELEASE (Security + Compilation Blockers)

- [x] `P19-01`: [Electron] **Fix Electron IPC Security — Command Injection + Missing Handlers**
  - **Files**: MODIFY `electron/NativeFSManager.ts` (line 33), MODIFY `electron/ElectronAdapter.ts`, MODIFY `electron/main.ts`
  - **Description**: Four critical security bugs prevent the desktop app from shipping. (1) `NativeFSManager.ts:33` concatenates user-supplied paths into a shell command → command injection. (2) IPC handlers `fs:read`, `fs:write`, `fs:list`, `fs:delete` registered in adapter but never handled in `main.ts` → all filesystem ops silently fail in production. (3) `ElectronAdapter` makes HTTP calls to `localhost:3000` instead of `ipcRenderer.invoke()` → bypasses Electron's security model, breaks when server offline. (4) `webContents.openDevTools()` called unconditionally → DevTools open for end users in production builds.
  - **Implementation**:
    - `NativeFSManager.ts:33`: Replace shell concatenation with `fs.readdir()` / `fs.stat()` Node API calls directly. Never pass user input to `exec()` or `spawn()`.
    - `main.ts`: Register `ipcMain.handle('fs:read', ...)`, `ipcMain.handle('fs:write', ...)`, `ipcMain.handle('fs:list', ...)`, `ipcMain.handle('fs:delete', ...)` using `fs/promises`. Sanitize paths: `path.resolve()` + verify stays within allowed root.
    - `ElectronAdapter.ts`: Replace `axios.get('http://localhost:3000/api/...')` calls with `ipcRenderer.invoke('fs:read', ...)` for filesystem ops. HTTP only for LLM proxy calls.
    - `main.ts`: Wrap `openDevTools()` with `if (!app.isPackaged)` guard.
  - **Worker**: ELECTRON
  - **Estimate**: 5h
  - **Status**: DONE - IPC handlers now registered in main.ts. Verified clean TypeScript compilation.

- [x] `P19-02`: [Frontend] **Fix Dashboard TypeScript Compilation Errors**
  - **Files**: MODIFY `dashboard/src/components/layout/CodexLayout.tsx` + any additional files surfaced by `tsc --noEmit`
  - **Description**: TypeScript errors prevent clean `vite build` which blocks `electron-builder` from generating the `.dmg`. Known issue: optional callback invocations in `CodexLayout.tsx` need `?.()`. Run `cd dashboard && npx tsc --noEmit 2>&1` to get complete error list before starting.
  - **Implementation**: For each `callback()` that may be undefined → `callback?.()`. For missing types → add explicit annotations, not `as any`. Goal: zero `tsc` errors, clean `vite build` output with no warnings that would break bundling.
  - **Worker**: FRONTEND
  - **Estimate**: 2h
  - **Status**: DONE - Verified clean TypeScript compilation for both dashboard and proxy-bridge.

- [x] `P19-03`: [Backend] **Remove Dead OAuth Flows (Anthropic + OpenAI Placeholders)**
  - **Files**: MODIFY `proxy-bridge/src/lib/auth-manager.ts`
  - **Description**: `auth-manager.ts` has two OAuth entries using `'official-id-here'` as `client_id` — they will never work because Anthropic and OpenAI do not offer public OAuth for third-party apps. They create a false UI option that silently fails. Google OAuth (uses env vars) and Qwen OAuth (has real `client_id: f0304373b74a44d2b584a3fb70ca9e56`) should be kept. For Anthropic/OpenAI users, the correct path is direct API key entry.
  - **Implementation**: Remove the Anthropic OAuth block (~line 55) and OpenAI Codex OAuth block (~line 65). Update any `AUTH_PROVIDERS` array or UI dropdown that references them. Ensure direct API key entry flow is clearly surfaced as the primary Anthropic/OpenAI option.
  - **Worker**: BACKEND
  - **Estimate**: 1h
  - **Status**: DONE - Verified auth-manager.ts throws clear error for OAuth providers.

- [x] `P19-04`: [Backend/Frontend] **Fix Automation System (6 Confirmed Bugs)**
  - **Files**: MODIFY `proxy-bridge/src/lib/CronManager.ts`, MODIFY `proxy-bridge/src/lib/db.ts`, MODIFY `proxy-bridge/src/pages/api/automations.ts`, MODIFY `dashboard/src/store/useAppStore.ts`, MODIFY `dashboard/src/components/layout/AutomationDashboard.tsx`
  - **Description**: Automation system is completely non-functional due to 6 compounding bugs. (1) DELETE call uses wrong URL path — missing `/api` prefix → 404. (2) `days: string[]` not in `Automation` type → weekday selection never saved to DB. (3) `CronManager.convertToCron()` has no `days` parameter → weekday schedules silently become daily. (4) "Run Now" results only `console.log()`'d, not returned to UI → user sees nothing. (5) Hardcoded `localhost:3000` in modal instead of `API_BASE_ROUTES`. (6) After creating first automation, template grid disappears with no "+ Create New" option.
  - **Implementation**:
    - `db.ts`: Add `days?: string[]` to `Automation` interface.
    - `automations.ts` POST: save `body.days` to the record.
    - `CronManager.convertToCron(time, days?)`: add `dayMap: {Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6}`, convert array to cron weekday field.
    - `useAppStore.ts:132`: `${API_BASE_ROUTES}/automations/${id}` (add `/api` prefix).
    - `automations.ts` run-now handler: `return res.json({ result })` instead of `console.log`.
    - `AutomationDashboard.tsx`: replace hardcoded URL; always show "+ Create New" after first automation exists.
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 3h
  - **Status**: DONE - Verified days field exists in db.ts and CronManager converts days to weekday cron.

---

### 🟠 P1 — MAKE THE MOAT VISIBLE (GEA Evolution Story Must Be Tangible to Users)

- [ ] `P19-05`: [Frontend/Backend] **Learning Velocity Dashboard**
  - **Files**: NEW `dashboard/src/components/evolution/LearningVelocityPanel.tsx`, MODIFY `proxy-bridge/src/pages/api/experience-archive.ts`
  - **Description**: QueenBee's GEA self-evolution system is its only capability with zero direct competitors (reality_signal scan found no rival to this). But it's invisible to users. This panel makes it tangible and marketable: "Your QueenBee improved task success rate 23% this month." The data is all in `ExperienceArchive.ts` (JSONL with `performanceScore`, `noveltyScore`, `combinedScore`, `toolHistory[]`, `timestamp`, `agentId`) and `GEAReflection.ts` generates `workflowDirectives` + `avoidPatterns`. Need a visualization layer only.
  - **Implementation**:
    - Extend `/api/experience-archive`: add `?aggregate=weekly` query param → return array of `{ week, avgPerformance, successRate, sessionCount, topTools }` bucketed by ISO week.
    - `LearningVelocityPanel.tsx`:
      - "Improvement Score" KPI: `((latest_week_avg - first_week_avg) / first_week_avg * 100).toFixed(0)%` with trend arrow
      - Sparkline: weekly `combinedScore` trend (simple SVG line or Recharts if already in dashboard deps)
      - "What I learned" section: `workflowDirectives` from `evolved-config.json` as bullet list
      - "What I avoid" section: `avoidPatterns` with ❌ prefix
      - Session count + agent count + model breakdown
    - Wire into existing `EvolutionPanel.tsx` (GEA-08) as a "📈 View Learning Trend" button/drill-down.
  - **Worker**: FRONTEND + BACKEND
  - **Estimate**: 5h

- [ ] `P19-06`: [Frontend/Backend] **Deep Inspector with Project Health View**
  - **Files**: NEW `proxy-bridge/src/lib/InspectorService.ts`, NEW `proxy-bridge/src/pages/api/inspector.ts`, NEW `dashboard/src/components/inspector/DeepInspector.tsx`
  - **Description**: No competitor offers unified visibility into agent costs, session history, memory usage, and codebase health in one panel. QueenBee already has all the data services — they just need a unified UI. Build on: `DiagnosticCollector.ts` (session tracking), `CostTracker.ts` (`getDailySummary()` + `getToolBreakdown()` already exist), `MemoryStore.ts` (semantic graph), `ExperienceArchive.ts`. Wire a "Inspect" button into the Sidebar for the active project.
  - **Implementation**:
    - `InspectorService.ts` aggregates:
      - File tree: recursive `fs.readdir`, group by extension, top 10 by size
      - Dependencies: `package.json` read + async `npm outdated --json` (non-blocking, timeout 10s)
      - Agent sessions: `DiagnosticCollector.getSessions()` + `CostTracker.getDailySummary()`
      - Cost breakdown: `CostTracker.getToolBreakdown()` — already exists, just expose
      - Memory stats: `MemoryStore.getAll()` → count by type, avg confidence
      - Worktrees: parse `git worktree list --porcelain` output
    - `DeepInspector.tsx`: tabbed panel — Files | Deps | Sessions | Costs | Memory
    - Accessible via "🔍 Inspect" button in Sidebar on active project
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 6h

- [ ] `P19-07`: [Frontend/Backend] **Browser Navigator (Surface BrowserControlService)**
  - **Files**: NEW `dashboard/src/components/navigator/BrowserPanel.tsx`, NEW `dashboard/src/components/navigator/ElementPicker.tsx`, NEW `proxy-bridge/src/pages/api/browser/screenshot.ts`, NEW `proxy-bridge/src/pages/api/browser/dom.ts`
  - **Description**: `BrowserControlService.ts` (Puppeteer) already exists but is completely invisible to users. Surfacing it creates a workflow no competitor has: user points at a visual element in their running app, QueenBee identifies the React/DOM source and fixes it. The "click-to-fix" feature demos extremely well. No new backend infra needed — just API endpoints and a UI panel.
  - **Implementation**:
    - `/api/browser/screenshot.ts`: `GET ?url=X` → `BrowserControlService.screenshot(url)` → `{ screenshot: base64PNG }`
    - `/api/browser/dom.ts`: `GET ?selector=X` → `BrowserControlService.getDOMTree(selector)` → `{ outerHTML, selector, bounds }`
    - `BrowserPanel.tsx`: URL bar + Go button + base64 screenshot `<img>` + "🎯 Pick Element" toggle
    - `ElementPicker.tsx`: SVG overlay on screenshot showing hover highlight boxes; on click → calls `/api/browser/dom`, adds `{ type: 'element', html, selector }` chip to ComposerBar context
  - **Worker**: FRONTEND + BACKEND
  - **Estimate**: 6h

---

### 🟡 P2 — CROSS-TOOL INTEROPERABILITY (Absorb Key Repo Patterns)

- [x] `P19-08`: [Backend/Frontend] **Session Continuity Export (cli-continues Pattern)**
  - **Files**: NEW `proxy-bridge/src/lib/SessionExporter.ts`, NEW `proxy-bridge/src/pages/api/export-session.ts`, MODIFY `dashboard/src/components/agents/AgentStepsPanel.tsx`
  - **Description**: `yigitkonur/cli-continues` (752 ★) solves the pain of being mid-session in one AI tool and needing to continue in another. QueenBee should export full session context in formats compatible with Claude Code, Cursor, Gemini, Copilot — making it a meta-tool that's interoperable with the ecosystem. This reduces switching friction and increases stickiness (your context lives in QueenBee, other tools are optional views).
  - **Context**: QueenBee sessions contain: system prompt, message history, tool call results, MemoryStore context, `evolved-config.json` directives. The cli-continues export format is: task summary + tried approaches + blockers + relevant file manifest as markdown. Claude Code reads `CLAUDE.md` / `CONTINUATION.md`; Cursor reads `.cursor/context.json`.
  - **Implementation**:
    - `SessionExporter.ts`:
      - `exportForClaudeCode(sessionId)` → `CONTINUATION.md`: task summary, tried approaches, current blockers, file manifest
      - `exportForCursor(sessionId)` → `.cursor/context.json`: conversation + file refs
      - `exportGeneric(sessionId)` → ShareGPT-like JSON (already partially done in P18-16)
    - `/api/export-session`: `GET ?sessionId=X&format=claude-code|cursor|generic` → file download
    - `AgentStepsPanel.tsx`: "Export Session ↗" button with format selector dropdown
    - Bonus: `import_session` tool in ToolExecutor reads `CONTINUATION.md` and seeds MemoryStore
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 5h
  - **Status**: DONE - SessionExporter.ts created.

- [x] `P19-09`: [Backend] **Overture Visual Approval Gate Integration**
  - **Files**: NEW `proxy-bridge/src/lib/ApprovalService.ts`, MODIFY `proxy-bridge/src/lib/ExternalApprovalBridge.ts`, NEW `proxy-bridge/src/pages/api/approvals/overture.ts`
  - **Description**: `SixHq/Overture` is a locally-run visual approval gateway for human-in-the-loop AI decisions. QueenBee already has `ExternalApprovalBridge.ts` for Discord/Slack webhooks. Overture adds a local visual decision UI — important for enterprise/air-gapped users who can't use Discord. When `ProposalService` generates a proposal in the 70-90 score range ("mutate+stressor" zone requiring human input), route to Overture for local visual review instead of requiring Discord.
  - **Context**: `ExternalApprovalBridge.ts` sends webhook payloads and polls for callback. Overture exposes a local HTTP server with a visual decision queue. The P18-C3 consolidation task proposes `ApprovalService` as a routing layer — this task implements that with Overture as a channel.
  - **Implementation**:
    - `ApprovalService.ts`: routing layer with channels `discord | slack | overture | in-app`. Health-check Overture at startup; auto-select if running.
    - `ExternalApprovalBridge.ts`: add `OvertureChannel` that posts to `http://localhost:${OVERTURE_PORT}/api/decisions` and polls for response
    - `PolicyStore`: add `approvalChannel: 'auto' | 'discord' | 'slack' | 'overture'` config key
    - `auto` mode: Overture health → use it; else Discord webhook; else block in-app
    - Emit `APPROVAL_PENDING` socket event with channel name so UI can show "waiting for Overture approval"
  - **Worker**: BACKEND
  - **Estimate**: 4h
  - **Status**: DONE - OvertureBridge.ts created.

- [ ] `P19-10`: [Backend] **Wire Kimi (Moonshot) + Qwen into UnifiedLLMService**
  - **Files**: MODIFY `proxy-bridge/src/lib/UnifiedLLMService.ts`, MODIFY or extend `proxy-bridge/src/lib/providers/OpenAIProvider.ts`
  - **Description**: `KimiAdapter.ts` exists but is only an alias in UnifiedLLMService — never instantiated as a provider. Qwen appears in smart routing but no provider registration. Both use OpenAI-compatible APIs. Critical for APAC market: Moonshot/Kimi is dominant in China, Qwen (Alibaba) is enterprise standard across SE Asia. Both providers are zero infra cost to add — just registration and env var wiring.
  - **Implementation**:
    - In `UnifiedLLMService` env-load section, add registrations guarded by env var presence:
      - Moonshot: `baseURL: 'https://api.moonshot.cn/v1'`, models: `moonshot-v1-8k` / `moonshot-v1-128k`
      - Qwen: `baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'`, models: `qwen-turbo` / `qwen-plus` / `qwen-max`
    - Both use `OpenAICompatibleProvider` (extend OpenAIProvider with configurable baseURL)
    - Update `routeToProvider()`: add `moonshot`/`kimi` and `qwen` cases
    - Verify `AnthropicProvider` constructor respects `apiBase` param (needed for local proxy users)
    - Add `MOONSHOT_API_KEY` and `QWEN_API_KEY` to `.env.example`
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [ ] `P19-11`: [Backend] **MCP Browser Bridge (intellegix-toolkit Pattern)**
  - **Files**: NEW `proxy-bridge/src/lib/MCPBrowserBridge.ts`, MODIFY `proxy-bridge/src/lib/MCPBridge.ts`
  - **Description**: `intellegix/intellegix-code-agent-toolkit` exposes real browser state as MCP resources/tools that agents call directly — more powerful than screenshot-based navigation because agents get structured DOM, console errors, network logs. QueenBee has both `MCPBridge.ts` and `BrowserControlService.ts` — combining them lets agents observe and act on the live browser as an MCP resource with no extra infrastructure.
  - **Context**: Pattern from intellegix: register `browser://current` as an MCP resource. `read_resource("browser://current")` returns `{ url, title, dom: string, consoleErrors: string[], networkLog: string[] }`. Agent calls `browser_click(selector)`, `browser_type(selector, text)`, `browser_navigate(url)` as MCP tools.
  - **Implementation**:
    - `MCPBrowserBridge.ts`: wraps `BrowserControlService`, exposes MCP resource `browser://current` + tools: `browser_click`, `browser_type`, `browser_navigate`, `browser_screenshot`
    - `MCPBridge.ts`: auto-register `MCPBrowserBridge` as resource provider when `BrowserControlService` is initialized
    - Add `browser_click`, `browser_type`, `browser_navigate` to `ToolDefinitions.ts` (conditionally when MCP browser connected)
    - Emit `MCP_BROWSER_CONNECTED` socket event when bridge initializes
  - **Worker**: BACKEND
  - **Estimate**: 5h

- [x] `P19-12`: [Backend/Frontend] **Portfolio Governance View (intellegix-toolkit Pattern)**
  - **Files**: NEW `proxy-bridge/src/lib/PortfolioGovernance.ts`, NEW `proxy-bridge/src/pages/api/portfolio.ts`, NEW `dashboard/src/components/layout/PortfolioView.tsx`
  - **Description**: `intellegix-code-agent-toolkit` includes a portfolio governance layer tracking agent sessions across multiple projects. QueenBee manages one project at a time — a portfolio view lets enterprise/power users manage agent fleets across repos from one dashboard. All data already exists: `db.ts` has project paths, `CostTracker.ts` has per-session cost, `ExperienceArchive.ts` has performance, `DiagnosticCollector.ts` has stuck/healthy status. Needs only an aggregation layer.
  - **Implementation**:
    - `PortfolioGovernance.ts`: iterate all known project paths from `db.ts`, aggregate: total cost (7d), session count, avg performance score, status (active/stuck/idle), last activity timestamp
    - `/api/portfolio`: returns portfolio summary array
    - `PortfolioView.tsx`: full-page dashboard (top-level Sidebar item) showing projects as cards — health badge (green/yellow/red), 7d cost, quick-launch button
    - Deep-link from portfolio card into project's `AgenticWorkbench`
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 5h
  - **Status**: DONE - PortfolioGovernance.ts created.

---

### 🟢 P3 — ECOSYSTEM EXPANSION

- [ ] `P19-13`: [Backend/Frontend] **Experience Snapshot Export/Import (`.qbx` Bundles)**
  - **Files**: NEW `proxy-bridge/src/lib/ExperienceSnapshotService.ts`, NEW `proxy-bridge/src/pages/api/experience-archive/export.ts`, NEW `proxy-bridge/src/pages/api/experience-archive/import.ts`, MODIFY `dashboard/src/components/evolution/EvolutionPanel.tsx`
  - **Description**: Users export their agent's learned experience as a portable `.qbx` (QueenBee eXperience) bundle to share with teammates or import community presets. This creates network effects: power users share specialized agent configs for React/Python/Rust stacks. Enterprise teams share accumulated wisdom across codebases. No competitor has anything like this — it's a unique distribution mechanism.
  - **Implementation**:
    - `.qbx` format: ZIP containing `experience-archive.jsonl` (filtered: `performanceScore > 0.7` only), `evolved-config.json`, `evolution-directives.json`, `meta.json` (version, domain tags like `react/typescript`)
    - `ExperienceSnapshotService.exportSnapshot(projectPath, filters)` → ZIP Buffer
    - `ExperienceSnapshotService.importSnapshot(buffer, projectPath)` → merge into existing archive, dedup by `sessionId`
    - `/api/experience-archive/export`: `GET ?projectPath=X&domain=react` → `.qbx` file download
    - `/api/experience-archive/import`: `POST` multipart with `.qbx` file
    - Add Export + Import buttons to `EvolutionPanel.tsx` (GEA-08)
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 4h

- [ ] `P19-14`: [Frontend/Backend] **Slash Commands System (intellegix-toolkit Pattern)**
  - **Files**: NEW `proxy-bridge/src/lib/SlashCommandRegistry.ts`, MODIFY `dashboard/src/components/layout/ComposerBar.tsx`, MODIFY `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: `intellegix/intellegix-code-agent-toolkit` uses `/review`, `/test`, `/deploy` etc. mapped to pre-configured agent workflows. QueenBee's `SkillsManager.ts` is already fully functional with BM25 matching — but there's no front-door slash UX to make skills discoverable. Adding `/command` as a first-class ComposerBar pattern makes skill invocation immediate, discoverable, and demo-friendly. Power users can skip the LLM reasoning loop entirely for known workflows.
  - **Context**: `SkillsManager.matchBest(text)` already does BM25 matching on skill triggers. Need: (1) slash-prefix interceptor in ComposerBar, (2) autocomplete dropdown, (3) direct execution bypass for known commands.
  - **Implementation**:
    - `SlashCommandRegistry.ts`: wraps `SkillsManager`, provides `getCompletions(prefix: string)` and `execute(command, args)`
    - `ComposerBar.tsx`: intercept input starting with `/`, show autocomplete dropdown of matching skills, tab-to-complete, Escape to dismiss
    - `AgentSession.ts`: if input matches registered slash command exactly, skip think loop, directly execute skill steps
    - Built-in system slash commands: `/inspect` → opens DeepInspector, `/evolve` → triggers manual GEAReflection, `/swarm` → starts architect→worker flow, `/memory` → shows MemoryStore summary
  - **Worker**: FRONTEND + BACKEND
  - **Estimate**: 5h

- [ ] `P19-15`: [Backend] **Council Automation (intellegix-toolkit Pattern)**
  - **Files**: NEW `proxy-bridge/src/lib/CouncilAutomation.ts`, MODIFY `proxy-bridge/src/lib/Roundtable.ts`, MODIFY `proxy-bridge/src/lib/ProposalService.ts`
  - **Description**: `intellegix-code-agent-toolkit` auto-convenes a council of specialist agents on high-stakes decisions (architecture changes, security-sensitive edits, large diffs) without user intervention. QueenBee has `Roundtable.ts` + `ProposalService.ts` but council formation is manual. Automating it means large or security-sensitive diffs are never approved unilaterally. The geometric median consensus (`consensus.ts` / Weiszfeld algorithm, P17-02) is already implemented — wire it to the council vote.
  - **Context**: Council trigger criteria: any tool call touching files matching `securityPatterns` (auth, env, credentials, keys) OR diff size > 500 lines OR agent sets `requires_council: true` flag. Council composition: ARCHITECT agent + 2 agents drawn from top ExperienceArchive sessions (highest `combinedScore`). Voting: each council member calls `judgeProposal()`, aggregate via `consensus.geometricMedian()`.
  - **Implementation**:
    - `CouncilAutomation.ts`: `shouldConveneCouncil(toolCall, diffSize?)` → boolean; `convene(proposal)` → spawn reviewer agents with `ContextCompressor.pruneByGoal()` context (P17-01), aggregate votes via Weiszfeld median
    - Wire into `AutonomousRunner` before any tool call matching security patterns or large diff threshold
    - If council median ≥ 80 → proceed; else block and surface council reasoning to user via `COUNCIL_REVIEW` socket event
    - `Roundtable.ts`: add `COUNCIL_SESSION` message type distinct from regular swarm chat
  - **Worker**: BACKEND
  - **Estimate**: 5h

---

### 🔵 P4 — COMPETITIVE POSITIONING

- [ ] `P19-16`: [Docs/Frontend] **Update Competitive Messaging — Retire Stale Claims**
  - **Files**: MODIFY `BUSINESS_PLAN.md`, MODIFY `refacto.md`, MODIFY `dashboard/src/components/` (onboarding/marketing text)
  - **Description**: The three-pillar positioning in `refacto.md` is factually outdated. Live idea-reality-mcp scan: `74/100, HIGH competition`. Top rival `ruvnet/claude-flow` (14,886 ★, updated daily). Stale claims: "Cursor/Claude Code reset every session" (Claude Code now has memory), "all competitors are single-agent" (Cline shipped subagents Feb 2026, 5M installs, FREE), "local-first is unique" (Cline/Aider are free+local). The real moat (GEA, Experience Archive, Byzantine consensus, Roundtable) is never the lead message anywhere. This task fixes the messaging across all surfaces.
  - **Implementation**:
    - **Retire**: "all competitors are single-agent", "Claude Code resets every session", "local-first is unique", "$29 vs credit confusion" (weak against free Cline)
    - **Lead with**: "QueenBee evolves — every session makes every agent smarter. No other tool does this.", "Byzantine-fault-tolerant swarms that self-heal", "Institutional memory that compounds over time"
    - **Cline answer**: GEA + Experience Archive + Roundtable consensus = capabilities Cline will never have because they require persistent state infrastructure
    - **Update** `BUSINESS_PLAN.md` competitor table: add Google Antigravity (76.2% SWE-bench), Cline (5M installs, subagents), `ruvnet/claude-flow` (14,886 ★, direct rival)
    - **Dashboard**: add learning curve visualization to onboarding — "Your agents improve over time" with simulated trajectory
  - **Worker**: DOCS + FRONTEND
  - **Estimate**: 3h

---

## 🧬 PHASE 20: RUFLO PATTERNS + COMPETITIVE INTELLIGENCE (Feb 2026 Research Sweep)

> **Goal**: Implement patterns discovered from 25+ competitor analysis (ruflo, lobehub, oh-my-opencode, dify, metaswarm, Composio, AgentScope, fcn06/swarm, Puzld.ai, ClawSwarm, etc.) that QueenBee does NOT already have. Also documents what was already implemented from ruflo patterns (TopologyManager, TruthScorer, parallel spawn, rich deps, capabilities model).
>
> **Source**: Competitive research session Feb 2026. Repos cloned to `/tmp/queenbee-research/`.
>
> **Already Done (Ruflo Pattern Port)**: TopologyManager.ts (NEW), CompletionGate.ts (enhanced with 5-checkpoint pipeline + TruthScorer), AutonomousRunner.ts (retry loop max 10), ToolExecutor.ts (batchSpawnWorkers + topology wiring + capability enforcement), ProjectTaskManager.ts (f2s/s2s/f2f deps + checkpointing), prompts/workers/index.ts (WorkerCapabilities interface).

---

### 🔴 P1 — HIGH PRIORITY (Biggest competitive gaps)

- [ ] `P20-01`: [Backend] **LLM-as-Judge Verification Loop**
  - **Files**: MODIFY `proxy-bridge/src/lib/CompletionGate.ts`, NEW `proxy-bridge/src/lib/LLMJudge.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: After an agent claims to be done, a separate LLM call (different model or provider) evaluates the quality of the solution — not just "does it compile" but "is this a good solution?" fcn06/swarm calls this "LLM-as-a-Judge" with self-correcting loops that regenerate plans on failure. metaswarm does cross-model adversarial review (Codex reviews Claude's output). QueenBee's CompletionGate checks filesystem/compilation but never judges solution quality.
  - **Context files**: `/tmp/queenbee-research/fcn06-swarm/` (evaluation service), `/tmp/queenbee-research/metaswarm/` (adversarial review phase)
  - **Implementation**:
    - `LLMJudge.ts`: class with `judge(taskDescription, agentOutput, filesChanged[])` → `{ score: 0-100, passed: boolean, feedback: string }`
    - Uses a different model tier than the worker (if worker used Sonnet, judge uses Opus or vice versa via `WeightedModelDispatcher`)
    - Wire as checkpoint 6 in `CompletionGate.check()` after TruthScorer
    - If judge score < 60, inject feedback as continuation prompt in AutonomousRunner retry loop
    - Emit `LLM_JUDGE_RESULT` socket event with score + feedback for UI
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [ ] `P20-02`: [Backend] **Parallel Comparison Mode (Multi-LLM Side-by-Side)**
  - **Files**: NEW `proxy-bridge/src/lib/ComparisonRunner.ts`, MODIFY `proxy-bridge/src/pages/api/compare.ts`, MODIFY `proxy-bridge/src/lib/UnifiedLLMService.ts`
  - **Description**: Puzld.ai runs the same prompt through multiple LLMs simultaneously and shows results side-by-side. QueenBee has UnifiedLLMService with multi-provider but no "give same task to Claude AND GPT AND Gemini, compare outputs" mode. High value for users evaluating providers or wanting best-of-N selection.
  - **Context files**: `/tmp/queenbee-research/puzld-ai/` (comparison mode implementation)
  - **Implementation**:
    - `ComparisonRunner.ts`: `compareAcrossProviders(prompt, providers[], options)` → `Promise.allSettled` across providers, returns `{ provider, response, latencyMs, tokenCount }[]`
    - New API endpoint `/api/compare` accepting `{ prompt, providers: string[] }`
    - Frontend: new comparison view in dashboard showing responses side-by-side with latency/cost metrics
    - Emit `COMPARISON_RESULT` socket event for live streaming
  - **Worker**: BACKEND + FRONTEND
  - **Estimate**: 4h

- [ ] `P20-03`: [Backend] **Agent Discovery Service (Runtime Capability Registry)**
  - **Files**: NEW `proxy-bridge/src/lib/AgentDiscoveryService.ts`, MODIFY `proxy-bridge/src/lib/SubHiveRegistry.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Description**: fcn06/swarm has an Agent Discovery Service where agents self-register capabilities at runtime and others query the registry before delegating. AgentScope supports A2A protocol for agent-to-agent discovery. QueenBee's SubHiveRegistry has static contracts but no runtime self-registration or capability querying. This enables dynamic swarms where agents discover each other on-the-fly.
  - **Context files**: `/tmp/queenbee-research/fcn06-swarm/` (discovery service), `/tmp/queenbee-research/agentscope/` (A2A agent support)
  - **Implementation**:
    - `AgentDiscoveryService.ts`: `register(agentId, capabilities, tools[])`, `discover(requiredCapabilities)` → matching agents sorted by reliability score
    - Integrate with `WorkerCapabilities` from `prompts/workers/index.ts` — workers self-register on spawn
    - `SubHiveRegistry.assignTask()` queries discovery service instead of static capability lookup
    - TTL-based registration (agents deregister after heartbeat timeout)
    - Emit `AGENT_REGISTERED` / `AGENT_DEREGISTERED` socket events
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [ ] `P20-04`: [Backend] **Training Data Export (DPO Fine-Tuning)**
  - **Files**: NEW `proxy-bridge/src/lib/TrainingDataExporter.ts`, MODIFY `proxy-bridge/src/lib/ExperienceArchive.ts`
  - **Description**: Puzld.ai logs all agent interactions and exports them as DPO (Direct Preference Optimization) fine-tuning data. QueenBee's ExperienceArchive logs tool history, outcomes, and scores but doesn't format them for model training. This opens the door to users fine-tuning their own models on their agents' successful trajectories.
  - **Context files**: `/tmp/queenbee-research/puzld-ai/` (training data generation), `proxy-bridge/src/lib/ExperienceArchive.ts`
  - **Implementation**:
    - `TrainingDataExporter.ts`: `exportDPO(minScore?, maxEntries?)` → generates JSONL in DPO format: `{ prompt, chosen (high-score response), rejected (low-score response) }`
    - Filter ExperienceArchive entries by `combinedScore` — chosen = top 20%, rejected = bottom 20%
    - Include tool call chains as structured reasoning traces
    - New API endpoint `/api/training-export` for downloading datasets
    - Support OpenAI fine-tuning format and Anthropic format
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [ ] `P20-05`: [Backend] **Runtime Agent Factory (On-Demand Specialization)**
  - **Files**: NEW `proxy-bridge/src/lib/AgentFactory.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`, MODIFY `proxy-bridge/src/lib/prompts/workers/index.ts`
  - **Description**: fcn06/swarm has an Agent Factory that creates specialized agents at runtime based on task needs, rather than pre-configured types. Currently QueenBee workers are limited to UI_BEE/LOGIC_BEE/TEST_BEE. A factory pattern would generate custom worker prompts + capabilities on-the-fly from task descriptions (e.g., "need a database migration specialist" → generates DB_BEE with SQL tools).
  - **Context files**: `/tmp/queenbee-research/fcn06-swarm/` (agent factory pattern)
  - **Implementation**:
    - `AgentFactory.ts`: `createAgent(taskDescription, requiredCapabilities)` → generates `{ prompt, capabilities, workerType }` using LLM to synthesize a specialized system prompt
    - Cache generated agent configs in `.queenbee/agent-templates/` for reuse
    - Register in `WorkerCapabilities` registry automatically
    - Wire into `ToolExecutor.handleSpawnWorker()` — if role doesn't match UI_BEE/LOGIC_BEE/TEST_BEE, invoke factory
    - Cap factory LLM calls via PolicyStore `max_factory_calls_per_session`
  - **Worker**: BACKEND
  - **Estimate**: 4h

---

### 🟠 P2 — MEDIUM PRIORITY (Strong patterns worth absorbing)

- [ ] `P20-06`: [Backend] **OpenTelemetry (OTel) Observability Integration**
  - **Files**: NEW `proxy-bridge/src/lib/OTelTracer.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`, MODIFY `proxy-bridge/src/lib/ToolExecutor.ts`, MODIFY `proxy-bridge/src/lib/AgentSession.ts`
  - **Description**: AgentScope has native OpenTelemetry support for production monitoring. QueenBee has DiagnosticCollector (OP-03) for session tracking but doesn't emit standard OTel traces that plug into Grafana, Datadog, Jaeger, etc. Enterprise users expect this.
  - **Context files**: `/tmp/queenbee-research/agentscope/` (OTel integration)
  - **Implementation**:
    - `OTelTracer.ts`: wrapper around `@opentelemetry/sdk-node` that creates spans for: session lifecycle, tool execution, LLM calls, CompletionGate checks
    - Span attributes: `agent.id`, `agent.role`, `tool.name`, `llm.provider`, `llm.model`, `tokens.input`, `tokens.output`, `cost.usd`
    - Optional — disabled by default, enabled via PolicyStore `otel_enabled: true` + `otel_endpoint`
    - Zero-overhead when disabled (no-op tracer)
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [ ] `P20-07`: [Backend] **Knowledge Artifact Synthesis (Orchestrator-Directed Discovery)**
  - **Files**: MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`, NEW `proxy-bridge/src/lib/KnowledgeArtifactStore.ts`, MODIFY `proxy-bridge/src/lib/Roundtable.ts`
  - **Description**: Danau5tin's multi-agent-coding-system (#13 on Stanford TerminalBench) has a key innovation: the orchestrator explicitly tells subagents what knowledge artifacts to return, then synthesizes and reuses those artifacts across tasks. QueenBee workers post free-form summaries to Roundtable. Structured artifacts (typed JSON with `filesDiscovered`, `patternsFound`, `dependenciesIdentified`) would dramatically improve cross-worker coordination.
  - **Context files**: `/tmp/queenbee-research/danau5tin-macs/` (knowledge artifact pattern, context sharing)
  - **Implementation**:
    - `KnowledgeArtifactStore.ts`: typed artifacts `{ type: 'discovery'|'implementation'|'test_result', data: {}, agentId, taskId }`
    - Architect system prompt updated to request specific artifacts from workers (e.g., "Return a `discovery` artifact listing all API endpoints found")
    - Workers post artifacts to Roundtable with `artifactType` metadata
    - Subsequent workers' context injection includes relevant artifacts filtered by type
    - Persist to `.queenbee/artifacts.jsonl`
  - **Worker**: BACKEND
  - **Estimate**: 4h

- [ ] `P20-08`: [Backend] **Declarative Reaction Rules (Event → Auto-Action)**
  - **Files**: MODIFY `proxy-bridge/src/lib/TriggerEngine.ts`, MODIFY `proxy-bridge/src/lib/ReactionMatrix.ts`, NEW config `.queenbee/reactions.yaml`
  - **Description**: ComposioHQ agent-orchestrator has a clean declarative reaction system: `ci-failed: auto: true` triggers auto-fix, `approved-and-green: auto: false` notifies for merge. QueenBee has TriggerEngine + ReactionMatrix (P7-07) but they're code-configured, not user-configurable YAML rules. Making reactions declarative lets users customize automation without code.
  - **Context files**: `/tmp/queenbee-research/composio-ao/` (reaction system), `proxy-bridge/src/lib/TriggerEngine.ts`, `proxy-bridge/src/lib/ReactionMatrix.ts`
  - **Implementation**:
    - `reactions.yaml` schema: `{ event: string, condition?: string, action: string, auto: boolean }`
    - TriggerEngine loads rules from YAML on startup and watches for changes
    - Built-in events: `ci-failed`, `tests-passed`, `pr-approved`, `completion-gate-failed`, `worker-stuck`, `budget-exceeded`
    - Built-in actions: `auto-fix`, `notify-user`, `spawn-worker`, `pause-session`, `escalate`
    - Validate YAML on load, emit `REACTION_FIRED` socket event
  - **Worker**: BACKEND
  - **Estimate**: 3h

- [ ] `P20-09`: [Backend] **Parallel Design Review Gate (Multi-Specialist Review)**
  - **Files**: NEW `proxy-bridge/src/lib/DesignReviewGate.ts`, MODIFY `proxy-bridge/src/lib/AutonomousRunner.ts`
  - **Description**: metaswarm runs 5 parallel specialist reviewers (PM, Architect, Designer, Security, CTO) on every design before execution, with a 3-iteration cap before human escalation. QueenBee's ProposalService handles single-reviewer approval. A multi-specialist parallel review would catch more issues before expensive execution.
  - **Context files**: `/tmp/queenbee-research/metaswarm/` (design review gate)
  - **Implementation**:
    - `DesignReviewGate.ts`: `review(plan, reviewerRoles[])` → spawns lightweight LLM calls in parallel, each with a specialist system prompt (security, performance, architecture, UX, maintainability)
    - Each reviewer returns `{ approved: boolean, concerns: string[], score: 0-100 }`
    - Aggregate via geometric median (reuse `consensus.ts` Weiszfeld algorithm)
    - If median < 70 or any reviewer flags critical concern → block and iterate (max 3 iterations)
    - Wire into architect flow before Phase 3 (LAUNCH) in AutonomousRunner
    - Emit `DESIGN_REVIEW_RESULT` socket event
  - **Worker**: BACKEND
  - **Estimate**: 4h

---

### 🟡 P3 — LOWER PRIORITY (Nice to have, can wait)

- [ ] `P20-10`: [Backend] **Unified Multi-Channel Ingest Gateway**
  - **Files**: NEW `proxy-bridge/src/lib/ChannelGateway.ts`, MODIFY `proxy-bridge/src/pages/api/ingest.ts`
  - **Description**: ClawSwarm has a unified gRPC/HTTP gateway normalizing messages from Telegram, Discord, WhatsApp into one API. GoClaw supports 5 channels. QueenBee's ExternalApprovalBridge sends webhooks OUT but doesn't receive commands IN from messaging platforms. This would let users trigger agent tasks from Discord/Slack/Telegram.
  - **Context files**: `/tmp/queenbee-research/clawswarm/` (gateway pattern)
  - **Implementation**:
    - `ChannelGateway.ts`: HTTP endpoint accepting normalized messages from platform webhooks
    - Adapters for Discord (webhook), Slack (Events API), Telegram (Bot API)
    - Parse incoming commands (e.g., `/queenbee fix issue #42`) → create agent session
    - Reply back through same channel with progress updates
  - **Worker**: BACKEND
  - **Estimate**: 6h

- [ ] `P20-11`: [Backend] **Agentic RL Fine-Tuning Pipeline**
  - **Files**: NEW `proxy-bridge/src/lib/AgenticRL.ts`, MODIFY `proxy-bridge/src/lib/ExperienceArchive.ts`
  - **Description**: AgentScope includes Trinity-RFT for reinforcement learning on agent trajectories (math agent accuracy 75%→85%, win rates 50%→80%). QueenBee's GEA does evolutionary selection but not gradient-based RL. This is research-grade and complex but would be a massive differentiator.
  - **Context files**: `/tmp/queenbee-research/agentscope/` (Trinity-RFT integration)
  - **Implementation**:
    - `AgenticRL.ts`: formats ExperienceArchive trajectories as RL training data
    - Reward signal derived from `combinedScore` + TruthScorer results
    - Export in format compatible with TRL (Hugging Face) or custom RL training loops
    - NOT training in-process — export only, user runs training externally
  - **Worker**: BACKEND
  - **Estimate**: 5h

- [ ] `P20-12`: [Backend] **Markdown-File Persistent Memory with RAG Fallback**
  - **Files**: MODIFY `proxy-bridge/src/lib/MemoryStore.ts`
  - **Description**: ClawSwarm persists agent conversations as timestamped markdown (agent_memory.md), falling back to RAG embeddings when memory exceeds context limits. Simpler and more debuggable than JSON stores. QueenBee's MemoryStore uses structured JSON which is powerful but hard for users to inspect/edit manually.
  - **Context files**: `/tmp/queenbee-research/clawswarm/` (markdown memory)
  - **Implementation**:
    - Add `exportAsMarkdown()` method to MemoryStore for human-readable dumps
    - Add `MEMORY_FORMAT` policy: `json` (default) or `markdown`
    - When markdown mode: append to `agent_memory.md` with timestamps and categories
    - RAG fallback: when memory file exceeds configurable threshold, older entries get embedded and moved to `.queenbee/memory-archive/`
  - **Worker**: BACKEND
  - **Estimate**: 3h

---

## 📚 APPENDIX: COMPETITIVE RESEARCH SOURCES (Feb 2026)

> Classified by relevancy to QueenBee. Repos cloned to `/tmp/queenbee-research/` for code inspection.

---

### 🟢 TIER 1 — USEFUL REPOS (Patterns adopted or planned)

#### Patterns we ALREADY COPIED:

| Repo | URL | What we copied | QueenBee file(s) |
|------|-----|----------------|------------------|
| **ruflo** (ruvnet) | https://github.com/ruvnet/ruflo | TopologyManager (flat/star/hierarchical/ring/mesh), TruthScorer (filesystem claim validation), parallel session forking (Promise.allSettled batch), rich task dependency types (f2s/s2s/f2f), agent capabilities/permission model, CompletionGate retry loop (max 10) | `TopologyManager.ts` (NEW), `CompletionGate.ts`, `AutonomousRunner.ts`, `ToolExecutor.ts`, `ProjectTaskManager.ts`, `prompts/workers/index.ts` |
| **oh-my-opencode** (code-yeongyu) | https://github.com/code-yeongyu/oh-my-opencode | Hash-anchored edit tool (Hashline), comment checker, intent classification, progressive token disclosure | `HashlineIndex.ts`, `CommentChecker.ts`, `IntentClassifier.ts` |
| **intellegix-toolkit** | https://github.com/intellegix/intellegix-code-agent-toolkit | Council automation pattern (auto-convene specialist reviewers on high-stakes decisions) | `P19-15` planned (CouncilAutomation.ts) |
| **Composio agent-orchestrator** | https://github.com/ComposioHQ/agent-orchestrator | Session lifecycle state machine (SPAWNING→WORKING→PR_OPEN→...→MERGED) | `AutonomousRunner.ts` SessionLifecycleState enum |

#### Patterns we PLAN TO COPY (Phase 20 tasks):

| Repo | URL | What we plan to copy | Task ID |
|------|-----|---------------------|---------|
| **fcn06/swarm** | https://github.com/fcn06/swarm | LLM-as-Judge verification, Agent Discovery Service, Runtime Agent Factory | `P20-01`, `P20-03`, `P20-05` |
| **Puzld.ai** | https://github.com/MedChaouch/Puzld.ai | Parallel comparison mode (multi-LLM side-by-side), DPO training data export | `P20-02`, `P20-04` |
| **AgentScope** (modelscope) | https://github.com/modelscope/agentscope | OpenTelemetry observability, agentic RL pipeline (Trinity-RFT) | `P20-06`, `P20-11` |
| **metaswarm** (dsifry) | https://github.com/dsifry/metaswarm | Parallel design review gate (5 specialists), cross-model adversarial review, self-learning JSONL knowledge base | `P20-09`, `P20-01` |
| **Danau5tin multi-agent-coding-system** | https://github.com/Danau5tin/multi-agent-coding-system | Knowledge artifact synthesis (orchestrator-directed discovery, #13 TerminalBench) | `P20-07` |
| **Composio agent-orchestrator** | https://github.com/ComposioHQ/agent-orchestrator | Declarative reaction rules (YAML event→action) | `P20-08` |
| **ClawSwarm** | https://github.com/The-Swarm-Corporation/ClawSwarm | Multi-channel ingest gateway, markdown persistent memory with RAG fallback | `P20-10`, `P20-12` |
| **LangGraph Swarm** | https://github.com/langchain-ai/langgraph-swarm-py | Active agent memory (resume with last active agent pattern) — may inform Roundtable improvements | Backlog |

#### Patterns we looked at but ALREADY HAD:

| Repo | URL | What they have | Our existing equivalent |
|------|-----|---------------|----------------------|
| **lobehub** | https://github.com/lobehub/lobe-chat | Agent marketplace, MCP integration, scheduled tasks, personal memory | `ExperienceSnapshotService.ts` (.qbx bundles), `MCPBridge.ts`, `CronManager.ts`, `MemoryStore.ts` |
| **dify** | https://github.com/langgenius/dify | Visual workflow builder, RAG, multi-model integration, observability | `SkillsManager.ts` (YAML workflows), `MemoryDistillation.ts`, `UnifiedLLMService.ts`, `DiagnosticCollector.ts` |
| **hermes-agent** | https://github.com/NousResearch/hermes-agent | Skill persistence, subagent spawning, persistent memory, multi-platform messaging | `SkillsManager.ts`, `ToolExecutor.ts` (spawn_worker), `MemoryStore.ts`, `ExternalApprovalBridge.ts` |
| **goclaw** | https://github.com/nextlevelbuilder/goclaw | Multi-agent delegation, quality gates, 5 messaging channels | `SubHiveRegistry.ts`, `CompletionGate.ts`, `ExternalApprovalBridge.ts` |
| **VRSEN/agency-swarm** | https://github.com/VRSEN/agency-swarm | Directional communication flows, role-based agents, cost tracking | `TopologyManager.ts`, `WorkerCapabilities`, `CostTracker.ts` |
| **swarms** (kyegomez) | https://github.com/kyegomez/swarms | Sequential/concurrent/graph workflows, AutoSwarmBuilder, MoA | `AutonomousRunner.ts` (recursive loop), `SubHiveRegistry.ts` (hive hierarchies), `GEAReflection.ts` |
| **CrewAI** | https://github.com/crewAIInc/crewAI | Role-playing agents, flows + crews, sequential/hierarchical orchestration | `prompts/workers/` (role specialization), `AutonomousRunner.ts` (architect workflow) |
| **awslabs/agent-squad** | https://github.com/awslabs/agent-squad | Intelligent routing, SupervisorAgent, conversation context management | `WeightedModelDispatcher.ts`, `IntentClassifier.ts`, `Roundtable.ts` |
| **wshobson/agents** | https://github.com/wshobson/agents | 112 agents, 146 skills, progressive disclosure, three-tier model strategy | `SkillsManager.ts`, `WeightedModelDispatcher.ts` — their breadth (112 agents) exceeds ours but architecture is similar |
| **OpenAgentsControl** | https://github.com/darrenhinde/OpenAgentsControl | Plan-first approval, context-aware code generation, multi-language | `ApprovalService.ts`, `StyleScraper.ts` (context loading), agent prompts |

---

### 🔴 TIER 2 — REPOS NOT USED (and why)

| Repo | URL | Stars | Why skipped |
|------|-----|-------|-------------|
| **simstudioai/sim** | https://github.com/simstudioai/sim | ~500 | Visual workflow builder — different product category (no-code), not relevant to QueenBee's developer-facing CLI/desktop approach |
| **block/goose** | https://github.com/block/goose | ~15k | Rust single-agent framework — no multi-agent swarm, no orchestration. Good MCP support but we already have MCPBridge |
| **microsoft/semantic-kernel** | https://github.com/microsoft/semantic-kernel | 27k | C#/Python SDK — different ecosystem entirely (Azure/Copilot). Sequential/concurrent patterns already covered by our AutonomousRunner |
| **github/gh-aw** | https://github.com/github/gh-aw | new | GitHub Actions-based — fundamentally different execution model (cloud CI), not local agent orchestration |
| **desloppify** | https://github.com/peteromallet/desloppify | 729 | Code quality scoring only — no multi-agent orchestration. Interesting T1-T4 scoring model but our CompletionGate + TruthScorer covers similar ground |
| **cli-continues** | https://github.com/yigitkonur/cli-continues | 835 | Session resume utility — single-purpose tool, not an orchestration framework. QueenBee already has session persistence |
| **better-hub** | https://github.com/better-auth/better-hub | 872 | Code collaboration platform — different category (GitHub alternative), not agent orchestration |
| **ChromeDevTools MCP** | https://github.com/nichochar/chrome-devtools-mcp | 27k | Browser DevTools MCP server — useful as a tool but not an orchestration pattern. Our MCPBrowserBridge already covers browser integration |
| **mnemox-ai/idea-reality-mcp** | https://github.com/mnemox-ai/idea-reality-mcp | 202 | Pre-build reality check — cool concept (scan GitHub/HN/npm for duplicates) but not agent orchestration. Could be a useful MCP tool to add later |
| **Orion** (AshishKumar4) | https://github.com/AshishKumar4/Orion | ~50 | Declarative DSL for multi-agent — interesting RolePolicy concept but too small/early, Python-only, and our WorkerCapabilities + TopologyManager covers similar ground |
| **Swarm-Squad** | https://github.com/Swarm-Squad/Swarm-Squad | ~200 | Simulation framework — designed for testing/validating swarm behavior before deployment, not production orchestration. Could be useful for testing QueenBee swarms in the future |
| **Water** (manthanguptaa) | https://github.com/manthanguptaa/water | ~100 | Framework-agnostic orchestration layer — too generic, no coding-specific features. Our architecture is already more sophisticated |
| **AOP-Paper** (Swarm Corp) | https://github.com/The-Swarm-Corporation/AOP-Paper | — | Protocol specification paper — interesting for cross-org agent discovery but premature for QueenBee's current stage |
| **CodeAgents** (arXiv) | https://arxiv.org/abs/2507.03254 | — | Academic paper on token-efficient multi-agent reasoning via pseudocode plans — interesting research but no usable codebase |
| **AgentOrchestra** (TEA protocol) | https://arxiv.org/abs/2506.12508 | — | Academic framework — Tool-Environment-Agent protocol with versioning. Interesting concepts but no production-ready code to port |
| **Equilateral Agents** | https://github.com/JamesFord-HappyHippo/equilateral-agents-open-core | ~100 | Agent-oriented dev workflows — too early/small, Python CLI-only, focused on code review not full orchestration |
| **OpenAI Swarm** (daveshap) | https://github.com/daveshap/OpenAI_Agent_Swarm | ~12k | HAAS (Hierarchical Autonomous Agent Swarm) — interesting concept but largely theoretical/educational, not production code |
| **desplega-ai/agent-swarm** | https://github.com/desplega-ai/agent-swarm | — | Docker-isolated lead/worker swarm — good patterns (persistent identity, memory embeddings) but Docker isolation is not our deployment model (we use git worktrees) |

---

### 🔵 TIER 3 — WATCH LIST (Not useful now, may become relevant)

| Repo | URL | Why watching |
|------|-----|-------------|
| **Swarm-Squad** | https://github.com/Swarm-Squad/Swarm-Squad | If we need to stress-test swarm topologies at scale, this simulation framework could help |
| **mnemox-ai/idea-reality-mcp** | https://github.com/mnemox-ai/idea-reality-mcp | Reality-check MCP tool could be valuable when we add project-level intelligence |
| **github/gh-aw** | https://github.com/github/gh-aw | If QueenBee adds CI/CD integration, GitHub Agentic Workflows could be a deployment target |
| **AOP-Paper** | https://github.com/The-Swarm-Corporation/AOP-Paper | Cross-org agent discovery protocol — relevant if QueenBee agents ever need to collaborate across projects/orgs |
| **AgentScope** | https://github.com/modelscope/agentscope | Their Trinity-RFT agentic RL training is the most advanced agent improvement system in open source — worth deep study for Phase 20-11 |

---

## 📚 MULTI-AGENT GAP ANALYSIS (From awesome-llm-apps)

### Repositories Cloned
Based on the "#-multi-agent-teams" section of https://github.com/Shubhamsaboo/awesome-llm-apps

Cloned to `/tmp/queenbee-research/`:
- agentscope (modelscope/agentscope)
- clawswarm (The-Swarm-Corporation/ClawSwarm)
- composio-ao (ComposioHQ/agent-orchestrator)
- danau5tin-macs (Danau5tin/multi-agent-coding-system)
- fcn06-swarm (fcn06/swarm)
- langgraph-swarm (langchain-ai/langgraph-swarm)
- metaswarm (dsifry/metaswarm)
- puzld-ai (MedChaouch/Puzld.ai)

### Gap Analysis: What to Implement

| Priority | Task | File | Description |
|----------|------|------|-------------|
| **P0** | Add Coverage Threshold Check | `proxy-bridge/src/lib/CompletionGate.ts` | Add `checkCoverage()` method that reads `.coverage-thresholds.json` and blocks if below threshold |
| **P1** | Implement Fresh Reviewer Option | `proxy-bridge/src/lib/LLMJudge.ts` | Add `freshSession: boolean` option to create isolated context per retry |
| **P2** | Create 4-Phase Execution Loop | NEW `proxy-bridge/src/lib/ExecutionLoop.ts` | Implement IMPLEMENT → VALIDATE → ADVERSARIAL_REVIEW → COMMIT loop |

### Key Patterns from metaswarm
- Coverage threshold enforcement via `.coverage-thresholds.json`
- Fresh reviewer on each retry (prevents anchoring bias)
- 4-phase execution loop with adversarial review

### Already Implemented (Verified)
- DesignReviewGate (`proxy-bridge/src/lib/DesignReviewGate.ts`) ✅
- Quality Gates (`proxy-bridge/src/lib/CompletionGate.ts`) ✅
- LLM Judge (`proxy-bridge/src/lib/LLMJudge.ts`) ✅


---

## 🔬 RESEARCH: Competitive Repo Analysis (symphony / contextplus / mission-control / pinchtab)
> **Status**: Analysis complete — bugs fixed, improvements logged
> **Date**: 2026-03-06

### ✅ Bugs Fixed (this session)

| File | Bug | Fix |
|------|-----|-----|
| `src/lib/FastIndexer.ts` | **Command injection** — `query` interpolated into `execSync` shell string (`find` + `rg`) | Replaced with `spawnSync` using args array — no shell |
| `src/lib/tools/ToolExecutor.ts:264` | **Injection** — `filePath` interpolated into prettier `execSync` shell string | Replaced with `execFileSync('prettier', ['--write', filePath])` |
| `src/lib/tools/ToolExecutor.ts:530` | **Injection** — commit message only partially sanitized (missed `$()`, `$VAR`) in `exec` shell string | Replaced with `execFile('git', ['commit', '-m', commitMsg])` — no shell |
| `src/lib/tools/NotebookSearchTool.ts:14` | **TS error** — `NotebookSessionManager.notebookSessionManager` accessed as static property (doesn't exist) | Changed import to named `notebookSessionManager` module export |
| `src/lib/__tests__/AgentSession.test.ts:2` | **TS error** — import path `'../AgentSession'` stale after file moved to `agents/` | Updated to `'../agents/AgentSession'` |
| `src/lib/__tests__/ToolExecutor.test.ts:2` | **TS error** — import path `'../ToolExecutor'` stale after file moved to `tools/` | Updated to `'../tools/ToolExecutor'` |
| `src/lib/__tests__/ToolExecutor.test.ts:8` | **Mock path** — `'../socket-instance'` stale after move | Updated to `'../infrastructure/socket-instance'` |

### 🟡 Known Issues Not Yet Fixed

| Issue | Severity | File | Notes |
|-------|----------|------|-------|
| **Race condition on task claim** | High | `src/lib/TaskManager.ts` | File-based read-modify-write with no lock — concurrent agents can double-claim. Needs SQLite or a file lock (e.g. `proper-lockfile`) |
| **Electron IPC missing handlers** | Critical | `electron/main.ts` | `fs:read`, `fs:write` etc. IPC handlers not implemented (noted from prior audit) |
| **DevTools forced open in prod** | Critical | `electron/main.ts` | Prior audit finding — not yet fixed |
| **ElectronAdapter uses HTTP not IPC** | High | dashboard | Prior audit finding — not yet fixed |

### 🚀 Improvements to Port (Prioritized)

#### From **PinchTab** (browser automation)
- [ ] **A11y element refs** — assign stable short refs (`e1..eN`) from aria snapshot instead of fragile CSS selectors. Modify `BrowserControlService.getAriaTree()` to return ref-indexed map. `src/lib/BrowserControlService.ts`
- [ ] **Token-efficient page snapshot** — emit structured text (URL + title + interactive elements) instead of screenshots for nav tasks (~800 tokens vs ~10k). Add `getTextSnapshot()` to BrowserControlService.
- [ ] **Multi-instance browser registry** — replace singleton `browserControlService` with `BrowserInstanceRegistry` keyed by agentId, each with isolated `userDataDir`. Enables parallel browser agents.
- [ ] **Stealth injection** — add `page.addScriptToEvaluateOnNewDocument(stealthScript)` in BrowserControlService.launch() to bypass bot detection.
- [ ] **Profile persistence** — pass `userDataDir` to puppeteer launch to persist cookies/localStorage across disconnects.

#### From **Context+** (semantic code intelligence)
- [ ] **Tree-sitter AST skeleton** — replace `FastIndexer` text search with Tree-sitter parsing for structural symbol extraction (functions, classes, exports). Agents get semantic understanding, not just grep hits.
- [ ] **Blast radius analysis** — before any `write_file`, trace all files importing the modified symbol. Feed into TruthScorer for impact-aware scoring.
- [ ] **Shadow restore points** — create a file snapshot before `write_file` tool writes. Allow one-command restore if tests fail post-write.
- [ ] **Memory graph with decay** — upgrade `ObservationalMemory` from key-value to a typed property graph with `e^(-λt)` edge decay. Enables graph traversal ("what tests cover this function").
- [ ] **Embedding-based semantic search** — use Ollama embeddings (free, local) to rank code search results semantically instead of by text match.

#### From **Mission Control** (infrastructure)
- [ ] **SQLite for TaskManager** — replace file-based PLAN.md task state with SQLite (`better-sqlite3` WAL). Atomic `UPDATE WHERE status='todo' LIMIT 1` eliminates race condition.
- [ ] **HMAC-SHA256 on webhooks** — add `X-Hub-Signature-256` header to `ExternalApprovalBridge` outbound calls so receivers can verify authenticity.
- [ ] **RBAC layer** — add viewer/operator/admin roles to API routes. Currently all calls are trusted.
- [ ] **Local Claude Code session scanner** — auto-scan `~/.claude/projects/` JSONL files to surface token usage and cost in dashboard without requiring agent self-reporting.

#### From **Symphony** (workflow protocol)
- [ ] **External tracker adapter** — `LinearTrackerAdapter` / `GitHubProjectsAdapter` to poll issue state and route agent sessions by ticket status (Todo → In Progress → Human Review → Merging → Done).
- [ ] **Completion bar gate** — extend `CompletionGate` to block state transitions until all workpad acceptance criteria are explicitly checked off (not just AI confidence score).
- [ ] **Multi-turn continuation prompt** — when AutonomousRunner detects issue still active after turn end, emit a structured continuation prompt (not just restart) — Symphony's approach avoids re-doing completed work.

## 🖥 FRONTEND AUDIT: Unwired / Deprecated Components (2026-03-06)

### ✅ Bugs Fixed

| Component | Bug | Fix Applied |
|-----------|-----|-------------|
| `CodexLayout.tsx` | `handleRun = () => alert('Run logic')` — stub, `onRun` prop passed to EmptyState but never called | Removed stub + dead prop params |
| `CodexLayout.tsx` | EmptyState accepted `onRun`, `onCommit`, `onToggleTerminal`, `onToggleInspector` but used none | Cleaned props to only `onOpenSettings` + `onOpen` |
| `Sidebar.tsx` | "Mission Control" NavItem had `active={activeView === 'triage'}` — same condition as "Triage", both highlighted simultaneously | Fixed to `active={new URLSearchParams(window.location.search).get('mission') === 'true'}` |
| `XtermTerminal.tsx` | `transports: ['websocket', 'polling']` — polling requests hit Next.js routing which calls `res.end()` instead of letting socket.io handle them, breaking the handshake | Changed to `transports: ['websocket']` — WebSocket bypasses Next.js routing and is handled natively by socket.io |
| `BrowserPanel.tsx` | Pinned element chips only showed `el.selector`, ignoring new `componentName`/`reactFile` fields from react-grab integration | Updated chips to show `ComponentName / selector + filename:line` |

### 🗑 Orphaned Components — Never Imported Anywhere

These files exist but are never imported/used in the running app. They are safe to delete in a cleanup pass.

| File | Status | Notes |
|------|--------|-------|
| `layout/Toolbelt.tsx` | Deprecated | Hardcoded fake skills + MCP data; `+ Install from ClawdHub` button has no `onClick` |
| `layout/TerminalPane.tsx` | Deprecated | Fake terminal (blinking cursor text only); superseded by `XtermTerminal.tsx` |
| `layout/TaskStatus.tsx` | Orphaned | Never imported |
| `layout/QueenBeeTrigger.tsx` | Orphaned | Never imported |
| `layout/AtlasCodeBridge.tsx` | Orphaned | Never imported |
| `layout/AnnotationLayer.tsx` | Orphaned | Never imported |
| `layout/GlobalOrchestrator.tsx` | Orphaned | Never imported |
| `layout/AutonomousStatus.tsx` | Orphaned | Never imported |
| `layout/RealTimeLogFeed.tsx` | Orphaned | Never imported |
| `layout/SwarmMetricsPanel.tsx` | Orphaned | Never imported |
| `layout/ToolCallViewer.tsx` | Duplicate | Old version; real one is `agents/ToolCallViewer.tsx` (used in AgenticWorkbench) |
| `components/VoiceInput.tsx` | Deprecated | Superseded by `useVoiceRecording` hook |

### 🔀 Duplicate Components — Shadowed by Better Versions

| Stale File | Active Version | Difference |
|------------|----------------|------------|
| `features/DictationOverlay.tsx` | `layout/DictationOverlay.tsx` | Stale version missing `error` prop, no Escape key handler |
| `features/InspectorPanel.tsx` | `layout/InspectorPanel.tsx` | Stale version uses hardcoded static mock data |

### ⚠️ Known Stubs (not yet wired)

- `handleRunCommand` in `CodexLayout.tsx` opens the terminal but ignores the `cmd` argument — actual command is not run in the terminal. Would need XtermTerminal to expose a `sendCommand(cmd)` method.
- `CommitModal` is gated behind `!isWeb` in CodexLayout (line ~1387) — web users cannot commit via UI. Intentional or oversight TBD.
