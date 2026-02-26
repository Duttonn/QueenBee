# Agent Orchestration Expert Knowledge

## Executive Summary

Agent Orchestrator (by Composio) is a sophisticated system for managing fleets of AI coding agents working in parallel on codebases. It provides **complete automation of the code review lifecycle** — agents work autonomously in isolated workspaces, create PRs, handle CI failures, address review comments, and only involve humans when judgment is needed.

---

## Architecture Overview

### Core Principle: "Push, Not Pull"

- Spawn agents and walk away
- Agents work autonomously
- System handles isolation, feedback routing, status tracking
- Human only involved for decisions requiring judgment

### The 8 Plugin Slots

Every abstraction is swappable via a plugin system:

| Slot | Interface | Default | Alternatives |
|------|-----------|---------|--------------|
| **Runtime** | `Runtime` | tmux | docker, k8s, process, ssh, e2b |
| **Agent** | `Agent` | claude-code | codex, aider, opencode, goose |
| **Workspace** | `Workspace` | worktree | clone, copy |
| **Tracker** | `Tracker` | github | linear, jira |
| **SCM** | `SCM` | github | gitlab (future) |
| **Notifier** | `Notifier` | desktop | slack, discord, webhook, email |
| **Terminal** | `Terminal` | iterm2 | web |
| **Lifecycle** | (core) | — | Non-pluggable |

### Directory Structure

```
~/.agent-orchestrator/
  {hash}-{projectId}/
    sessions/
      session-1      # Metadata files (key=value)
      session-2
    worktrees/
      session-1/     # Git worktrees
      session-2/
    archive/         # Completed sessions
    .origin          # Config path reference
```

**Hash-based namespacing**: Derived from config location path, prevents collisions between multiple orchestrator instances.

---

## Session Lifecycle

### Session States (State Machine)

```
spawning → working → pr_open → (ci_failed | review_pending | changes_requested | approved | mergeable) → merged
                                                              ↓
                                              needs_input | stuck | errored → killed
```

**Full State List:**
- `spawning` — Creating workspace/runtime/agent
- `working` — Agent actively processing
- `pr_open` — PR created, awaiting CI/reviews
- `ci_failed` — CI checks failed
- `review_pending` — Awaiting review
- `changes_requested` — Reviewer requested changes
- `approved` — Approved, not yet mergeable
- `mergeable` — Ready to merge
- `merged` — Successfully merged
- `needs_input` — Agent blocked waiting for human
- `stuck` — Agent inactive for too long
- `errored` — Agent hit an error
- `killed`, `done`, `terminated`, `cleanup`

### Activity States

Detected from agent introspection:
- `active` — Agent processing (thinking, writing)
- `ready` — Finished turn, waiting for input
- `idle` — Inactive for threshold duration (default: 5 min)
- `waiting_input` — Permission prompt or question
- `blocked` — Error encountered
- `exited` — Process no longer running

---

## Core Components

### 1. Session Manager (`session-manager.ts`)

Responsibilities:
- **Spawn**: Create workspace → create runtime → launch agent
- **List**: Enumerate all sessions with live runtime checks
- **Get**: Fetch single session with enrichment
- **Kill**: Destroy agent → runtime → workspace
- **Cleanup**: Remove sessions with merged PRs/closed issues
- **Send**: Forward messages to running agents
- **Restore**: Revive crashed sessions

**Spawn Flow:**
```
1. Validate project exists
2. Resolve plugins (runtime, agent, workspace, tracker, scm)
3. Validate issue (if tracker configured)
4. Reserve session ID (atomic, prevents collisions)
5. Determine branch name
6. Create workspace (worktree or clone)
7. Run post-create hooks (symlinks, installs)
8. Generate prompt with issue context
9. Get agent launch command + environment
10. Create runtime (tmux session)
11. Write metadata
12. Run post-launch setup
```

### 2. Lifecycle Manager (`lifecycle-manager.ts`)

