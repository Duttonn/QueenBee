# 🎬 QueenBee Demo Video — Requirements & Context

## The Goal

Create a **premium product launch video** (~60-70 seconds) that showcases QueenBee's capabilities. Think Apple/Linear aesthetic — clean, sophisticated, movement-forward. The video should make developers feel: "I need this."

**You have full creative freedom.** Don't ask for permission. Just deliver something amazing.

---

## Production Notes (IMPORTANT)

### Timing
- **Make scenes 20% longer** than the current version
- Current total: ~1500 frames (50 seconds)
- New target: ~1800 frames (60 seconds)
- Adjust scene durations in `QueenBeeFusion.tsx`

### Sizing
- **Make small text bigger** — currently fontSize 10-12px, bump to 12-14px
- **Make content 20% bigger overall** — increase padding, margins, component sizes
- Headlines: 30px → 36px
- Subheadlines: 18px → 22px
- Body: 12px → 14-15px
- Code: 11px → 13-14px

### Motion Graphics (Use These Techniques)

**From spring-physics.md:**
```tsx
// Use spring() instead of interpolate() for organic motion
const scale = spring({
  frame,
  fps,
  config: { damping: 12, stiffness: 100 },
});

// Snappy preset for UI elements
const snappy = { damping: 20, stiffness: 200 };

// Bouncy entrance for playful
const bouncy = { damping: 8, stiffness: 100 };
```

**From typography.md:**
```tsx
// Smooth cursor blink
const caretOpacity = interpolate(
  frame % CURSOR_BLINK_FRAMES,
  [0, CURSOR_BLINK_FRAMES / 2, CURSOR_BLINK_FRAMES],
  [1, 0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);
```

**From transitions.md:**
```tsx
// Smooth scene transitions
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
```

**From sequencing.md:**
```tsx
// Staggered animations
const STAGGER_DELAY = 8;
const items = data.map((item, i) => {
  const delay = BASE_DELAY + i * STAGGER_DELAY;
  const progress = spring({ frame: frame - delay, fps, config: { damping: 15 } });
});
```

---

## What QueenBee Actually Is

QueenBee is an **autonomous multi-agent coding swarm** that runs entirely on your machine. It's what happens when you combine Cursor's UX with Claude Code's autonomy plus actual parallel execution plus memory that persists across sessions.

### Core Value Proposition

> "Your whole dev team, running on your machine."

Unlike every other AI coding tool, QueenBee:
- Remembers your codebase across sessions
- Runs multiple agents in parallel on separate git worktrees
- Gets smarter over time via evolutionary learning
- Keeps your code local — never touches the cloud

---

## The Features (What's Implemented)

Here's everything QueenBee can do — pick what to highlight:

### 🐝 Swarm Coordination
- **@qb Command** — Summon the Hive Architect to plan and coordinate multiple workers
- **Parallel Agents** — Run 2+ agents simultaneously on separate branches (git worktrees)
- **Roundtable** — Team chat where agents coordinate, share updates, mention each other
- **Worker Templates** — Specialized agent personas: UI_BEE, LOGIC_BEE, TEST_BEE
- **File Change Bus** — Agents detect when teammates modify the same files

### 🧠 Memory & Learning
- **Session Memory** — Agents remember conventions, patterns, what worked/didn't
- **MemoryStore** — Structured JSON memory with confidence scores, categories
- **Experience Archive** — Persistent cross-session evolutionary trace
- **GEA (Group-Evolving Agents)** — Agents share learnings, reflect collectively, evolve workflows
- **DiffLearner** — Learns from your code corrections
- **StyleScraper** — Mimics your coding style

### 🛡️ Safety & Control
- **PolicyStore** — JSON config for runtime rules (max agents, timeouts, feature flags)
- **ProposalService** — Agents propose work, system approves/rejects based on policy
- **Slack/Discord Approvals** — Human-in-the-loop for risky commands
- **SecurityAuditor** — Blocks dangerous commands (rm -rf, curl|bash, etc.)
- **ByzantineDetector** — Detects stuck loops, repetitive garbage, token explosion

### 🔧 Developer Experience
- **Worktree Management** — Auto-setup git worktrees on branch creation
- **Forge Integration** — GitHub/GitLab PR creation
- **Terminal PTY** — Real embedded terminal
- **Voice Input** — Whisper transcription
- **Auto Context** — IDESyncHook for live context

### ⚡ Agentic Loop
- **AutonomousRunner** — Think→Act→Observe loop with plan blocks
- **Circuit Breaker** — Auto-recovers when agents get stuck
- **Tool Executor** — 12 tools: write_file, read_file, run_shell, create_worktree, spawn_worker, etc.
- **Structured Thought Protocol** — Agents declare GOAL/STEPS/CURRENT_STEP
- **Smart Context Pruning** — Auto-prunes at 80k tokens

