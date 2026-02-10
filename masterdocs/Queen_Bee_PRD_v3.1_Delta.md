# QUEEN BEE PRD v3.1 — DELTA UPDATE
## New Features from Architecture .md Files (Batch 2)

> **This document supplements PRD v3.0 Ground Truth.**
> **Rule**: PRD v3 decisions prevail on any conflict.

---

### 3.7 Autonomous Agent Protocol (Assumption-First)
**Source**: AUTONOMOUS_PROTOCOL.md

Agents in Queen Bee follow a **non-blocking execution protocol**:

1. **Identify Ambiguity**: Recognize a missing detail (e.g., "Where should I store this icon?")
2. **Make Assumption**: Choose the most architecturally consistent path
3. **Execute**: Complete the task, verify compilation
4. **Log Assumption**: Record all assumptions in a structured list

**Completion Criteria**: An agent only reports back when:
- Code is implemented AND compiles/tests pass
- Final report includes "🚀 Task Completed" + "🧠 Assumptions Made" list

**System Prompt Injection** (in AutonomousRunner.ts):
- "NEVER ask for permission mid-task"
- "Execute until verification is successful"
- "Output assumptions at the end"

**Reiteration**: If user rejects an assumption → new worktree iteration → repeat loop.

---

### 3.8 Browser Control / Live Eye
**Source**: BROWSER_CONTROL.md

A **Browser Relay** system for agents to interact with running web apps:

- **CDP Bridge**: Attach to Chrome tabs via Chrome DevTools Protocol
- **DOM Inspection**: Semantic snapshot (Aria-tree) instead of raw HTML
- **Visual Feedback**: Screenshot stream to Hive UI at ~2fps
- **Interaction**: Click, type, scroll via semantic selectors or coordinates
- **Auto-Fix Loop**: Browser console error → agent captures stack trace → auto-fix in new worktree

**Security**: Attach requires user permission. Sensitive data blurred in stream.
**Phase**: Phase 4 (P4-01)

---

### 3.9 Deep Inspector & Runtime Bridge
**Source**: DEEP_INSPECTOR.md

Bi-directional bridge injected into the app's runtime:

**Web Apps (React/Next.js)**:
- Inject `codex-inspector.js` via Vite plugin
- Communicates with React DevTools hook → maps UI elements to source file:line
- Agent sends `CLICK_COMPONENT(id)` events, not pixel coordinates

**Native Apps (visionOS/iOS)**:
- Uses existing `visionOS-MCP` for RealityKit Entity Tree
- Correlates Entity Tree with Accessibility labels for semantic 3D mapping

**Auto-Test Loop**:
1. Agent implements feature in worktree
2. Hive launches app in "Live Runtime" mode
3. DeepInspector verifies element exists via RuntimeBridge
4. Agent runs assertion script (e.g., "verify counter increments")
5. If assertion fails → auto-restart loop

**Phase**: Phase 4 (P4-02)

---

### 3.10 Inbox Triage System
**Source**: INBOX_TRIAGE.md

Filtered feed for autonomous background findings:

- **Sources**: GSD scans, security audits, performance tests, automation results
- **Triage Logic**: Errors/bottlenecks appear in Sidebar "Triage" section. Clean runs auto-archived.
- **Actionability**: Each finding has a "Fix this" button → drafts a Super-Prompt for Queen Bee
- **Storage**: `data/inbox.json`
- **API**: `GET /api/inbox/list`, `POST /api/inbox/action`
- **Component**: `InboxPanel.tsx`

**Phase**: Phase 3 (P3-08)

---

### 3.11 GitHub Sync & Auto-Triage
**Source**: GITHUB_SYNC.md

Automated repository discovery and issue-to-task conversion:

- **Repo Discovery**: Periodic `gh repo list` → categorize as LOCAL or REMOTE
- **One-Click Clone**: Select REMOTE project → `gh repo clone` → auto-init GSD_TASKS.md + MEMORY.md
- **Issue Auto-Triage**: New GitHub issue detected → Queen Bee drafts a GSD_TASK to fix it
- **WorkTree PRs**: Agents auto-open PR on GitHub once worktree merge is approved

**Phase**: Phase 3 (P3-09)

---

### 3.12 Multi-Forge Support
**Source**: MULTI_FORGE.md

GitHub + GitLab treated identically via `ForgeAdapter` interface:

| Forge | CLI | PR Term | Adapter |
|---|---|---|---|
| GitHub | `gh` | Pull Request | GitHubAdapter.ts |
| GitLab | `glab` | Merge Request | GitLabAdapter.ts (new) |

- GitLab: PAT + optional self-hosted URL
- CI/CD: Monitor GitLab pipelines in real-time
- UI: Sidebar "Remotes" grouped by forge (🐙 GitHub / 🦊 GitLab)

**Phase**: Phase 3 (P3-10)

---

### 3.13 Automation Scheduler
**Source**: AUTOMATION_SCHEDULER.md

Visual cron management for recurring agent tasks:

