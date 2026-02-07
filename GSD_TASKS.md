# 🐝 QUEEN BEE - GLOBAL STATUS & DISPATCH (GSD)
# Généré par : Architecte Agent
# Date : 2026-02-06
# Source : PRD v3 Ground Truth + Audit Forensique

## 📊 Status Global
- **Blocker #1**: /api/chat ne stream pas (S-01, S-02)
- **Blocker #2**: Boucle agentique déconnectée (S-03, S-08)
- **Claim API**: http://127.0.0.1:3000/api/tasks/claim

## 🧠 Protocol Reminder (Pour les Agents)
> **Règle d'Or** : Ne touchez PAS à ce fichier manuellement. Utilisez l'API claim.
> **Isolation** : Travaillez toujours dans `../worktrees/task-{id}`.
> **Claim** : `curl -X POST http://127.0.0.1:3000/api/tasks/claim -H "Content-Type: application/json" -d '{"taskId":"S-01","agentId":"WORKER-NOM"}'`

## 🔧 PHASE 0: SOUDURE (Semaine 1) — Fix What's Broken
> **Règle** : ZÉRO nouvelle feature. Uniquement réparer les connexions cassées.

- [DONE] `S-01`: [Backend] Ajouter `.chatStream()` AsyncGenerator à UnifiedLLMService.ts
  - **Fichiers**: `proxy-bridge/src/lib/UnifiedLLMService.ts`
  - **Dépend de**: Rien
  - **Validation**: `const stream = service.chatStream(msgs, 'anthropic'); for await (const c of stream) console.log(c)`
  - **Worker**: BACKEND

- [DONE] `S-02`: [Backend] Convertir `/api/chat` de res.json() vers SSE streaming
  - **Fichiers**: `proxy-bridge/src/pages/api/chat.ts`
  - **Dépend de**: `S-01`
  - **Validation**: `curl -N -X POST http://127.0.0.1:3000/api/chat ...` doit afficher les chunks en temps réel.
  - **Worker**: BACKEND

- [DONE] `S-03`: [Integration] Reconnecter AutonomousRunner à /api/chat et gérer le streaming agent (SSE)
  - **Fichiers**: `proxy-bridge/src/lib/AutonomousRunner.ts`, `proxy-bridge/src/pages/api/chat.ts`
  - **Dépend de**: `S-02`
  - **Validation**: L'agent doit pouvoir envoyer des messages intermédiaires via SSE pendant que le runner s'exécute.
  - **Worker**: INTEGRATION

- [IN PROGRESS: SOUDURE-11] `S-04`: [Frontend] Unifier API_BASE sur le port 3000 partout et supprimer les URL hardcodées
  - **Fichiers**: `dashboard/src/components/layout/Sidebar.tsx`, `dashboard/src/services/api.ts`
  - **Dépend de**: Rien
  - **Validation**: `grep -r "localhost:3000" dashboard/src` ne doit trouver que des usages de `API_BASE`.
  - **Worker**: FRONTEND

- [ ] `S-05`: [Backend] Sécuriser ToolExecutor pour qu'il soit exclusivement server-side
  - **Fichiers**: `proxy-bridge/src/lib/ToolExecutor.ts`
  - **Dépend de**: Rien
  - **Validation**: Aucun appel direct à `fs` depuis Electron (preload.ts) ne doit contourner l'API.
  - **Worker**: BACKEND

- [IN PROGRESS: SOUDURE-14] `S-06`: [Backend] Migration vers Paths.ts pour tous les chemins de fichiers
  - **Fichiers**: `proxy-bridge/src/lib/Paths.ts` et usages.
  - **Dépend de**: Rien
  - **Validation**: Plus aucun chemin "/Users/ndn18" ou "/home/fish" hardcodé.
  - **Worker**: BACKEND

- [IN PROGRESS: SOUDURE-12] `S-07`: [Integration] Propagation des erreurs du ToolExecutor vers l'UI via Socket.io
  - **Fichiers**: `proxy-bridge/src/lib/ToolExecutor.ts`, `dashboard/src/hooks/useSocketEvents.ts`
  - **Dépend de**: Rien
  - **Validation**: Une erreur `run_shell` doit s'afficher en rouge dans le dashboard via un event socket.
  - **Worker**: INTEGRATION