Responsibilities:
- Polling loop (default: 30s interval)
- State transition detection
- Event emission on transitions
- Reaction execution
- Escalation to human

**Polling Cycle:**
```
1. List all sessions
2. Filter to active/changed sessions
3. For each session:
   a. Check runtime alive
   b. Detect agent activity
   c. Check PR state (if exists)
   d. Determine new status
   e. If transition: emit event, trigger reactions
4. Check all-complete condition
5. Prune stale state
```

### 3. Plugin Interfaces (`types.ts`)

#### Runtime Interface
```typescript
interface Runtime {
  name: string;
  create(config: RuntimeCreateConfig): Promise<RuntimeHandle>;
  destroy(handle: RuntimeHandle): Promise<void>;
  sendMessage(handle: RuntimeHandle, message: string): Promise<void>;
  getOutput(handle: RuntimeHandle, lines?: number): Promise<string>;
  isAlive(handle: RuntimeHandle): Promise<boolean>;
  getMetrics?(handle: RuntimeHandle): Promise<RuntimeMetrics>;
  getAttachInfo?(handle: RuntimeHandle): Promise<AttachInfo>;
}
```

#### Agent Interface
```typescript
interface Agent {
  name: string;
  processName: string;
  getLaunchCommand(config: AgentLaunchConfig): string;
  getEnvironment(config: AgentLaunchConfig): Record<string, string>;
  detectActivity(terminalOutput: string): ActivityState;
  getActivityState(session: Session, readyThresholdMs?: number): Promise<ActivityDetection | null>;
  isProcessRunning(handle: RuntimeHandle): Promise<boolean>;
  getSessionInfo(session: Session): Promise<AgentSessionInfo | null>;
  getRestoreCommand?(session: Session, project: ProjectConfig): Promise<string | null>;
  postLaunchSetup?(session: Session): Promise<void>;
  setupWorkspaceHooks?(workspacePath: string, config: WorkspaceHooksConfig): Promise<void>;
}
```

#### SCM Interface (Richest)
```typescript
interface SCM {
  name: string;
  // PR Lifecycle
  detectPR(session: Session, project: ProjectConfig): Promise<PRInfo | null>;
  getPRState(pr: PRInfo): Promise<PRState>;
  mergePR(pr: PRInfo, method?: MergeMethod): Promise<void>;
  closePR(pr: PRInfo): Promise<void>;
  // CI Tracking
  getCIChecks(pr: PRInfo): Promise<CICheck[]>;
  getCISummary(pr: PRInfo): Promise<CIStatus>;
  // Review Tracking
  getReviews(pr: PRInfo): Promise<Review[]>;
  getReviewDecision(pr: PRInfo): Promise<ReviewDecision>;
  getPendingComments(pr: PRInfo): Promise<ReviewComment[]>;
  getAutomatedComments(pr: PRInfo): Promise<AutomatedComment[]>;
  // Merge Readiness
  getMergeability(pr: PRInfo): Promise<MergeReadiness>;
}
```

---

## Reactions System

Reactions are **automatic responses to events** — the core automation engine.

### Configuration

```yaml
reactions:
  ci-failed:
    auto: true              # Enable auto-handling
    action: send-to-agent   # Forward logs to agent
    retries: 2              # Retry count
    escalateAfter: 2        # Notify human after N failures

  changes-requested:
    auto: true
    action: send-to-agent
    escalateAfter: 30m      # Time-based escalation

  approved-and-green:
    auto: true
    action: auto-merge

  agent-stuck:
    threshold: 10m          # Duration threshold
    action: notify
    priority: urgent
```

### Reaction Actions

| Action | Behavior |
|--------|----------|
| `send-to-agent` | Forward event details to agent to handle |
| `notify` | Send notification to human |
| `auto-merge` | Merge PR automatically |

### Escalation

- **Retries**: After N attempts, escalate
- **Time-based**: After duration threshold, escalate
- Escalation triggers human notification with `urgent` priority

---

## Event System

### Event Types

