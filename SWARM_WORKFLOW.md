# Swarm Swarm v2+: Multi-Agent Workflow Guide

Complete reference for running multi-agent projects with Continue CLI.

**⚡ 3 Critical Improvements (February 2026):**
1. **Enhanced Builder Prompts** — Shell command integration + tech stack auto-detection
2. **Context Provider** — Auto-inject .swarm/ state (no manual swarm_read_brain() calls)
3. **Streamlit Dashboard** — Real-time monitoring of all agents + KPIs

## Quick Start

```bash
# Terminal 1: Initialize and architect
cn
> /swarm init ~/my-project "Build a REST API with auth"
> /architect

# Terminal 2-3: Parallel builders
cn
> /builder

# Terminal 4: Reviewer
cn
> /reviewer

# Terminal 5: Coordinator monitoring
cn
> /coordinator
```

## Complete Workflow

### Phase 1: Mission → Decomposition

**You** (natural language):
```
/swarm init ~/my-project "Build REST API with JWT auth + refresh tokens"
```

**Agent: Architect** (`/architect`)
- Reads MISSION.md
- Reads codebase (framework, existing patterns)
- Calls `swarm_decompose()` with:
  - Architecture decisions
  - Task breakdown (T001, T002, ...)
  - Dependencies between tasks

Output: `PLAN.md` + `STATUS.json` populated

---

### Phase 2: Parallel Execution (Task Claiming)

**Agent: Builder** (`/builder`) — Run in parallel terminals
1. `swarm_recall("auth implementation")` → learn from past
2. `swarm_read_brain()` → understand mission/plan
3. `swarm_read_feedback()` → see what's approved
4. `swarm_claim_task()` → get next available work
5. Work on the task
6. `swarm_complete_task()` → submit output
7. Loop to step 3

**Agent: Researcher** (`/researcher`) — Meanwhile
1. `swarm_recall("JWT best practices")`
2. `swarm_read_brain()` → see what builders need
3. Search for answers (web, docs, etc.)
4. `swarm_write_finding()` → share findings
5. `swarm_remember()` → save reusable lessons

Output: Tasks completed, agent-outputs/ filled with work

---

### Phase 3: Debate (Confidence Loop)

**Agent: Builder** submits for review:
```python
swarm_propose("builder-1", "T003",
  proposal="Use JWT in httpOnly cookies with CSRF protection",
  confidence=75)
```

**Agent: Devil's Advocate** (`/devils-advocate`):
```python
swarm_challenge("advocate-1", proposal_id,
  risks="Cookies vulnerable to CSRF if not properly mitigated. Token expiry strategy unclear.",
  questions="What's the CSRF token validation? How do you handle logout across devices?",
  severity="high")
```

**Agent: Reviewer** (`/reviewer`):
```python
swarm_judge("reviewer-1", proposal_id,
  confidence=85,
  reasoning="CSRF token mitigates cookie risk. Logout strategy is solid.")
  # confidence >= 80 → APPROVED
  # confidence < 80 → MUTATION (proposer must rethink)
```

Output: Debate history in `feedback/proposals.jsonl`

---

### Phase 4: Continuous Coordination

**Agent: Coordinator** (`/coordinator`) — Periodic pulse checks
1. `swarm_heartbeat()` → Detect:
   - Stuck tasks (IN_PROGRESS > 30 min)
   - Newly unblocked tasks
   - Rejection rate trends
   - Overall velocity

2. `swarm_read_brain()` → Full state snapshot
3. `swarm_read_feedback()` → Recent reactions
4. `swarm_synthesize()` → Create roundtable summary
5. Report to user + save lessons

---

## Agent Reference

### `/architect`
**When**: Start of project or new phase
**Inputs**: MISSION.md, codebase
**Outputs**: PLAN.md, STATUS.json with tasks
**Tools**: `swarm_decompose()`, `swarm_recall()`, `swarm_remember()`

### `/builder`
**When**: Continuously during execution
**Inputs**: Claimed task, PLAN.md, agent-outputs/
**Outputs**: Completed work, proposals for feedback
**Tools**: `swarm_claim_task()`, `swarm_complete_task()`, `swarm_propose()`, `swarm_remember()`