- [IN PROGRESS: BACKEND-01] `S-08`: [Backend] Réparer la boucle de FileWatcher (Backend -> Socket -> UI)
  - **Fichiers**: `proxy-bridge/src/lib/FileWatcher.ts`, `proxy-bridge/src/lib/EventLoopManager.ts`
  - **Dépend de**: Rien
  - **Validation**: Modifier un fichier trigger une mise à jour immédiate du Diff dans le dashboard sans boucle infinie.
  - **Worker**: BACKEND

- [DONE] `S-09`: [Frontend] Bugfix: Empêcher l'ajout de projets en double dans le Sidebar
  - **Fichiers**: `dashboard/src/store/useHiveStore.ts`
  - **Dépend de**: Rien
  - **Validation**: L'ajout d'un projet existant via l'UI ne crée pas de doublon dans la liste.
  - **Worker**: FRONTEND
  - **Note**: Code déjà implémenté, en attente de validation QA.

- [DONE] `S-10`: [Configuration] Enforce `gemini-1.5-flash` as the default LLM provider model.
  - **Fichiers**: `proxy-bridge/src/lib/providers/GeminiProvider.ts`
  - **Dépend de**: Rien
  - **Validation**: API calls fall back to valid `1.5-flash` endpoints even if `2.5` is requested.
  - **Worker**: BACKEND
  - **Note**: Modifié pour utiliser `1.5-flash` car `2.5` n'est pas encore dispo sur l'API publique. Smart routing ajouté pour flexibilité.

## 🚀 PHASE 1: SOLO MODE COMPLET (Semaines 2-4)
- [IN PROGRESS: INTEG-01] `P1-01`: [Frontend] Implémenter le streaming UI (Markdown partiel) dans le Composer
- [IN PROGRESS: BACKEND-01] `P1-02`: [Backend] Implémenter le résumé automatique de fin de session (Memory Flush)
- [DONE] `P1-03`: [Frontend] Améliorer le Diff Viewer (Split-pane + Synchronized scrolling)
- [ ] `P1-04`: [Integration] Intégrer la dictée vocale Whisper (Ctrl+M)
- [DONE] `P1-05`: [Frontend] Ajouter les Security Approvals UI pour les actions sensibles

## 📂 PHASE 2: FILESYSTEM & IPC (Abstraction Couche)
- [IN PROGRESS: INTEG-01] `P2-01`: [Integration] Finaliser l'Hybridation (SystemService switch entre Electron/Web)
- [DONE] `P2-02`: [Backend] Implémenter RepoClonerService utilisant simple-git
- [DONE] `P2-03`: [Backend] CloudFSManager : Jail dans `~/.codex/workspaces`

## 🛠 PHASE 3: AGENTIC CAPABILITIES (Swarm Mode)
- [DONE] `P3-01`: [Backend] ProjectTaskManager : Génération récursive de TASKS.md
- [ ] `P3-02`: [Backend] Recursive Runner : Boucle Plan -> Execute -> Fix
- [ ] `P3-03`: [Backend] Automation Scheduler (Visual Cron)
- [IN PROGRESS: INTEG-01] `P3-08`: [Frontend] Inbox Triage System (Sidebar Triage section)
- [ ] `P3-09`: [Backend] GitHub Sync & Auto-Triage (Issue to Task conversion)
- [ ] `P3-10`: [Backend] Multi-Forge Support (GitHub/GitLab Adapter)

## 🧠 PHASE 4: ADVANCED FEATURES (Vision & Runtime)
- [ ] `P4-01`: [Backend] Browser Control / Live Eye (CDP Bridge)
- [ ] `P4-02`: [Integration] Deep Inspector & Runtime Bridge (React DevTools injection)
- [IN PROGRESS: FRONTEND-01] `P4-09`: [Frontend] Migration complète vers Cupertino Flux Design System (Apple Aesthetic)
- [ ] `P4-10`: [Backend] Account Persistence (Hybrid local+server state sync)