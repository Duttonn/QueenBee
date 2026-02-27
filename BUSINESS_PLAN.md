# QueenBee

## Your whole dev team, running on your machine.

You've tried Cursor. You've tried Claude Code. They're great — until the task gets real. The moment you need parallel work, cross-session memory, or an agent that doesn't require you to hold its hand, you hit the ceiling. QueenBee is what comes after that ceiling. Multiple agents, working in parallel, on your machine, remembering your codebase session after session, getting smarter every time you use them.

---

## What you can actually do with QueenBee

**What if you could kick off a whole feature and go get coffee?**

With QueenBee you can launch multiple agents at once — one building the API, one writing the frontend, one writing the tests — all in parallel, all reporting back to a shared board so they don't step on each other. You come back to a PR, not a half-finished prompt.

**What if your agent actually remembered your codebase?**

Every other tool starts cold. Every. Single. Session. Cursor doesn't remember. Copilot doesn't remember. Claude Code doesn't remember. QueenBee does. After each session, agents write down what they learned — your conventions, your patterns, your common failure modes — and that knowledge gets injected into every future agent on your project. The codebase context you built up last Tuesday is still there on Friday.

**What if you could work on three features at once without conflicts?**

With QueenBee you can run agents on separate git branches simultaneously. Feature A, Feature B, and that bug fix you've been putting off — all in flight at the same time, each isolated, no merge nightmares while they're running.

**What if your agents got better the longer you used them?**

With QueenBee, they do. After each session, agents review what worked and what didn't and write it down — permanently. Those lessons get injected into future agents' instructions. The more you use QueenBee on your codebase, the more it understands your patterns, your conventions, and your common failure modes. No other tool does this.

**What if bad code got caught before it ever landed?**

With QueenBee, agents review each other's work before committing. One agent proposes a solution, others challenge it, a judge scores it. Weak plans get reworked or rejected before they touch your repo. It's code review that happens before the code exists.

**What if an agent gets stuck — and just unstuck itself?**

With QueenBee, if an agent gets stuck in a loop or starts doing something unexpected, it auto-recovers and keeps going. You can also set the rules — exactly which commands agents can and can't run — and nothing runs outside those boundaries. If something is sensitive, it pings you on Slack or Discord for approval before continuing.

**What if you could set up nightly agent jobs and just check the results in the morning?**

With QueenBee you can. Schedule agents to run your test suite, auto-fix linting errors, update dependencies, or generate a weekly summary of what changed. Set it once, forget it, check Slack in the morning.

**What if you could review, commit, and open a PR without leaving the app?**

With QueenBee you can. Agents commit with meaningful messages, push to your branch, and open pull requests for you. You review the diff in the app, approve, and merge. Your Git workflow stays intact — you just don't have to run it manually.

---

## How it compares

| Feature | QueenBee | Cline | claude-flow | Codex | Cursor | Devin | Claude Code |
|---|---|---|---|---|---|---|---|
| Runs on your machine | Yes | Yes | No | No — cloud sandbox | Partial | No — cloud only | No |
| **Agents self-evolve over time** | **Yes — GEA: every session makes agents smarter** | **No** | **No** | No | No | No | No |
| **Cross-session experience archive** | **Yes — .qbx bundles, shareable** | **No** | **No** | No | No | No | No |
| **Byzantine fault detection** | **Yes — 5-signal circuit breaker** | **No** | **No** | No | No | No | No |
| **Consensus voting on risky changes** | **Yes — Weiszfeld geometric median** | **No** | **No** | No | No | No | No |
| Parallel agents | Yes — self-healing swarms | Yes (Feb 2026) | Yes | No | No | No | No |
| Predictable flat billing | Yes — no credit games | FREE (open source) | FREE | Bundled in ChatGPT | Credits | Pay-per-ACU, $9/hr+ | Rate-limited |
| GUI + visual diff | Yes | VSCode only | No | No | Yes | No | No |
| Price | From $29/mo | FREE | FREE | Bundled | From $20/mo | ~$9/hr | $20–$200/mo |

**The one message:** *"Cline can run agents in parallel. claude-flow can orchestrate them. QueenBee's agents learn from each other and get smarter every session — nothing else does this."*

**Cline** (5M+ VSCode installs, free, open-source) launched native subagents in February 2026. It is the biggest free threat. QueenBee's answer: GEA self-evolution. Cline agents are stateless — every run starts cold. QueenBee's experience archive compounds. After 30 sessions your QueenBee agents are measurably better; Cline's are not.

**claude-flow** (14,886 stars, actively developed as of Feb 2026) is the closest architectural rival — multi-agent orchestration for Claude. But it has no persistent learning, no experience archive, and no evolutionary directives. It orchestrates agents; QueenBee evolves them.

**Codex (OpenAI)** runs in a cloud sandbox with the internet disabled during task execution — it can't fetch docs, hit your staging API, or do anything that requires a network call. Tasks are async, not interactive. Your code leaves your machine.

**Cursor** is a phenomenal IDE companion — but it's one agent with no memory. Every session starts cold. Credit-based billing means your monthly budget is a black box.

