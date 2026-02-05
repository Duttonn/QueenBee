# 🐝 QUEEN BEE - GLOBAL STATUS & DISPATCH (GSD)

## 📊 Status Global
- **System Health**: 🟢 Connected (Socket.io on port 3000)
- **Event Loop**: 🟡 Ready (Backend configured)
- **Worktree Engine**: 🟠 Ready (Backend only)

## 🧠 Protocol Reminder (Pour les Agents)
> **Règle d'Or** : Ne touchez PAS à ce fichier manuellement. Utilisez `claim_task(id)` via l'API.
> **Isolation** : Travaillez toujours dans `/worktrees/task-{id}`.

## 📋 Task List (Extract from PRD)

### 🏁 PHASE 0: BOOTSTRAP (Required for Protocol)
- [TESTED & VALIDATED: Antigravity] `TASK-00`: [Backend] Créer l'endpoint API `/api/tasks/claim` et le service `TaskManager` (basé sur `lib/db.ts` ou `InboxManager`) pour gérer le verrouillage des tâches.

### 🚀 PHASE 1: NERVOUS SYSTEM (Critical Path)
- [TESTED & VALIDATED: Antigravity] `TASK-01` (F-01): **Frontend Clean** - Supprimer les mocks dans `useHiveStore.ts`.
- [TESTED & VALIDATED: Antigravity] `TASK-02` (B-01): **Socket Init** - Configurer Socket.io serveur (port 3000) + CORS.
- [TESTED & VALIDATED: Antigravity] `TASK-03` (F-03): **Socket Hook** - Créer `useSocketEvents.ts` pour écouter `QUEEN_STATUS`.
- [TESTED & VALIDATED: WORKER-BEE-01] `TASK-04` (B-02): **Event Loop** - Connecter `EventLoopManager` au broadcast Socket.

### 📂 PHASE 2: FILESYSTEM & IPC
- [TESTED & VALIDATED: Antigravity] `TASK-05` (B-05): **Electron Bridge** - Exposer `fs` et `shell` dans `preload.ts`.
- [TESTED & VALIDATED: Antigravity] `TASK-06` (F-05): **Native Service** - Créer wrapper `NativeService.ts` (avec fallback Web).

### 🛠 PHASE 3: AGENTIC CAPABILITIES
- [TESTED & VALIDATED: Antigravity] `TASK-07` (B-03): **Tool Executor** - Implémenter le switch/case pour `write_file` et `run_shell`.
- [TESTED & VALIDATED: Antigravity] `TASK-08` (B-04): **Diff Watcher** - Lier `chokidar` -> `git_diff_extractor` -> Socket.

### 🔧 PHASE 4: API PORT MIGRATION (HOTFIX)
> **Contexte**: Le backend tourne sur port 3000, mais plusieurs fichiers frontend appellent encore le port 3001.

- [TESTED & VALIDATED: Antigravity] `TASK-09` (F-09): **API Base URL** - Changer `API_BASE` de 3001 à 3000 dans `useAppStore.ts` (ligne 42).
- [TESTED & VALIDATED: Antigravity] `TASK-10` (F-10): **API Service** - Changer `API_BASE` de 3001 à 3000 dans `services/api.ts` (ligne 7).
- [TESTED & VALIDATED: Antigravity] `TASK-11` (F-11): **Auth Components** - Changer port dans `LoginPage.tsx`, `AuthCallback.tsx`, `OnboardingFlow.tsx`.
- [TESTED & VALIDATED: Antigravity] `TASK-12` (F-12): **Sidebar GitHub** - Changer port dans `Sidebar.tsx` (ligne 213).
- [TESTED & VALIDATED: Antigravity] `TASK-13` (F-13): **Settings Panel** - Changer port dans `CustomizationPanel.tsx` (ligne 44).

### 🚀 PHASE 5: ADVANCED CAPABILITIES (Gap Analysis)
- [TESTED & VALIDATED: Antigravity] `TASK-14` (F-14): **Integrated Terminal** - Implémenter le tiroir terminal avec Xterm.js lié au WebSocket `/api/terminal/shell`.
- [TESTED & VALIDATED: Antigravity] `TASK-15` (B-15): **IDE Sync Hook** - Implémenter `IDESyncHook.ts` pour détecter le focus de fichier via l'accessibilité macOS.
- [TESTED & VALIDATED: Antigravity] `TASK-16` (F-16): **Voice Transcription** - Intégrer Whisper (Ctrl+M) pour la dictée vocale dans le Composer.
- [TESTED & VALIDATED: Antigravity] `TASK-17` (F-17): **Visual Verification** - Ajouter l'outil de capture d'écran et l'analyse visuelle via Kimi/NVIDIA.
- [TESTED & VALIDATED: Antigravity] `TASK-18` (F-18): **Security Approvals** - Créer l'UI de confirmation pour les actions sensibles (write_file, run_shell).

### 🔧 PHASE 6: GITHUB OAUTH PORT FIX (HOTFIX)
> **Contexte**: Le callback GitHub OAuth utilise le port 3001 au lieu de 3000.

- [TESTED & VALIDATED: Antigravity] `TASK-19` (B-19): **GitHub OAuth Callback** - Corriger le port 3001→3000 dans `auth/github/index.ts` et `auth-manager.ts`.

### ☁️ PHASE 7: QUEEN BEE CLOUD (Headless Workspaces)
- [x] `TASK-20` (B-20): **RepoClonerService** - Implémenter le service de clonage côté serveur (simple-git) utilisant le token OAuth.
- [x] `TASK-21` (B-21): **CloudFSManager** - Créer un gestionnaire de fichiers pour les workspaces distants (Jail in `/tmp/workspaces`).
- [x] `TASK-22` (B-22): **API URL Import** - Créer l'endpoint `POST /api/projects/import-url` pour initialiser un workspace cloud.
- [x] `TASK-23` (B-23): **Hybrid Path Resolver** - Adapter l'orchestrateur pour basculer entre paths locaux (Mac) et paths serveurs (Cloud).
- [x] `TASK-24` (F-24): **Cloud UI Integration** - Permettre l'import via URL dans la Sidebar et afficher le statut "Cloud Workspace".