### `/researcher`
**When**: Whenever builders/reviewers need knowledge
**Inputs**: MISSION.md, queries from read_brain
**Outputs**: Findings, lessons, memories
**Tools**: `swarm_write_finding()`, `swarm_remember()`, search tools

### `/reviewer`
**When**: After proposals submitted or work completed
**Inputs**: Proposals, agent-outputs/, PLAN.md
**Outputs**: Confidence judgment, approved/mutated status
**Tools**: `swarm_judge()`, `swarm_react()`, `swarm_get_proposals()`

### `/devils-advocate`
**When**: After initial proposals
**Inputs**: Proposals, architecture decisions
**Outputs**: Challenges, risk identifications
**Tools**: `swarm_challenge()`, `swarm_get_proposals()`

### `/coordinator`
**When**: Periodically (every 30 min or when blocked)
**Inputs**: Full swarm state
**Outputs**: Status dashboard, alerts, synthesis
**Tools**: `swarm_heartbeat()`, `swarm_synthesize()`, `swarm_read_brain()`

### `/swarm`
**When**: Management/status checks
**Inputs**: User commands
**Outputs**: Status dashboard, alerts
**Tools**: `swarm_init()`, `swarm_status()`, `swarm_heartbeat()`, `swarm_recall()`

---

## Confidence & Mutation Loop

### Scoring Guide
- **90-100**: Exceptional. Ship it.
- **80-89**: Solid. Minor concerns. Approved.
- **70-79**: Concerning. Significant risks. **MUTATION**
- **60-69**: Weak. Fundamental issues. **MUTATION**
- **<60**: Reject. **MUTATION with major stressor**

### Mutation Process
When `confidence < 80`:

1. Reviewer identifies STRESSOR (specific problem):
   ```
   "XSS vulnerability via localStorage + no token refresh"
   NOT "this has security issues"
   ```

2. System broadcasts: `MUTATE: Address {stressor}`

3. Proposer does **NOT** patch existing proposal
   - Must fundamentally rethink approach
   - Addresses the specific stressor

4. Submit new proposal (round 2 of debate)

5. Dialectic restarts with enriched context

---

## Memory System (Cross-Session Learning)

### Storing a Lesson
```python
swarm_remember("builder-1",
  lesson="Always validate JWT expiry server-side, don't trust client clock",
  context="T003 review caught clock-skew attack vector",
  confidence=0.8)  # Start high if you're confident
```

### Retrieving Lessons
```python
swarm_recall("JWT validation")  # Returns top matches by confidence
```

### Adjusting Confidence
```python
swarm_confirm_memory("builder-2", "M20260212...", reason="Saved my day")
# OR
swarm_challenge_memory("reviewer-1", "M20260212...", reason="Not always true")
```

Memories auto-prune if confidence drops below 0.3.

---

## Shared Brain (`swarm_read_brain()`)

Every agent calls this before starting. Returns:
- MISSION summary
- PLAN summary
- Recent decisions
- Recent feedback/reactions
- Active proposals (in debate)
- Top memories (high confidence)
- Task status (done/in-progress/available/blocked)

This is the ~4000 token "shared context" all agents know.

---

## Feedback Reactions

### Types
- `approve` → "This works, no issues"
- `challenge` → "This has problems that need fixing"
- `build-on` → "This is good, but consider extending with X"
- `flag-risk` → "This introduces X risk we should mitigate"

### Usage
```python
swarm_react("reviewer-1", "T003", "challenge",
  "Missing error handling for network timeouts")
```

All agents read these on next `swarm_read_brain()`.

---

## Heartbeat & KPIs

### Metrics Tracked
- `tasks_completed` — progress
- `tasks_rejected` — quality filter
- `avg_task_duration_min` — velocity
- `rejection_rate` — health (aim for <20%)
- `memories_count` — knowledge base
- `reactions_count` — feedback volume

### Alerts
Heartbeat detects:
- Tasks stuck > 30 min
- Newly unblocked work
- High rejection rate
- Idle agents

---

## Project-Agnostic Design

The system works for **any tech stack**:
- **Web**: React, Vue, Angular, Node, Django, Rails...
- **Mobile**: iOS, Android, Flutter, React Native...
- **Backend**: Python, Go, Rust, Java...
- **ML**: PyTorch, TensorFlow, scikit-learn...