### 📊 Observability
- **CostTracker** — Logs token usage, costs by model/tool
- **HeartbeatService** — Detects stale tasks, recovers them
- **DiagnosticCollector** — System health, queue pressure, stuck detection
- **EventLog** — Structured JSONL event log

### 🧬 Advanced (Phase 14-17)
- **MCTS Workflow Optimizer** — Automated workflow search
- **Geometric Median Consensus** — Byzantine-robust debate scoring
- **Sub-Hive Specialization** — Hierarchical agent swarms
- **Visual UI Validation** — Screenshot comparison for UI tasks
- **KPI Dashboard** — Real-time swarm metrics

---

## The Current UI (Use This)

We've built a MacOS-style window in Remotion. **Reuse and enhance these components:**

### AppUI.tsx
```
- Left sidebar (280px → 320px): Search bar, Project picker, Nav tabs (Automations/Triage/Skills), Threads list, Remotes (GitHub), User profile
- Main header: Branch picker, workbench tabs (Code/Chat/Plan), action buttons
- Zinc color palette (NOT slate/gray)
- Inter font + SF Mono for code
```

### MacWindow.tsx
```
- Mac-style window with traffic light buttons (red/yellow/green)
- Scale/opacity entrance animations with spring physics
- Drop shadow and border
```

### Desktop Background
```
- Deep purple gradient: #5b21b6 → #2d1b69 → #1a0f3d → #05030c
- Subtle dot grid pattern (rgba white 4%)
- Radial vignette overlay
```

### Color System
```
- QueenBee purple: #7B4FFF
- Secondary agent pink: #FF1654  
- Success green: #22c55e
- Warning amber: #f59e0b
- Error red: #ef4444
```

### ComposerBarUI.tsx
```
- Auto-expanding textarea
- Send button
- Optional Plan Approval mode (Approve/Revise buttons)
```

---

## Requirements for the Video

### Must Have
- [ ] Premium Apple/Linear aesthetic — clean, sophisticated motion
- [ ] Show parallel agents running simultaneously (the key differentiator)
- [ ] Show memory persistence (agents remembering past sessions)
- [ ] Show safety/policy controls (blocking risky commands)
- [ ] Product comparison card (QueenBee vs Cursor/Claude Code/Devin)
- [ ] Clear CTA at end
- [ ] **20% longer scenes** — adjust timing
- [ ] **20% bigger text** — bump all font sizes

### Should Have
- [ ] Split-screen terminal view with multiple agents
- [ ] Memory counter animation with spring bounce
- [ ] Git diff view
- [ ] Slack/Discord approval notification card
- [ ] Branch/worktree indicators
- [ ] **Spring physics** for all animations (not linear interpolate)
- [ ] **Smooth transitions** between scenes (fade/slide)

### Nice to Have
- [ ] Sound design (typing, notifications)
- [ ] Glassmorphism effects (backdrop blur)
- [ ] More realistic sidebar content
- [ ] Animated progress bars with spring
- [ ] **Staggered animations** for lists
- [ ] **Cursor blink** with smooth opacity

### Constraints
- [ ] 60-70 seconds max
- [ ] Keep QueenBee branding (purple, bee icon 🐝)
- [ ] Don't make it generic — it should feel unique to QueenBee

---

## Technical Stack

```
- Remotion (React animation)
- 30 fps
- ~1800 frames (~60 seconds)
- TailwindCSS
- Lucide icons
- Spring physics for motion (REQUIRED)
- TransitionSeries for scene changes
```

Run with:
```bash
cd demo-video
npm run dev    # Preview
npm run build  # Export MP4
```

---

## The Existing Code

Look at `src/QueenBeeFusion.tsx` — it's your starting point. We've already built:
- 13 scenes with timing (adjust +20%)
- MacWindow wrapper
- AppUI layout (scale up 20%)
- Scene components: FusionParallel, FusionDiff, FusionMemory, FusionSafety, FusionCompare, FusionCTA

**Your job:** Make it 10x more polished. Use spring physics. Make text bigger. Add smooth transitions. Make it worthy of a product launch.

---

## Summary

QueenBee is the autonomous coding swarm for developers who want:
1. **Parallelism** — Multiple agents, multiple branches
2. **Memory** — Remembers your codebase forever
3. **Learning** — Gets smarter every session
4. **Safety** — Policy controls + human approvals
5. **Local** — Code never leaves your machine

Show these. Make it beautiful. 🐝
