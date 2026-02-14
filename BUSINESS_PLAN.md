# QueenBee Business Plan: Free Web Preview + Paid Desktop App

## Model Overview

**Web version** (free) = demo & lead-gen tool hosted on Vercel.  
**Desktop app** (paid, subscription) = the full product users pay for.

---

## Web (Free Tier)

### Included
- Full agent chat (core differentiator — let people experience the magic)
- Read-only file explorer (see what the agent changed)
- ZIP download of workspace changes
- Limited sessions (e.g., 3 workspaces, 1 concurrent)

### Excluded
- Git clone / commit / push
- Local file system access
- Unlimited workspaces
- Full provider configurations

### UI Adaptation
- Env flag: `NEXT_PUBLIC_MODE=web` or `NEXT_PUBLIC_MODE=desktop`
- Conditionally hide: commit modal, git panel, git-related buttons
- Replace "Commit & Push" with "Download ZIP"
- Subtle "Powered by QueenBee — Get the full app" CTA

---

## Desktop App (Paid Tier — Subscription)

### Included
- Everything in the free tier, plus:
- Full git clone / commit / push integration
- Unlimited workspaces & concurrent sessions
- Local file system access
- All provider configurations
- Priority agent access

---

## Why This Split Works

1. **Eliminates deployment headaches** — git auth on VPS, SSH keys, file system permissions. All current deployment bugs are git-related; removing git from the free tier sidesteps them entirely.
2. **ZIP download is smart friction** — devs will try it once, realize they want real git integration, and pay.
3. **The agent is the hook** — give it away free. The "plumbing" (git, local FS) is the paywall.
4. **Simple boundary** — web = read + ZIP, desktop = full git workflow. No complex feature gating.

---

## Implementation Steps

1. Add `NEXT_PUBLIC_MODE` env variable (`web` | `desktop`)
2. Create a shared `isWebMode()` utility
3. Hide git UI components when `mode === 'web'`
4. Implement ZIP download endpoint (`/api/workspace/download`)
5. Replace commit CTA with download CTA on web
6. Add upgrade prompts / CTA linking to desktop app download
7. Set `NEXT_PUBLIC_MODE=web` on Vercel, `desktop` in Electron builds