**Job Types**:
- `GSD_SCAN`: Periodic workspace analysis
- `SYNC_REPOS`: Background GitHub/GitLab fetch
- `DATA_GEN`: Continuous dataset generation
- `MAINTENANCE`: Cleanup temp worktrees + build artifacts

**UI**: `AutomationDashboard.tsx` — card-based grid with Play/Pause/Delete per job, history of last 10 runs.

**Queen's Pulse**: Queen Bee can suggest schedules ("I noticed you're generating data. Should I schedule this nightly?")

**Phase**: Phase 3 (P3-03)

---

### 3.14 Diff Viewer Spec
**Source**: DIFF_VIEWER.md

Enhanced split-pane diff visualization:

- **Split-Pane**: Left = original (red deletions), Right = modified (green additions)
- **Synchronized Scrolling**: Both panes scroll together
- **Syntax Highlighting**: Prism.js or Monaco Editor (Swift, JS/TS, Python, C++, Markdown)
- **Mini-Map**: Vertical gutter showing change locations for quick navigation
- **AI Summary**: Sticky note at top explaining WHY changes were made

**Phase**: Phase 1 (P1-03 enhancement)

---

### 3.15 Account Persistence
**Source**: ACCOUNT_PERSISTENCE.md

Hybrid local+server state sync:

- **Login** → fetch user state from server (`~/.codex/user_states/<userId>.json`)
- **Hydrate** → populate Zustand store
- **Push** → background sync on significant events (SPAWN_AGENT, MERGE_PR)
- **Visual**: "Synced to Cloud" indicator in sidebar

**Note**: This SUPPLEMENTS AD-10 (Local-First). Local remains the primary. Server sync is opt-in for multi-device continuity.

**Phase**: Phase 4 (P4-10)

---

### 3.16 [REVERTED] Apple Aesthetic — Cupertino Flux Design System
**Source**: APPLE_AESTHETIC.md + DESIGN.md

**STATUS: ROLLED BACK to Standard Light Theme per user request.**

The previous dark/glassy design system has been replaced with a clean, high-contrast light theme:
- **Palette**: White backgrounds, Zinc-900 text, Zinc-200 borders.
- **Sidebar**: `bg-zinc-50` with standard list items.
- **Selection**: `bg-white text-blue-600 shadow-sm`.
- **Typography**: `Inter` remains, but readable dark-on-light.

**Phase**: Phase 4 (P4-09) — REVERTED.

---

### 3.17 Critical Implementation Gaps (Post-Audit)

The following components are partially implemented and require immediate worker attention:

#### A. [COMPLETED] Frontend Whisper Integration (P1-04)
**Status**: Implemented and Verified. `DictationOverlay` is functional.

#### B. [COMPLETED] Automation Execution Engine (P3-03)
**Status**: UI Verified. `AutomationDashboard` is functional.

#### C. [COMPLETED] Deep Inspector UI (P4-02)
**Status**: Implemented and Verified. `InspectorPanel` slides in and shows tree.

#### D. [RESOLVED] UI Unresponsiveness / Bugs (Critical Fixes)
**Status**: All core buttons verified and functional.
1.  **Project Creation**: Verified working (Native Dialog).
2.  **Diff Viewer**: Verified working (Commit Modal).
3.  **Inbox/Triage**: Verified working (View loads, no crash).
4.  **Project Crash**: Fixed `Layers` import error. Verified stable.

---

### 3.18 Human-in-the-Loop Security (Shield Mode)
**Source**: BP-01 / Security Audit

Queen Bee implements a "Shield Mode" for sensitive shell operations:
- **Restricted Commands**: High-risk commands (e.g., `rm -rf`, `pip install`, `sudo`) are intercepted by the `ToolExecutor`.
- **Interactive Approval**: Instead of blocking, the agent pauses and broadcasts a `TOOL_CONFIRMATION_REQUEST`.
- **User Control**: A "Needs Approval" card appears in the UI showing the full command. Execution only resumes upon manual user approval.
- **Policy Management**: Users can edit the restricted command list via the **Security** tab in Settings.

---

### 3.19 Multi-modal Visual Reasoning
**Source**: P4-01 enhancement

Agents can now process and analyze visual information:
- **Image Support**: Users can attach images (PNG, JPG, SVG) via the composer.
- **Base64 Encoding**: Images are converted to base64 and delivered as `image_url` parts in multi-part messages.
- **Provider Integration**: `GeminiProvider` maps visual data to native `inlineData` for LLM analysis.
- **UI Preview**: Uploaded images appear as interactive chips in the composer and inline in the chat history.

---

### 3.20 Thread Abortion & Graceful Cleanup
**Source**: Devil's Audit / Reliability

A centralized session management system ensures instant deactivation of background activity:
- **SessionManager**: Tracks active `AbortController` instances for every thread.
- **Instant Kill**: Deleting a thread triggers an `AbortSignal` that propagates to the agent loop and shell executor.
- **Process Termination**: Active `exec` processes are killed immediately using the `signal` option.

---

### 3.21 UX Infrastructure Hardening
**Source**: Phase 5/6 Polish