**Session lifecycle:**
- `session.spawned`, `session.working`, `session.exited`, `session.killed`, `session.stuck`, `session.needs_input`, `session.errored`

**PR lifecycle:**
- `pr.created`, `pr.updated`, `pr.merged`, `pr.closed`

**CI:**
- `ci.passing`, `ci.failing`, `ci.fix_sent`, `ci.fix_failed`

**Reviews:**
- `review.pending`, `review.approved`, `review.changes_requested`, `review.comments_sent`, `review.comments_unresolved`
- `automated_review.found`, `automated_review.fix_sent`

**Merge:**
- `merge.ready`, `merge.conflicts`, `merge.completed`

**System:**
- `reaction.triggered`, `reaction.escalated`, `summary.all_complete`

### Priority Levels

- `urgent` — Agent stuck, needs input, errored
- `action` — PR ready to merge, review approved
- `warning` — CI failing, changes requested, conflicts
- `info` — Summary, all complete

### Notification Routing

```yaml
notificationRouting:
  urgent: [desktop, slack]
  action: [desktop, slack]
  warning: [slack]
  info: [slack]
```

---

## Metadata System

### Flat File Format (key=value)

```
project=integrator
issue=INT-100
branch=feat/INT-100
status=working
tmuxName=a3b4c5d6e7f8-int-1
worktree=/Users/.../.agent-orchestrator/.../worktrees/int-1
createdAt=2026-02-17T10:30:00Z
pr=https://github.com/.../pull/123
```

### Auto-Update Hooks

The Claude Code plugin installs a **PostToolUse hook** that automatically updates metadata when:
- `gh pr create` → Updates `pr` and `status`
- `git checkout -b` / `git switch -c` → Updates `branch`
- `gh pr merge` → Updates `status` to `merged`

This is critical — without hooks, PRs created by agents never appear in the dashboard.

---

## Activity Detection

### Method 1: Process Detection
- Find agent process by TTY (tmux pane) or PID
- Check if process is running

### Method 2: JSONL Introspection (Preferred)
- Read Claude Code's `~/.claude/projects/{encoded-path}/*.jsonl`
- Parse last entry for activity type and timestamp
- Classify: `user`, `tool_use`, `progress` → active/ready; `permission_request` → waiting_input; `error` → blocked

### Method 3: Terminal Output Classification
- Parse tmux capture-pane output
- Match patterns: prompt visible → idle, "Do you want to proceed?" → waiting_input

---

## Configuration

### Minimal Config

```yaml
projects:
  my-app:
    repo: owner/my-app
    path: ~/my-app
    defaultBranch: main
```

### Full Config Example

```yaml
port: 3000

defaults:
  runtime: tmux
  agent: claude-code
  workspace: worktree
  notifiers: [desktop]

projects:
  my-app:
    name: My Application
    repo: owner/my-app
    path: ~/my-app
    defaultBranch: main
    sessionPrefix: app
    
    tracker:
      plugin: github
    
    agentRules: |
      Always run tests before pushing.
      Use conventional commits.

    reactions:
      approved-and-green:
        auto: true
        action: auto-merge

reactions:
  ci-failed:
    auto: true
    action: send-to-agent
    retries: 3

  changes-requested:
    auto: true
    action: send-to-agent
    escalateAfter: 1h
```

---

## Key Design Patterns

### 1. Plugin Pattern

Every plugin exports `PluginModule<T>`:
```typescript
export const manifest = {
  name: "tmux",
  slot: "runtime" as const,
  version: "0.1.0",
};

export function create(): Runtime {
  return { /* implementation */ };
}

export default { manifest, create } satisfies PluginModule<Runtime>;
```

### 2. Convention Over Configuration

- Session IDs auto-generated: `{prefix}-{num}` → `app-1`, `app-2`
- Branch names derived from issue IDs
- Paths auto-derived from config location hash

### 3. Stateless Orchestrator

- No database
- Flat metadata files + event log
- Hash-based directory namespacing

### 4. Security-First