**Devin** is fully cloud-based. It dropped from $500/mo flat to pay-as-you-go. No local execution, no memory, and you're paying for cloud infrastructure on top of model costs.

**Claude Code** has an excellent underlying model but it's a terminal-only tool with no GUI, no visual diff. It's powerful for developers who live in the terminal. Not built for parallel autonomous work that self-improves.

---

## Who QueenBee is built for

QueenBee is built for developers who:

- Are already using AI coding tools but keep hitting the wall when the task gets big enough to require real engineering judgment
- Have been burned by agents that went off the rails, deleted the wrong file, or hallucinated their way through a PR
- Are frustrated by tools that forget everything at the end of every session and make you re-explain the codebase from scratch
- Want automation they can actually trust — not because it's locked down, but because they control the rules
- Work on projects that live on their machine and shouldn't be uploaded to someone else's cloud to get worked on
- Have had an unexpected bill from a credit-based tool and decided that was the last time

If you're the kind of person who reads the changelog, has opinions about system prompts, and has already thought about what it would take to run agents in CI — QueenBee is for you.

---

## Pricing

The AI coding tool market has a billing problem. Cursor users got surprised in June 2025 when effective request counts were cut without notice. Kiro users in August 2025 watched credits drain in 15 minutes. Bolt users have posted about unexpected charges repeatedly. QueenBee has no credits, no request pools, and no usage surprises. You pay a flat rate, you know what you're getting.

### Free
1 parallel agent, 2 active projects, no memory persistence. Good for evaluating QueenBee on a real task before committing. Your API key, your machine, no time limit — just limited in scope.

### Pro — $29/month
3 parallel agents, unlimited projects, cross-session memory (stored locally), scheduled agents, Slack/Discord approval flows, and the full evolution/self-learning system. Bring your own API key. Your code never leaves your machine. Flat billing — no credits, no usage math.

### Team — $79/seat/month
Everything in Pro, plus shared team memory — agents on one machine learn what agents on another machine discovered. Shared agent policies across the team. The swarm gets smarter as a team, not just per person.

### Enterprise — Custom
Self-hosted license server, audit logs, compliance exports, custom LLM routing, and a dedicated SLA. Talk to us.

---

## Business model & infrastructure strategy

### The core principle: license-gated local app

QueenBee is a desktop app. User projects live entirely on the user's machine — we never store their code, their project files, or their agent history. This keeps our infrastructure costs near zero and is a genuine privacy guarantee, not just a marketing claim.

Access control works through a lightweight license server:

1. User creates an account and subscribes at queenbee.dev
2. User downloads the Electron app
3. On startup, the app pings our license API with a signed token
4. The server responds with: active/inactive + tier (Free/Pro/Team)
5. The app enforces tier limits locally (parallel agent count, feature gates, etc.)
6. The check refreshes every 24 hours in the background
7. If a subscription lapses, the app shows a paywall on next check

This is the same model used by JetBrains, Cursor, Sketch, and Warp. We hold the key to the ignition — we don't hold the car.

### What we actually host

| Data | Where it lives | Why |
|---|---|---|
| User accounts + subscription status | Our DB (tiny) | Auth + Stripe webhook updates |
| Device tokens | Our DB | Multi-device verification |
| Team memory blobs | Our DB (small JSON) | Team tier only — shared agent learnings, not code |
| User projects, code, agent history | User's machine | We never touch this |

Our backend is a single lightweight API (Vercel + Neon Postgres). Total infrastructure cost at early scale: under $20/month.

### What the tiers gate

Since we're BYOK (bring your own API key), we're not limiting compute — we're limiting what the app allows:

| | Free | Pro | Team |
|---|---|---|---|
| Parallel agents | 1 | 3 | Unlimited |
| Active projects | 2 | Unlimited | Unlimited |
| Memory persistence | ✗ | ✓ local | ✓ shared |
| Scheduled agents | ✗ | ✓ | ✓ |
| Slack/Discord approvals | ✗ | ✓ | ✓ |
| Evolution / self-learning | ✗ | ✓ | ✓ |
| Team shared memory | ✗ | ✗ | ✓ |

### Why free users won't replace paying users

The free tier is deliberately limited in ways that matter in practice. A developer who is seriously using QueenBee for real work — running multiple agents, needing memory to persist, setting up Slack approvals — will hit the free tier walls quickly. The limitations are not artificial; they map to exactly the features that require infrastructure or parallel compute management.

The free tier is top-of-funnel marketing, not a substitute for the product.

---

## Why now

The models are ready. Claude, GPT-4o, and Gemini can genuinely handle multi-step engineering work — the bottleneck is no longer intelligence, it's the tooling around them. The gap the market hasn't filled: agents that remember, recover, and compound their knowledge across sessions. Every current tool resets to zero. QueenBee doesn't.

Studies show AI-generated code introduces bugs at a rate that should make any engineering team nervous. The answer isn't less AI — it's AI with better guardrails. Agents that challenge each other's proposals, that check their work, that pause before running destructive commands, and that ask a human when something looks off. That's what QueenBee is built around.

The developer community has also made clear they're done with opaque billing. Flat pricing, local execution, and tools that respect your infrastructure are what serious teams are now looking for. QueenBee was built with all three as non-negotiables.