Significant reliability improvements to the core workbench:
- **ID-Based Deduplication**: Transitioned from content-based to unique ID-based message tracking, eliminating double-displays during streaming.
- **Debounced Thread Persistence**: Thread state updates are batched and debounced to optimize network traffic and UI smoothness.
- **Streaming Resilience**: Added SSE heartbeats and retry logic to handle unstable connections.

---

### 3.22 Agent Nervous System (VoxYZ Coordination)
**Source**: VoxYZ Gap Implementation

A distributed coordination layer for the multi-agent swarm:
- **PolicyStore**: Centralized JSON configuration for runtime agent parameters (concurrency limits, timeouts, auto-approval flags).
- **EventLog**: Structured, append-only JSONL log capturing all system events (tool executions, task claims, session completions).
- **MemoryStore**: Replaced flat MEMORY.md with a structured Cortex. Supports typed memories (insights, patterns, lessons) with confidence scoring.
- **HeartbeatService**: Periodic system pulse that ensures swarm health. Implements **Stale Task Recovery**, automatically resetting tasks from crashed agents.
- **Swarm Scalability**: `spawn_worker` tool updated from UI stub to full process spawning in isolated Git worktrees.

---

### 3.23 Atomic Tool Resilience (Ghostwriter Pattern)
**Source**: Trinity Upgrade / Ghostwriter

Industrial-grade hardening of the shell execution layer:
- **Script-First Proxy**: The `ToolExecutor` automatically detects complex commands (newlines, heredocs, or >1000 characters).
- **Temporary Execution**: Instead of passing raw strings to the system shell, it generates, executes, and cleans up unique `.sh` script files.
- **Resilience**: Eliminates shell syntax errors, buffer overflows, and escaping issues for large payloads.

---

### 3.24 Structured Thought Protocol (Planning Constraint)
**Source**: Trinity Upgrade / Protocol

Enforcement of a "Look Before You Leap" agentic workflow:
- **Forced Planning**: Agents are required to output `<plan>` blocks before executing tools and `<plan_update>` blocks after failures.
- **Failure Persistence**: Tool errors are automatically recorded in the project's **Cortex** (MemoryStore) to ensure agents learn from mistakes in subsequent turns.
- **Circuit Breaker**: `AutonomousRunner` detects repeated failing tool signatures and injects a "Deep Think Reset" to prevent infinite loops.

---

### 3.25 Semantic Context Pruning (Lens Pattern)
**Source**: Trinity Upgrade / Lens

Intelligent management of the LLM context window:
- **Smart `read_file`**: Two-stage process. Files > 200 lines return a **Symbol Map** (regex-extracted classes/functions) instead of raw text.
- **Windowed Reading**: New `read_file_range` tool for targeted inspection of specific line ranges.
- **Context Pressure Sensor**: Real-time token estimation. Automatically prunes the oldest message history when context reaches 80% capacity (~80k tokens).

---

### 3.26 Social Swarm Coordination (Roundtable)
**Source**: Roundtable Spec

Shared communication channel for real-time agent-to-agent interaction:
- **Roundtable Channel**: A shared `team_chat.jsonl` where all swarm agents log status updates and coordination queries.
- **Tool-Based Chat**: Added `chat_with_team` tool, allowing agents to proactively guide each other.
- **Context Injection**: The last 10 messages from the Roundtable are automatically injected into the system prompt of every agent in the swarm.

---

### 3.27 Workbench & UI Refinements
**Source**: Phase 6 UX Polish

A series of targeted improvements to the Hive dashboard for parity with industry-standard workbench experiences:
- **Socket Resilience**: Implemented exponential backoff and automatic reconnection logic for the real-time event stream, ensuring the UI stays in sync even after network interruptions.
- **Expandable Remotes**: The Sidebar "Remotes" section now supports expanding GitHub and GitLab accounts to browse and clone repositories directly within the UI.
- **Advanced Composer UI**:
    - **Mode Selector**: Added toggle for "Code", "Chat", and "Plan" modes, each with specialized system prompt templates.
    - **Effort Selector**: Integrated a "Low/Medium/High" effort switch to control model reasoning depth and token expenditure.
- **Thread Intelligence**:
    - **Metadata Visualization**: Sidebar threads now display live `+X -Y` diff stats and relative timestamps (e.g., "2h ago").
    - **Auto-Naming**: Threads are automatically titled based on the intent of the first user message.
- **Welcome Experience**: Implemented a "Ready to Build?" welcome screen for new projects, featuring project-specific quick actions and model selection.
- **UI Bug Fixes**: Hardened modal interactions (click-outside-to-close) and fixed unresponsiveness in the automation day-of-week selector.

---

### 3.28 Advanced Git & Performance
**Source**: Phase 5/6 Hardening

- **Partial Staging (Line-Level)**: Implementation of a granular staging workflow. Users can now select specific lines or hunks to stage via `git apply --cached`, enabling clean commits for complex changes.
- **Parallel Tool Execution**: The `AgentSession` now utilizes `Promise.all` to execute independent tool calls in parallel, significantly reducing the latency of multi-file operations.
- **Recursive File Indexer**: Added a codebase-wide recursive indexer to power `@` file autocompletion, enabling agents and users to reference any file in the project instantly.