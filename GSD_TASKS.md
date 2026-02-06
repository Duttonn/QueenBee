# 🐝 QUEEN BEE - GLOBAL STATUS & DISPATCH (GSD)
# Généré par : Architecte Agent
# Date : 2026-02-06
# Source : PRD v3 Ground Truth + Audit Forensique + Delta v3.1

## 📊 Status Global
- **Blocker #1**: /api/chat ne stream pas (S-01, S-02)
- **Blocker #2**: Boucle agentic loop déconnectée ou incomplète (S-03)
- **Claim API**: http://127.0.0.1:3000/api/tasks/claim
- **System Health**: 🟡 Maintenance Mode (Phase 0 in progress)

## 🧠 Protocol Reminder (Pour les Agents)
> **Règle d'Or** : Ne touchez PAS à ce fichier manuellement. Utilisez l'API claim.
> **Isolation** : Travaillez toujours dans `../worktrees/task-{id}`.
> **Claim** : `curl -X POST http://127.0.0.1:3000/api/tasks/claim -H "Content-Type: application/json" -d '{"taskId":"S-01","agentId":"WORKER-NOM"}'`

## 🔧 PHASE 0: SOUDURE (Semaine 1) — Fix What's Broken
> **Règle** : ZÉRO nouvelle feature. Uniquement réparer les connexions cassées.

- [IN PROGRESS: ARCHITECT] `S-01`: [Backend] Ajouter `.chatStream()` AsyncGenerator à UnifiedLLMService.ts
  - **Fichiers**: `proxy-bridge/src/lib/UnifiedLLMService.ts`
  - **Dépend de**: Rien
  - **Validation**: Test unitaire `UnifiedLLMService.test.ts` vérifiant le yield des chunks.
  - **Worker**: BACKEND

- [ ] `S-02`: [Backend] Convertir `/api/chat` de res.json() vers SSE streaming
  - **Fichiers**: `proxy-bridge/src/pages/api/chat.ts`
  - **Dépend de**: `S-01`
  - **Validation**: `curl -N -X POST http://127.0.0.1:3000/api/chat ...` doit afficher les chunks en temps réel.
  - **Worker**: BACKEND

- [ ] `S-03`: [Integration] Reconnecter AutonomousRunner à /api/chat et gérer le streaming agent
  - **Fichiers**: `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/pages/api/chat.ts`
  - **Dépend de**: `S-02`
  - **Validation**: L'agent doit pouvoir envoyer des messages intermédiaires via Socket.io pendant que le SSE stream le texte final.
  - **Worker**: INTEGRATION

- [ ] `S-04`: [Frontend] Unifier API_BASE sur le port 3000 partout
  - **Fichiers**: `dashboard/src/services/api.ts`, `dashboard/src/store/useAppStore.ts`, etc.
  - **Dépend de**: Rien
  - **Validation**: `grep -r ":3001" dashboard/src` ne doit rien renvoyer.
  - **Worker**: FRONTEND

- [ ] `S-05`: [Backend] Sécuriser ToolExecutor pour qu'il soit exclusivement server-side
  - **Fichiers**: `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Dépend de**: Rien
  - **Validation**: Vérifier qu'aucun appel direct à `fs` ou `child_process` n'est fait depuis Electron (preload.ts) sans passer par l'API.
  - **Worker**: BACKEND

- [ ] `S-06`: [Backend] Migration vers Paths.ts pour tous les chemins de fichiers (Finir TASK-ELEC-AUDIT)
  - **Fichiers**: `proxy-bridge/src/lib/Paths.ts` et usages.
  - **Dépend de**: Rien
  - **Validation**: Suppression des chemins "/home/fish" hardcodés restants.
  - **Worker**: BACKEND

- [ ] `S-07`: [Integration] Propagation des erreurs du ToolExecutor vers l'UI via Socket.io
  - **Fichiers**: `proxy-bridge/src/lib/ToolExecutor.ts`, `dashboard/src/hooks/useSocketEvents.ts`
  - **Dépend de**: Rien
  - **Validation**: Une erreur `run_shell` doit s'afficher en rouge dans le dashboard.
  - **Worker**: INTEGRATION

- [ ] `S-08`: [Backend] Brancher FileWatcher (chokidar) sur le broadcast global
  - **Fichiers**: `proxy-bridge/src/lib/FileWatcher.ts`
  - **Dépend de**: Rien
  - **Validation**: Modifier un fichier manuellement doit trigger un event `FILE_CHANGED` dans le dashboard.
  - **Worker**: BACKEND

## 🚀 PHASE 1: SOLO MODE COMPLET (Semaines 2-4)
- [ ] `P1-01`: [Frontend] Implémenter le streaming UI (Markdown partiel) dans le Composer
- [ ] `P1-02`: [Backend] Implémenter le résumé automatique de fin de session (Memory Flush)
- [ ] `P1-03`: [Frontend] Améliorer le Diff Viewer (Split-pane + Synchronized scrolling)
- [ ] `P1-04`: [Integration] Intégrer la dictée vocale Whisper (Ctrl+M)
- [ ] `P1-05`: [Frontend] Ajouter les Security Approvals UI pour les actions sensibles

## 📂 PHASE 2: FILESYSTEM & IPC (Abstraction Couche)
- [ ] `P2-01`: [Integration] Finaliser l'Hybridation (SystemService switch entre Electron/Web)
- [ ] `P2-02`: [Backend] Implémenter RepoClonerService utilisant simple-git
- [ ] `P2-03`: [Backend] CloudFSManager : Jail dans `~/.codex/workspaces`

## 🛠 PHASE 3: AGENTIC CAPABILITIES (Swarm Mode)
- [ ] `P3-01`: [Backend] ProjectTaskManager : Génération récursive de TASKS.md
- [ ] `P3-02`: [Backend] Recursive Runner : Boucle Plan -> Execute -> Fix
- [ ] `P3-03`: [Backend] Automation Scheduler (Visual Cron)
- [ ] `P3-08`: [Frontend] Inbox Triage System (Sidebar Triage section)
- [ ] `P3-09`: [Backend] GitHub Sync & Auto-Triage (Issue to Task conversion)
- [ ] `P3-10`: [Backend] Multi-Forge Support (GitHub/GitLab Adapter)

## 🧠 PHASE 4: ADVANCED FEATURES (Vision & Runtime)
- [ ] `P4-01`: [Backend] Browser Control / Live Eye (CDP Bridge)
- [ ] `P4-02`: [Integration] Deep Inspector & Runtime Bridge (React DevTools injection)
- [ ] `P4-09`: [Frontend] Migration complète vers Cupertino Flux Design System (Apple Aesthetic)
- [ ] `P4-10`: [Backend] Account Persistence (Hybrid local+server state sync)