- Always use `execFile`/`spawn`, never `exec` (shell injection risk)
- Validate all external input
- No `any` types — use `unknown` + type guards

### 5. Long Prompt Handling

- System prompts >2000 chars written to file, passed via `--append-system-prompt "$(cat /path)"`
- Prevents tmux truncation

### 6. Metadata Auto-Update

- Agent workspace hooks auto-update metadata on git/gh commands
- Dashboard depends on this for PR tracking

---

## CLI Commands

```bash
ao status                    # Overview of all sessions
ao spawn <project> [issue]  # Spawn an agent
ao send <session> "msg"     # Send instructions
ao session ls               # List sessions
ao session kill <session>   # Kill session
ao session restore <session># Revive crashed agent
ao dashboard                 # Open web dashboard
```

---

## Implementation Insights

### Spawn Process
1. Validate project + issue exists
2. Reserve session ID (atomic file creation)
3. Create git worktree with feature branch
4. Start tmux session
5. Launch Claude Code with issue context
6. Write metadata file
7. Install PostToolUse hook for auto-updates

### Lifecycle Polling
1. Check runtime alive (tmux has-session)
2. Detect agent activity (JSONL parsing)
3. Check PR state (GitHub API)
4. Check CI status (GitHub API)
5. Check reviews (GitHub API)
6. Determine new status
7. Trigger reactions if configured

### Cleanup
- Kill sessions when: PR merged, issue closed, or runtime dead
- Archive metadata to `archive/` subdirectory

---

## QueenBee Current Orchestration Analysis

### What QueenBee Already Has (Compared to Composio)

| Feature | Composio Agent Orchestrator | QueenBee |
|---------|---------------------------|----------|
| **Session Isolation** | Git worktree | Git worktree ✅ |
| **Worker Spawning** | `ao spawn` | `spawn_worker` tool ✅ |
| **Background Execution** | tmux sessions | `AutonomousRunner` ✅ |
| **Multi-Agent Coordination** | Basic | **Roundtable** (superior) ✅ |
| **Task Management** | Linear/GitHub Issues | **ProjectTaskManager** (PLAN.md) ✅ |
| **Memory System** | Flat key=value files | **MemoryStore** with graph links ✅ |
| **Team Communication** | Notifier (push) | **Roundtable** chat ✅ |
| **Security** | Command allowlist | **SecurityAuditor** + approvals ✅ |
| **Scope Enforcement** | None | **WorkEnvironment** (LS-01) ✅ |
| **Conflict Detection** | None | **FileOwnershipRegistry** ✅ |
| **Proposal System** | Reactions | **ProposalService** + debate ✅ |
| **Findings Blackboard** | None | **write_finding/read_findings** ✅ |
| **Swarm Context** | None | **read_swarm_context** ✅ |
| **Help/Escalation** | Notifier | **request_help, escalate_to_expert** ✅ |
| **Staggered Launch** | None | **QB-06: 500ms stagger** ✅ |
| **Post-Task Listening** | None | **60s listening mode** ✅ |

### What Composio Does Better (That QueenBee Should Adopt)

#### 1. **Lifecycle State Machine** (HIGH PRIORITY)
Composio has a formal state machine:
```
spawning → working → pr_open → ci_failed → review_pending → changes_requested → approved → mergeable → merged
```

QueenBee's `workerRegistry` only tracks: `starting | running | completed | failed`

