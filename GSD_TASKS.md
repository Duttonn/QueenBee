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
- [IN PROGRESS] `FEAT-02`: [Frontend] Enhance Commit UX and Integration
  - **Description**: Replace the basic hammer icon with a proper "Commit" button using the Open style. Revamp the changes/diff view to match the provided "Complete Changes" mockups (split pane, checkboxes, etc.). Ensure backend commit integration is solid.
  - **Actions**:
    - Update `AgenticWorkbench.tsx` header to use the new Commit button style.
    - Create/Update `CommitModal.tsx` or similar for the commit flow (stage, message, push).
    - Update `DiffViewer.tsx` to support the new full-featured changes view.
    - Verify `api/git/commit` endpoint usage.
  - **Files**: `dashboard/src/components/layout/AgenticWorkbench.tsx`, `dashboard/src/components/projects/DiffViewer.tsx`, `dashboard/src/components/layout/CodexLayout.tsx`
  - **Worker**: FRONTEND
- [ ] `FEAT-01`: [Full-Stack] Visual GSD Task Management in Sidebar
  - **Description**: Provide a visual rendering of the GSD tasks in the left sidebar to track agent progress.
  - **Actions**:
    - Create a backend endpoint `GET /api/tasks` to parse and serve tasks from `GSD_TASKS.md`.
    - Implement a `TaskStatus` component in the Sidebar to display active and pending tasks.
    - Group tasks by project/category and use the Zinc palette for a premium aesthetic.
    - Ensure real-time updates via the existing Socket.io infrastructure if possible.
  - **Files**: `proxy-bridge/src/lib/TaskManager.ts`, `dashboard/src/components/layout/Sidebar.tsx`, `dashboard/src/store/useHiveStore.ts`
  - **Worker**: INTEGRATION
  - **Description**: The command line theme does not match the app's aesthetic. The input field is non-functional, and the button to open it is missing.
  - **Actions**:
    - Update CLI theme to match the application (Zinc palette).
    - Restore the missing CLI button in the top right.
    - Ensure input field accepts commands and executes them.
    - Verify functionality in both Web Workspace and Local macOS app.
  - **Files**: `dashboard/src/components/layout/XtermTerminal.tsx`, `dashboard/src/components/layout/CodexLayout.tsx`, `dashboard/src/components/layout/TerminalPane.tsx`
  - **Worker**: FRONTEND