**How**:
- Architect reads codebase to detect patterns
- Role prompts adapt to what they read
- No hardcoded tech assumptions

---

## Error Recovery

### Agent Stuck?
```
cn
> /swarm status  # Check blocked tasks
> /coordinator  # Run heartbeat to identify stressor
```

### Low Confidence Loop?
```
swarm_judge(..., confidence=65, stressor="...")
# System broadcasts MUTATE command
# Proposer rethinks, resubmits
```

### Wrong Lesson Learned?
```
swarm_challenge_memory("agent-1", "M...", "Found edge case this doesn't apply")
# Confidence drops, lesson deprioritized
```

---

## Advanced Patterns

### Parallel Builders + Reviewer
Multiple builders work on independent tasks. Reviewer continuously judges their proposals.

### Researcher as Unblocking Agent
When builder is stuck ("I don't know X"), researcher finds the answer while builder moves to next task.

### Coordinator as Safety Net
Periodically checks for stuck tasks, broadcasts unblocking suggestions.

### Memory-Driven Development
Each project builds a knowledge base. Start future projects with `swarm_recall("similar problem")`.

---

## 🆕 Three Critical Improvements (February 2026)

### 1. Enhanced Builder Prompts (swarm-builder-enhanced.yaml)

The builder prompt now includes:
- **Decision Tree**: When to use shell commands vs code editing
  - Shell: Testing (`npm test`), building (`make build`), git operations
  - Code: Feature implementation, refactoring, business logic
- **Tech Stack Auto-Detection**: Recognizes Node.js, Python, Rust, Go, Java, C++
  - Suggests correct build command: `npm build` vs `cargo build` vs `pytest`
- **Output Capture Guidelines**: How to report shell results clearly
- **Parallel Execution**: When safe to run multiple commands simultaneously

**Impact**: Builders no longer guess — they have clear guidance on execution strategy.

### 2. Context Provider (swarm_context_provider.py)

Automatically injects `.swarm/` state into every agent's context WITHOUT manual `swarm_read_brain()` calls.

**What Agents See Automatically:**
```markdown
## 🎯 MISSION
Your project mission (first 500 chars)

## 📋 PLAN
Architecture summary + task breakdown

## 📊 TASK STATUS
- Done: X/total
- Available tasks ready to claim
- Blocked tasks (waiting on dependencies)

## ✅ RECENT APPROVALS
Last 3 decisions recorded by reviewer

## 🧠 KEY MEMORIES
High-confidence lessons (confidence ≥ 0.7)

## 🗣️ ACTIVE DEBATES
Proposals in discussion + challenge count

## 🚫 BLOCKED TASKS
Tasks waiting for dependencies + what they're waiting for
```

**Impact**:
- Agents see full context without tool calls (~100 tokens vs ~400 for manual calls)
- Context is "ambient" — always available
- Reduces decision latency
- Registered in config.yaml as context provider

### 3. Streamlit Dashboard (swarm_dashboard.py)

Real-time web-based command center showing:

**Metrics Row (Top)**
- Total Tasks | Running | Done | Failed | Success Rate %

**Tab 1: Task Flow**
- Visual bar chart of status distribution
- Interactive table (id, title, status, assigned_to)
- Easily spot bottlenecks (red Failed count)

**Tab 2: Agents**
- Cards for each active agent
- Last update timestamp
- "View Work" button to see agent outputs

**Tab 3: Shared Brain**
- Raw JSON of STATUS.json (debugging)

**Launch:**
```bash
export SWARM_PATH=~/project/.swarm
streamlit run ~/.continue/swarm_dashboard.py
# Opens http://localhost:8501
```

**Features:**
- Auto-refresh (2-60 seconds, configurable)
- Color-coded status (green=done, blue=running, orange=todo, red=failed)
- Real-time updates as agents complete tasks

**Impact**:
- Single pane of glass for all agent activity
- Spot stuck tasks instantly (no parsing needed)
- Track velocity visually
- Debug by clicking "View Work"

---

## Configuration

MCP server registered in `~/.continue/config.yaml`:
```yaml
experimental:
  modelContextProtocolServers:
    swarm-coordinator:
      transport:
        type: stdio
        command: "/usr/local/bin/python3.12"
        args:
          - /Users/ndn18/.continue/mcp-server/swarm_server.py
```