**Recommendation**: Add formal states to `AutonomousRunner`:
- Track PR status, CI status, review status
- Emit lifecycle events (Composio's event system)

#### 2. **Reactions System** (HIGH PRIORITY)
Composio's `reactions.yaml` auto-handles:
- CI failures → send to agent
- Review changes → send to agent
- PR approved → auto-merge
- Escalation after N retries or time threshold

QueenBee has manual `challenge_proposal` / `judge_proposal`

**Recommendation**: Implement reaction engine:
```typescript
// Example reaction config
reactions:
  ci-failed:
    auto: true
    action: send-to-agent
    retries: 3
    escalateAfter: 30m
```

#### 3. **Activity Detection via JSONL** (MEDIUM PRIORITY)
Composio reads Claude Code's `~/.claude/projects/*.jsonl` to detect:
- `active` (thinking/writing)
- `ready` (waiting for input)
- `idle` (inactive > 5min)
- `waiting_input` (permission prompt)
- `blocked` (error)
- `exited` (process dead)

QueenBee has no formal activity detection

**Recommendation**: Add activity detection in `AutonomousRunner`:
- Poll JSONL session file for last entry type
- Track timestamps for idle detection
- Emit activity state updates to UI

#### 4. **PR Lifecycle Tracking** (MEDIUM PRIORITY)
Composio's SCM plugin tracks:
- PR creation
- CI status (passing/failing)
- Review status (approved/changes_requested)
- Merge readiness

QueenBee relies on `report_completion` from workers

**Recommendation**: Add PR state polling in lifecycle manager

#### 5. **Plugin Architecture** (LOW PRIORITY - Future)
Composio's 8-slot system is elegant but complex

QueenBee doesn't need this yet — current tool-based approach works

#### 6. **Auto-Merge** (MEDIUM PRIORITY)
Composio supports `action: auto-merge` when PR is approved + CI passes

QueenBee could implement:
```typescript
// After all workers complete and CI green
if (reactions['approved-and-green']?.auto) {
  await scm.mergePR(pr);
}
```

### What QueenBee Does Better (Composio Should Adopt)

#### 1. **Roundtable** — Superior Team Communication
Composio: Simple notifier → human
QueenBee: Real-time team chat with `@mentions`, thread replies

**Verdict**: QueenBee wins. Keep Roundtable.

#### 2. **Proposal Debate System**
Composio: Single reaction → agent
QueenBee: Proposals can be challenged, judged by third-party

**Verdict**: QueenBee wins. More sophisticated governance.

#### 3. **Work Environment Scope Guard**
Composio: No scope enforcement
QueenBee: LS-01 restricts agents to allowed files

**Verdict**: QueenBee wins. Prevents agents from wandering.

#### 4. **File Conflict Detection**
Composio: No detection
QueenBee: `FileOwnershipRegistry` + roundtable alerts

**Verdict**: QueenBee wins.

#### 5. **Findings Blackboard**
Composio: No equivalent
QueenBee: Agents can write findings with confidence scores, tags

**Verdict**: QueenBee wins.

#### 6. **Swarm Context Injection**
Composio: No shared context
QueenBee: `read_swarm_context` gives agents mission, tasks, memories, proposals

**Verdict**: QueenBee wins.

### Recommended Priority Order for Improvements

1. **P0**: Add lifecycle states (spawning→working→pr_open→merged)
2. **P0**: Add activity detection (active/ready/idle/blocked)
3. **P1**: Implement reactions system for CI failures
4. **P1**: Add PR state polling (detect when workers create PRs)
5. **P2**: Auto-merge when CI green + approved
6. **P3**: Plugin architecture (if needed later)

### Summary

**Composio Strengths**:
- Formal state machine
- Reactions automation
- CI/review integration
- Activity detection

**QueenBee Strengths**:
- Roundtable communication
- Proposal governance
- Scope enforcement
- File conflict detection
- Swarm context

**Best Path Forward**: Keep QueenBee's superior team coordination, adopt Composio's lifecycle + reactions for better automation.

---

## References

- Main repo: https://github.com/ComposioHQ/agent-orchestrator
- Config reference: `agent-orchestrator.yaml.example`
- Plugin interfaces: `packages/core/src/types.ts`
- Core implementations:
  - `packages/core/src/session-manager.ts`
  - `packages/core/src/lifecycle-manager.ts`
- Plugin examples: `packages/plugins/runtime-tmux/`, `packages/plugins/agent-claude-code/`
- QueenBee ToolExecutor: `proxy-bridge/src/lib/ToolExecutor.ts`
