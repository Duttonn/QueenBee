# 🐝 QUEEN BEE - GLOBAL STATUS & DISPATCH (GSD)

## 📊 Status Global
- **System Health**: 💀 Disconnected
- **Event Loop**: 🔴 Inactive
- **Worktree Engine**: 🟠 Ready (Backend only)

## 🧠 Protocol Reminder (Pour les Agents)
> **Règle d'Or** : Ne touchez PAS à ce fichier manuellement. Utilisez `claim_task(id)` via l'API.
> **Isolation** : Travaillez toujours dans `/worktrees/task-{id}`.

## 📋 Task List (Extract from PRD)

### 🏁 PHASE 0: BOOTSTRAP (Required for Protocol)
- [ ] `TASK-00`: [Backend] Créer l'endpoint API `/api/tasks/claim` et le service `TaskManager` (basé sur `lib/db.ts` ou `InboxManager`) pour gérer le verrouillage des tâches.

### 🚀 PHASE 1: NERVOUS SYSTEM (Critical Path)
- [IN PROGRESS: AGENT-ZERO] `TASK-01` (F-01): **Frontend Clean** - Supprimer les mocks dans `useHiveStore.ts`.
- [ ] `TASK-02` (B-01): **Socket Init** - Configurer Socket.io serveur (port 3001) + CORS.
- [ ] `TASK-03` (F-03): **Socket Hook** - Créer `useSocketEvents.ts` pour écouter `QUEEN_STATUS`.
- [ ] `TASK-04` (B-02): **Event Loop** - Connecter `EventLoopManager` au broadcast Socket.

### 📂 PHASE 2: FILESYSTEM & IPC
- [ ] `TASK-05` (B-05): **Electron Bridge** - Exposer `fs` et `shell` dans `preload.ts`.
- [ ] `TASK-06` (F-05): **Native Service** - Créer wrapper `NativeService.ts` (avec fallback Web).

### 🛠 PHASE 3: AGENTIC CAPABILITIES
- [ ] `TASK-07` (B-03): **Tool Executor** - Implémenter le switch/case pour `write_file` et `run_shell`.
- [ ] `TASK-08` (B-04): **Diff Watcher** - Lier `chokidar` -> `git_diff_extractor` -> Socket.