Slash commands auto-registered:
- `/architect`, `/builder`, `/researcher`, `/reviewer`, `/coordinator`
- `/devils-advocate`, `/swarm`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tasks not unblocking | Run `/swarm heartbeat` to check dependencies |
| Low confidence loops | Ensure stressor is specific, not vague |
| Memory bloat | Memories auto-prune if confidence < 0.3 |
| Agent isolation | Call `swarm_read_brain()` before proposing |
| Debate stuck | Coordinator runs synthesis to break deadlock |

---

## Files

- `~/.continue/mcp-server/swarm_server.py` — MCP server (15+ tools)
- `~/.continue/prompts/swarm-*.yaml` — 7 role prompts
- `~/.continue/config.yaml` — MCP registration + slash commands
- Project root: `.swarm/` directory (git-tracked, human-readable)

---

## Sources & Inspiration

- **ericosiu**: Shared filesystem as N agents = N connections (no N² messaging)
- **Voxyz**: Proposal/heartbeat/reaction matrix for auto-governance
- **Dr. Jerry A. Smith**: Devil's Advocate Architecture (thesis-antithesis-synthesis)
- **Google RLM**: Recursive context decomposition for large problems
- **Claude Code**: Team mode (task lists, file locking, message passing)

---

## 📚 Medium/Long-Term Documentation

As Swarm evolves, refer to these specialized guides (completed in Phase 3):

### Failure Mode Taxonomy (`FAILURE_MODE_TAXONOMY.md`)
**When**: Medium-term (1-2 weeks)
**What**: Complete taxonomy of multi-agent LLM failures with recovery strategies
- 4 categories: Cognitive, Coordination, Infrastructure, Security
- Detection methods for each failure mode
- Medic intervention strategies
- Whitelist-based package validation
- Token budget enforcement

**Use case**: Training `/medic` agent on what to look for

### Token Accounting Standards (`TOKEN_ACCOUNTING.md`)
**When**: Medium-term (1-2 weeks)
**What**: Standardized token cost attribution using OpenTelemetry + OpenInference
- Span schema for LLM calls (agent_id, task_id, tokens, cost)
- AIOS Process Table for mission-level tracking
- Cost-Per-Gain (CPG) formula to detect real inefficiency
- Per-task and per-mission token budgets
- Integration with Streamlit dashboard

**Use case**: Monitor token burn, identify inefficient agents, enforce budgets

### Debate Strategies (`DEBATE_STRATEGIES.md`)
**When**: Medium-term (1-2 weeks)
**What**: Free-MAD vs CP-WBFT strategies for avoiding collective hallucinations
- **Free-MAD**: Fast (1 round), good for design/logic tasks, anti-conformity
- **CP-WBFT**: Robust (3-5 rounds), good for security-critical, Byzantine-tolerant
- Hybrid approach: Free-MAD first, escalate to CP-WBFT if confidence < 80%
- Implementation code for both strategies
- Decision tree for choosing the right strategy

**Use case**: Configure `/reviewer` and `/devils-advocate` agents with right debate strategy

### PLAS Scheduler (`PLAS_SCHEDULER.md`)
**When**: Long-term (1 month)
**What**: Program-Level Attained Service scheduler to prevent head-of-line blocking
- Core PLAS principle: priority = 1 / cumulative_tokens_consumed
- Synergy with KV-Cache sharing (short service times = higher priority)
- ATLAS extension for DAG workflows
- Locality-aware load balancing
- Preemption and context switching

**Use case**: Optimize task execution order, prevent slow tasks from blocking fast ones

---

## Ce qui manque (ou à surveiller)

*   **Tests de montée en charge** : L'architecture repose sur `fcntl.flock` pour la concurrence. Avec 5+ agents travaillant simultanément sur le même `STATUS.json`, il faudra surveiller les latences d'I/O.
*   **Nettoyage automatique** : Il n'y a pas encore de script pour arcswarmr les `.swarm/` terminés (pour éviter l'encombrement du disque sur le long terme).
*   **Interface Visuelle** : Actuellement, le statut se lit via `/swarm status` (texte). Une visualisation plus graphique de l'état des tâches dans VS Code via un outil MCP dédié pourrait être un plus.
