# 🐝 QUEEN BEE - SYNTHÈSE BACKEND & PRD DE CONVERGENCE FRONTEND-BACKEND

> **Document Unifié** : Architecture Backend + Plan de Soudure UI-Backend  
> **Version** : 2.0 - Février 2026  
> **Objectif** : Transformer Queen Bee d'une collection de composants isolés en un écosystème réactif et intégré

---

# PARTIE 1 : SYNTHÈSE COMPLÈTE DU BACKEND

## 📁 Structure Générale

```
proxy-bridge/src/
├── middleware.ts           # Middleware CORS global
    ├── providers/          # Test des providers IA
    └── terminal/           # Terminal PTY en temps réel
```

---

## 🔧 Middleware (`middleware.ts`)

Middleware Next.js qui intercepte toutes les requêtes `/api/*` :
- Gère les requêtes CORS preflight (OPTIONS)
- Ajoute les headers CORS à toutes les réponses API
- Headers: `Access-Control-Allow-Origin: *`
- Methods: `GET/POST/PUT/DELETE/OPTIONS`
- Headers autorisés: `Content-Type`, `Authorization`, `X-Codex-Provider`

---

## 📦 Modules LIB (Services & Managers)

### 🎯 Orchestration Core

#### `HiveOrchestrator.ts`
Le "GLUE" central - Connecte Worktrees, Environment, Watching, Shipping.

```typescript
class HiveOrchestrator {
  // Dépendances: WorkTreeManager, UniversalForgeAdapter, Socket.io

  async startFeatureWorkflow(projectId, featureName, sourcePath) {
    // 1. Crée une branche isolée: `gsd-${featureName}-${timestamp}`
    // 2. Setup l'environnement automatiquement (npm install, etc.)
    // 3. Attache le monitoring temps réel (AutoContextManager)
    // Retourne: { treePath, branchName }
  }

  async shipAndCleanup(treePath, repoPath, prTitle, prBody) {
    // 1. Crée la PR via ForgeAdapter
    // 2. Nettoie le worktree éphémère
    // Émet: WORKFLOW_COMPLETE avec l'URL de la PR
  }
}
```

#### `EventLoopManager.ts`
Le "SYSTÈME NERVEUX" - Gère la continuité logique UI ↔ Backend.

```typescript
class EventLoopManager {
  // Écoute les événements Socket.io et orchestre les réponses

  // CMD_SUBMIT: Quand l'utilisateur soumet un prompt dans la Global Bar
  //   → Émet QUEEN_STATUS (thinking) → Dispatch via UniversalDispatcher
  //   → Émet UI_UPDATE (SPAWN_AGENT_UI) pour créer l'UI de l'agent

  // FILE_CHANGE_DETECTED: Quand un fichier est modifié par un agent
  //   → Émet UI_UPDATE (UPDATE_LIVE_DIFF) pour rafraîchir le Diff View

  // AGENT_CODE_COMPLETE: Quand l'agent finit son implémentation
  //   → Émet UI_UPDATE (SET_AGENT_STATUS: verifying, OPEN_REVIEW_PANE)
}
```

#### `UniversalDispatcher.ts`
Logique du CMD+K BAR - Décide entre Search et Command.

```typescript
class UniversalDispatcher {
  async dispatch(input, activeProjectPath) {
    // Détection heuristique: mots-clés d'action = create, build, fix, add, implement...
    if (isAction) {
      // → Démarre un workflow via HiveOrchestrator
      socket.emit('DISPATCH_TYPE', { type: 'ACTION' })
    } else {
      // → Recherche dans le codebase
      socket.emit('DISPATCH_TYPE', { type: 'SEARCH' })
      socket.emit('SEARCH_RESULTS', results)
    }
  }
}
```

#### `OrchestrationVisualizer.ts`
Animation UI de la "pensée" de Queen Bee.

```typescript
class OrchestrationVisualizer {
  async executeVisualPlan(complexCommand, projectPaths) {
    // Pour chaque projet:
    // 1. ORCH_STEP: PEEKING (scanning codebase)
    // 2. ORCH_STEP: DRAFTING (synthesizing super-prompt)
    // 3. ORCH_STEP: SPAWNING (deploying Worker Bee)
    // 4. Délai artificiel 800ms pour que l'utilisateur "voit" les clics
    // Émet: ORCH_VISUAL_START → ORCH_STEP(s) → ORCH_VISUAL_COMPLETE
  }
}
```

---

### 🔐 Authentification

#### `auth-manager.ts`
Gestionnaire OAuth multi-provider (Google principalement).

```typescript
class AuthManager {
  // OAuth Google avec PKCE (Code Verifier/Challenge)

  static async initiateOAuth(provider) {
    // Génère state, codeVerifier, codeChallenge
    // Construit l'URL d'autorisation Google
    // Scopes: openid, email, profile, cloud-platform
  }

  static async exchangeCodeForToken(provider, code, codeVerifier) {
    // Échange le code contre access_token + refresh_token
    // Décode l'ID token JWT pour extraire l'email
    // Sauvegarde le profil via AuthProfileStore
  }

  static async refreshProfile(profileId) {
    // Rafraîchit le token Google expiré
  }

  static async addStaticToken(provider, token, alias) {
    // Ajoute un token statique (Gemini CLI, Claude, etc.)
  }
}
```

#### `auth-profile-store.ts`
Stockage des profils d'auth dans `~/.queenbee/auth-profiles.json`.

```typescript
interface AuthProfile {
  id: string              // ex: "google:user@email.com"
  provider: string        // google, anthropic, etc.
  mode: 'api_key' | 'oauth' | 'token'
  access?: string         // OAuth access token
  refresh?: string        // OAuth refresh token
  expires?: number        // Timestamp expiration
  apiKey?: string         // Clé API statique
  token?: string          // Token statique
}

class AuthProfileStore {
  // CRUD sur ~/.queenbee/auth-profiles.json
  // Permissions: 0o600 (lecture/écriture owner uniquement)
  static getProfile(profileId)
  static saveProfile(profile)
  static listProfiles()
  static deleteProfile(profileId)
}
```

#### `auth-store.ts`
Stockage simple du token GitHub dans `~/.queenbee/github-token.json`.

```typescript
async function saveToken(token)    // Permissions 0o600
async function getToken(): string | null
async function deleteToken()
```

#### `github-auth-manager.ts`
Stratégie hybride d'auth GitHub.

```typescript
class GitHubAuthManager {
  static isLocalMac(): boolean {
    // Détecte si on est sur macOS (darwin)
  }

  static async initiateLogin(redirectUri) {
    // HYBRIDE:
    // - macOS local → Web Flow (redirect) pour meilleure UX
    // - VPS/Linux → Device Flow (code à copier-coller)
    // Scopes: user:email, read:user, repo, workflow, read:org, gist
  }

  static async pollForToken(deviceCode) {
    // Polling pour Device Flow
  }
}
```

#### `GitHubAuthManager.ts` (autre version)
Version simplifiée pour environnement remote vs natif.

```typescript
class GitHubAuthManager {
  async initiateLogin(isRemote: boolean) {
    if (isRemote) {
      return { type: 'DEVICE_FLOW', url: 'https://github.com/login/device' }
    } else {
      return { type: 'OAUTH_FLOW', url: '...' }
    }
  }
}
```

#### `Keyring.ts`
Keyring multi-comptes pour credentials.

```typescript
class MultiAccountKeyring {
  private storagePath = '/home/fish/.codex/auth.json'

  async getCredentials(provider, accountId)
  async saveCredentials(profile)
}
```

---

### ⚙️ Configuration

#### `config-manager.ts`
Gestion de `~/.queenbee/config.yaml`.

```typescript
interface QueenBeeConfig {
  name?: string
  version?: string
  models: ModelConfig[]           // Liste des modèles IA configurés
  experimental?: {
    modelContextProtocolServers?: MCPConfig[]  // Serveurs MCP
  }
  index?: { embedModel, paths }   // Configuration d'embedding
  context?: Array<{ provider }>   // Providers de contexte (file, code, diff...)
}

interface ModelConfig {
  name: string
  provider: 'openai' | 'mistral' | 'ollama' | 'anthropic'
  model: string
  apiBase?: string
  roles?: string[]                // chat, edit, apply, autocomplete
  capabilities?: string[]         // tool_use
  systemMessage?: string
  defaultCompletionOptions?: { contextLength, temperature, maxTokens }
  requestOptions?: { headers }    // Headers custom (ex: Cookie Dassault)
}

class ConfigManager {
  static async getConfig()        // Lit ou crée config par défaut
  static async saveConfig(config)
  static async addModel(model)
}

// CONFIG PAR DÉFAUT inclut:
// - "visionOS Expert" (Dassault proxy, 130k context)
// - "Devstral (Dassault)" (Mistral via Dassault)
// - "Nomic Embed" (Ollama local)
// - MCP Server visionOS
```

#### `ConfigLoader.ts`
Charge les configs YAML/JSON depuis `../config/local/`.

```typescript
class ConfigLoader {
  async loadLocalConfigs()              // Lit tous les .yaml/.json
  async getDassaultHeaders(modelName)   // Récupère headers custom pour Dassault
}
```

#### `PortableConfigManager.ts`
Snapshots portables offline-first (fichiers `.hive`).

```typescript
class PortableConfigManager {
  private configPath = '/home/fish/.codex/hive_state.json'
  private backupDir = '/home/fish/clawd/backups'

  async exportSnapshot() {
    // Crée hive_backup_${timestamp}.hive
    // Format: { version, exportedAt, data }
  }

  async importSnapshot(snapshotData) {
    // Restaure depuis un fichier .hive
  }
}
```

---

### 📂 Gestion Git & Worktrees

#### `WorkTreeManager.ts`
Gestion du cycle de vie des worktrees git éphémères.

```typescript
class WorkTreeManager {
  private baseDir = '../worktrees'

  async create(projectId, branchName, sourcePath) {
    // 1. git worktree add -b ${branchName} ${treePath}
    // 2. Fallback rsync si git worktree échoue
    // 3. Exécute .codex/setup.sh si présent
    return treePath
  }

  async cleanup(treePath) {
    // git worktree remove ${treePath}
    // Fallback: fs.remove
  }
}
```

#### `ConflictResolver.ts`
Résolution automatique de conflits git via LLM.

```typescript
class ConflictResolver {
  async solve(projectPath, filePath) {
    // 1. Lit les marqueurs de conflit
    // 2. Génère prompt pour raisonnement LLM
    // 3. Applique le "Smart Merge"
    return { status: 'pending', resolved: false }
  }
}
```

#### `ForgeAdapter.ts`
Adapter pour les opérations Git Forge (création de PR, etc.).

---

---

### 🔗 Forge & Intégration Git

#### `ForgeAdapter.ts`
Adaptateur universel GitHub/GitLab via CLI (gh/glab).

```typescript
class UniversalForgeAdapter {
  async listGitHubRepos(user) {
    // gh repo list ${user} --limit 50 --json name,url,description,sshUrl
  }

  async cloneProject(repoUrl, targetPath) {
    // git clone ${repoUrl} ${targetPath}
  }

  async createPR(repoPath, title, body) {
    // gh pr create --title "..." --body "..."
  }
}
```

---

### 🔍 Contexte & Indexation

#### `ContextScraper.ts`
"L'œil de reconnaissance" de Queen Bee.

```typescript
class ContextScraper {
  async scrape(projectPath) {
    // 1. Extrait README.md (premiers 2000 chars)
    // 2. Identifie tous les TODO: et FIXME: dans le code
    // 3. Détecte la tech stack
    return { readme, todos: [{file, line, text}], techStack }
  }
}
```

#### `AutoContextManager.ts`
Gestion automatique du contexte projet.

```typescript
class AutoContextManager {
  // Combine FileWatcher + ContextScraper

  async focusProject(projectPath) {
    // 1. Arrête le watcher précédent
    // 2. Démarre nouveau watcher
    // 3. Scan initial profond via ContextScraper
    return this.activeContext
  }
}
```

#### `RepoContextAggregator.ts`
Pack un repo entier en contexte texte structuré.

```typescript
class RepoContextAggregator {
  private ignoreList = ['node_modules', '.git', 'dist', 'build', '.next']

  async aggregate(repoPath, maxFiles = 100) {
    // Format de sortie:
    // REPOSITORY_CONTEXT: ${projectName}
    // STRUCTURE: (output de tree -L 2)
    // --- FILE: src/App.tsx ---
    // (contenu)
    // Extensions incluses: .ts, .tsx, .js, .jsx, .swift, .py, .md, .json, .yaml, .h, .m, .cpp
  }
}
```

#### `FastIndexer.ts`
Indexation ultra-rapide via ripgrep (rg) et find.

```typescript
class FastIndexer {
  async search(query, projectPath) {
    // 1. Recherche par nom de fichier: find -iname "*query*"
    // 2. Recherche par contenu: rg --line-number --smart-case "query"
    return {
      files: ['path/to/file.ts'],
      snippets: [{ file, line, preview }]
    }
  }
}
```

---

### 📡 Communication Temps Réel

#### `FileWatcher.ts`
Surveillance des fichiers via chokidar.

```typescript
class FileWatcher {
  start(projectPath) {
    // chokidar.watch avec ignore des dotfiles
    // Émet FILE_CHANGE { path, timestamp } sur changement
  }
  stop()
}
```

#### `BrowserRelay.ts`
Contrôle du navigateur en temps réel via CDP.

```typescript
class BrowserRelay {
  async attachToTab(tabId) {
    // Initie handshake CDP
    socket.emit('BROWSER_ATTACHED', { tabId, url })
  }

  async captureSnapshot() {
    // Retourne aria-tree + screenshot base64
  }

  async performAction(kind: 'click' | 'type', selector, value?) {
    // Mappe vers commandes CDP
  }
}
```

#### `IDESyncHook.ts`
Synchronisation avec IDE (VSCode/Xcode).

```typescript
class IDESyncHook {
  // Écoute IDE_FOCUS_CHANGE depuis l'app Mac ou extension VSCode
  // Stocke le fichier courant
  // Émet UI_UPDATE (UPDATE_AUTO_CONTEXT) pour l'agent
}
```

#### `NativeNotificationBridge.ts`
Notifications système vers l'app Mac.

```typescript
class NativeNotificationBridge {
  send(title, body, urgency: 'normal' | 'high') {
    socket.emit('NATIVE_NOTIFICATION', { title, body, urgency, timestamp })
  }
}
```

---

### 🤖 Agents Autonomes

#### `AutonomousRunner.ts`
Prompt système pour mode autonome.

```typescript
export const AUTONOMOUS_SYSTEM_PROMPT_INJECT = `
# AUTONOMY DIRECTIVE
1. Tu es un worker autonome de haute confiance
2. NE JAMAIS s'arrêter pour poser des questions. Si info manquante → ASSUMPTION professionnelle
3. Objectif: solution finie, testée, qui compile
4. Continue les tool calls jusqu'à vérification complète
5. À la fin: liste les assumptions sous '🧠 ASSUMPTIONS'
6. Si échec: rapporter seulement après avoir épuisé toutes les solutions logiques
`
```

#### `VisualVerificationEngine.ts`
QA autonome avec vérification visuelle.

```typescript
class VisualVerificationEngine {
  async verifyTask(projectName, visualExpectation, testScenario?) {
    // 1. Phase Interactive: exécute scénario de test si fourni
    //    → RuntimeBridge.executeRuntimeAction('RUN_SCENARIO', script)
    // 2. Vérification d'état: check état interne de l'app
    // 3. Phase Visuelle: analyse screenshot via ScreenshotAnalyzer
    // Émet: VERIFICATION_START → VERIFICATION_SUCCESS/FAILURE
  }
}
```

#### `ScreenshotAnalyzer.ts`
Bridge visionOS-MCP + Vision LLM.

```typescript
class ScreenshotAnalyzer {
  async verifyUIChange(expectation) {
    // 1. Capture via MCPBridge.getScreenshot()
    // 2. Analyse vision (Kimi ou NVIDIA NIM)
    return { success, analysis, timestamp }
  }
}
```

#### `RuntimeBridge.ts`
Inspecteur "Atlas-grade" pour apps en cours d'exécution.

```typescript
class RuntimeBridge {
  async inspectElement(componentId) {
    // Lie un élément UI à son code source
    socket.emit('RUNTIME_QUERY', { action: 'GET_SOURCE', id })
    return { file: 'src/Header.tsx', line: 42, props }
  }

  async executeRuntimeAction(action, params) {
    // Exécute action de test dans l'app
    socket.emit('RUNTIME_EXEC', { action, params })
  }
}
```

#### `AccessibilityAgent.ts`
Audit d'accessibilité UI via screenshots.

```typescript
class AccessibilityAgent {
  async auditUI(projectName) {
    // 1. Capture via ScreenshotAnalyzer
    // 2. Détecte contraste couleur, labels manquants
    return {
      status: 'success',
      findings: [{ type: 'CONTRAST', severity: 'low', element, message }]
    }
  }
}
```

---

### 🔒 Sécurité

#### `SecurityAuditAgent.ts`
Audit de sécurité: détection de credentials leakées.

```typescript
class SecurityAuditAgent {
  private sensitivePatterns = [
    /nvapi-[a-zA-Z0-9]{32,}/g,        // NVIDIA API Keys
    /AIzaSy[a-zA-Z0-9_-]{33}/g,       // Google AI Keys
    /sk-[a-zA-Z0-9]{48}/g,            // OpenAI keys
    /session_sda=[a-f0-9-]{36}/g,     // Dassault Session Cookies
    /ghp_[a-zA-Z0-9]{36}/g            // GitHub PATs
  ]

  async auditProject(projectPath) {
    // Scanne .ts, .js, .yaml, .json, .md
    // Retourne findings: [{ file, risk: 'CRITICAL', type, pattern }]
  }
}
```

---

### 🔌 Providers & Bridges

#### `MCPBridge.ts`
Gateway pour serveurs Model Context Protocol.

```typescript
class MCPBridge {
  async callTool(serverName, toolName, args) {
    // Route vers visionOS-MCP ou autres serveurs locaux
    return { status: 'success', result }
  }

  async getScreenshot() {
    return this.callTool('visionOS-MCP', 'screenshot', {})
  }
}
```

#### `KimiAdapter.ts`
Adaptateur pour Moonshot AI (Kimi).

```typescript
class KimiAdapter {
  private apiKey = process.env.KIMI_API_KEY

  async chat(messages) {
    // POST https://api.moonshot.cn/v1/chat/completions
    // Model: moonshot-v1-8k, temperature: 0.3
  }
}
```

#### `github-client.ts`
Client GitHub via Octokit.

```typescript
function createGitHubClient(accessToken) → Octokit

async function listRepos(octokit)
async function getRepoContents(octokit, owner, repo, path)
async function createBranch(octokit, owner, repo, branchName, fromBranch)
async function createCommit(octokit, owner, repo, branch, message, files)
async function createPullRequest(octokit, owner, repo, title, body, head, base)
```

---

### 🎤 Voice & Transcription

#### `WhisperTranscriber.ts`
Transcription via OpenAI Whisper API.

```typescript
class WhisperTranscriber {
  async transcribe(audioPath) {
    // POST https://api.openai.com/v1/audio/transcriptions
    // Model: whisper-1, Format: FormData
    return response.data.text
  }
}
```

#### `VoiceTranscription.ts`
Bridge push-to-talk (version simplifiée/mock).

```typescript
class VoiceTranscription {
  async transcribe(audioPath) {
    // Appelle endpoint Whisper local ou API
    return "Successfully transcribed: ..."
  }
}
```

---

### 📊 Monitoring & Persistence

#### `db.ts`
Base de données JSON simple (`./data/queenbee.json`).

```typescript
interface Database {
  automations: Automation[]  // { id, title, description, schedule, active, script, lastRun }
  skills: Skill[]            // { id, title, description, installed, type: 'mcp'|'custom'|'plugin' }
  projects: Project[]        // { name, path, threads: [{ id, title, diff, time }] }
}

function getDb(): Database
function saveDb(db: Database)

// DEFAULT DATA:
// - Automation "Daily Summary" (cron 0 9 * * *)
// - Automation "Auto-Review PRs"
// - Skill "Figma MCP"
// - Skill "Skill Creator"
```

#### `AccountStateManager.ts`
Persistance états Hive par utilisateur.

```typescript
class AccountStateManager {
  private baseDir = '/home/fish/.codex/user_states'

  async saveState(userId, state)   // ${userId}.json
  async loadState(userId)          // Hydrate depuis fichier
}
```

#### `TerminalSessionManager.ts`
Persistance historique terminal.

```typescript
class TerminalSessionManager {
  private historyDir = '../data/terminal_history'

  async saveSession(threadId, history)  // ${threadId}.log
  async loadSession(threadId)
}
```

#### `InboxManager.ts`
Système de triage pour findings des agents.

```typescript
class InboxManager {
  async addFinding(agentId, title, content) {
    // Ajoute à ../data/inbox.json
    // Format: { id, agentId, title, content, status: 'unread', timestamp }
  }
  async getFindings()
}
```

#### `HealthCheck.ts`
Vérification santé système.

```typescript
class HealthCheck {
  async verifySystem() {
    return { status: 'healthy', socket: 'connected', disk: 'ok', memory: 'ok' }
  }
}
```

#### `PerfMonitor.ts`
Monitoring ressources VPS.

```typescript
class PerfMonitor {
  async runAudit(projectPath) {
    // 1. Check load CPU: uptime
    // 2. Taille node_modules: du -sh
    return { timestamp, cpuUsage, memoryUsage, nodeModulesSize, warnings }
  }
}
```

---

### 🌍 Environment Management

#### `LocalEnvironmentManager.ts`
Setup automatique de l'environnement de dev.

```typescript
class LocalEnvironmentManager {
  async runSetup() {
    // 1. Détecte stack:
    //    - package.json → npm install
    //    - requirements.txt → python3 -m venv + pip install
    // 2. Exécute .codex/setup.sh si présent
  }
}
```

---

### 🐍 Scripts Python

#### `git_diff_extractor.py`
Extraction structurée des diffs git en JSON.

```python
def get_git_diff(project_path, file_path=None):
    # Exécute: git diff --unified=3 [file_path]
    # Parse les marqueurs @@ pour numéros de ligne
    # Retourne:
    # {
    #   "status": "success",
    #   "file": "path/to/file.ts",
    #   "diff": [
    #       { "line": 42, "type": "add"|"del"|"neutral", "content": "..." }
    #   ]
    # }
```

#### `log_tailer.py`
Monitoring temps réel de fichiers log.

```python
def tail_logs(log_path):
    # Ouvre le fichier et lit les nouvelles lignes en continu
    # Format: [HH:MM:SS] log_message
    # Usage: tailing generation.log de BlackJackAdvisor
```

---

## 🔑 Points Clés de l'Architecture

| Composant | Rôle | Fichier de config |
|-----------|------|-------------------|
| **HiveOrchestrator** | Coordination centrale des workflows | - |
| **EventLoopManager** | Bridge Socket.io UI ↔ Backend | - |
| **UniversalDispatcher** | Routage Search vs Action | - |
| **AuthManager** | OAuth multi-provider | `~/.queenbee/auth-profiles.json` |
| **ConfigManager** | Configuration globale | `~/.queenbee/config.yaml` |
| **WorkTreeManager** | Isolation git par feature | `../worktrees/` |
| **AutoContextManager** | Surveillance & contexte projet | - |
| **MCPBridge** | Gateway vers serveurs MCP | - |
| **VisualVerificationEngine** | QA autonome avec vision | - |
| **SecurityAuditAgent** | Détection credentials leakées | - |
| **db.ts** | Persistance locale | `./data/queenbee.json` |

---

## 🌐 Providers IA Supportés

1. **OpenAI** - API standard + Whisper transcription
2. **Anthropic** - Claude API
3. **Mistral** - Via Dassault ou direct
4. **Ollama** - Modèles locaux
5. **Dassault Proxy** - visionOS Expert (headers custom avec Cookie)
6. **Moonshot/Kimi** - API moonshot-v1-8k
7. **NVIDIA NIM** - Vision analysis

---

## 📡 Événements Socket.io Principaux

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `CMD_SUBMIT` | Client → Server | Soumission d'un prompt |
| `QUEEN_STATUS` | Server → Client | État de Queen Bee (thinking, etc.) |
| `DISPATCH_TYPE` | Server → Client | Type de dispatch (ACTION/SEARCH) |
| `SEARCH_RESULTS` | Server → Client | Résultats de recherche |
| `UI_UPDATE` | Server → Client | Mise à jour UI (SPAWN_AGENT_UI, UPDATE_LIVE_DIFF, UPDATE_AUTO_CONTEXT) |
| `ORCH_STEP` | Server → Client | Étape d'orchestration visuelle |
| `WORKFLOW_COMPLETE` | Server → Client | Fin de workflow avec URL PR |
| `FILE_CHANGE` | Server → Client | Fichier modifié (path, timestamp) |
| `BROWSER_ATTACHED` | Server → Client | Navigateur connecté via CDP |
| `RUNTIME_QUERY` | Server → Client | Requête inspection élément UI |
| `RUNTIME_EXEC` | Server → Client | Exécution action de test |
| `NATIVE_NOTIFICATION` | Server → Client | Notification système Mac |
| `VERIFICATION_START/SUCCESS/FAILURE` | Server → Client | États vérification visuelle |
| `IDE_FOCUS_CHANGE` | Client → Server | Changement de fichier dans IDE |

---

## 🗂 Structure des Données Persistées

```
./data/
├── queenbee.json           # DB principale (automations, skills, projects)
├── inbox.json              # Findings des agents
└── terminal_history/       # Logs des sessions terminal
    └── {threadId}.log

~/.queenbee/
├── config.yaml             # Configuration globale
├── auth-profiles.json      # Profils OAuth (permissions 0o600)
└── github-token.json       # Token GitHub

~/.codex/
├── auth.json               # Keyring multi-comptes
├── hive_state.json         # État portable
└── user_states/            # États par utilisateur
    └── {userId}.json

/home/fish/clawd/backups/   # Snapshots .hive
```




## 🌍 ENVIRONMENT MANAGEMENT

`TS LocalEnvironmentManager.ts`

```typescript
class LocalEnvironmentManager {
  async runSetup() {
    // 1. Détecte stack:
    //    - package.json -> npm install
    //    - requirements.txt -> python3 -m venv + pip install
    // 2. Exécute .codex/setup.sh si présent
  }
}

```

---

## 🐍 SCRIPTS PYTHON

`🔹 git_diff_extractor.py`

```python
# Extraction structurée des diffs git en JSON
def get_git_diff(project_path, file_path=None):
    # Exécute: git diff --unified=3 [file_path]
    # Parse les marqueurs @@ pour numéros de ligne
    # Retourne:
    # {
    #   "status": "success",
    #   "file": "path/to/file.ts",
    #   "diff": [
    #     { "line": 42, "type": "add"|"del"|"neutral", "content": "..." }
    #   ]
    # }

```

`🔹 log_tailer.py`

```python
# Monitoring temps réel de fichiers log
def tail_logs(log_path):
    # Ouvre le fichier et lit les nouvelles lignes en continu
    # Format: [HH:MM:SS] log_message
    # Usage: tailing generation.log de BlackJackAdvisor

```

`🔹 queen_bee_recon.py`

```python
# Script de reconnaissance pour Queen Bee
def peek_project(path):
    # Vérifie l'existence de: README, package.json, main.py, main.swift
    # Extrait les 50 premières lignes des fichiers clés

def synthesize_prompt(user_intent, project_data):
    # Génère un prompt amélioré pour l'agent
    # "Synthesized Prompt for Agent: Context: {...}, Action: {...}, Constraint: Maintain architectural consisten..."

```

`🔹 relay_manager.py`

```python
# Gestion du "Relay Buffer" pour succession de modèles
RELAY_CACHE = "/home/fish/clawd/projects/codex-clone/sessions/relay_cache.json"

def create_snapshot(project_id, agent_id, summary, files_touched):
    # Capture l'essence d'une session avant swap de modèle
    # Format: { timestamp, project_id, last_agent, distilled_context, active_files, status }

def get_relay_prompt(project_id):
    # Génère le system prompt pour le modèle entrant
    # "# RELAY CONTEXT (from claude-4.5-opus)
    # ## Distilled Summary: ...
    # ## Modified Files: ...
    # Resume the task immediately based on this state."

```

---

## 🌐 API ENDPOINTS (`pages/api/`)

### CHAT & PROVIDERS

`POST /api/chat`

```javascript
// Proxy LLM avec fallback automatique
// Stratégie de providers (dans l'ordre):
// 1. Header X-Codex-Provider si spécifié
// 2. NVIDIA (si NVIDIA_API_KEY)
// 3. Gemini (si GEMINI_API_KEY)
// 4. Ollama (localhost:11434)
// 5. Mock (fallback garanti)

// Supporte streaming SSE
// Transforme automatiquement format Gemini -> OpenAI

// Request: { model, messages, stream }
// Response: OpenAI-compatible chat completion

```

`POST /api/providers/test`

```javascript
// Test réel de connexion aux providers IA
// Providers supportés: openai, anthropic, gemini, nvidia, ollama, azure, custom

// Pour chaque provider:
// - Valide format de clé API (sk-, sk-ant-, nvapi-)
// - Fait une vraie requête de test
// - Retourne liste des modèles disponibles

// Response: { success, provider, message, models[], error? }

```

### AUTHENTIFICATION

`GET /api/auth/github`

```javascript
// Initie le flow OAuth GitHub
// Stratégie hybride via GitHubAuthManager:
// - macOS -> Web Flow (redirect)
// - VPS -> Device Flow (code à copier)

// Response: { type: 'redirect'|'device_flow', url, state?, user_code?, device_code? }

```

`GET /api/auth/github/callback`

```javascript
// Callback OAuth GitHub
// 1. Échange code -> access_token
// 2. Fetch user profile, emails, orgs, repos
// 3. Sauvegarde token via auth-store
// 4. Redirect vers dashboard avec auth_data encodé en URL

```

`POST /api/auth/github/poll`

```javascript
// Polling pour Device Flow GitHub
// Request: { device_code }
// Response: { status: 'complete'|'pending', access_token?, user?, error? }

```

`POST /api/auth/github/setup`

```javascript
// Sauvegarde les credentials OAuth dans .env.local
// Request: { clientId, clientSecret }
// Met à jour process.env pour prise en compte immédiate

```

`GET /api/auth/login?provider=google`

```javascript
// Initie OAuth Google avec PKCE
// Stocke codeVerifier en cookie HTTP-only
// Redirect vers Google OAuth

```

`GET /api/auth/callback`

```javascript
// Callback OAuth Google
// Échange code + codeVerifier -> tokens
// Sauvegarde profil, redirect vers dashboard

```

`GET/POST/DELETE /api/auth/profiles`

```javascript
// CRUD profils d'authentification
// GET: Liste profils (sans secrets)
// POST: Ajoute token statique { provider, token, alias }
// DELETE: Supprime profil { id }

```

### GIT OPERATIONS

`GET /api/git/status?path=/path/to/repo`

```javascript
// Retourne git status via simple-git
// Response: StatusResult (staged, not_staged, conflicted, etc.)

```

`GET /api/git/diff?projectPath=/path&filePath=optional`

```javascript
// Extrait diff structuré via Python script
// Response: {
//   status: 'success',
//   file: 'path/to/file',
//   diff: [{ line, type: 'add'|'del'|'neutral', content }]
// }

```

`POST /api/git/commit`

```javascript
// Commit automatique
// Request: { message, path }
// Exécute: git add . && git commit -m "..."

```

`GET/POST/DELETE /api/git/worktree`

```javascript
// Gestion des worktrees git
// GET: Liste worktrees { path, branch, commit }
// POST: Crée worktree dans repo/worktrees/${name}, branche experiment/${name}
// DELETE: Supprime worktree

```

### FICHIERS & EXÉCUTION

`GET/PUT /api/files?path=/path/to/file`

```javascript
// Lecture/écriture de fichiers source
// Sécurité:
// - Paths autorisés: /QueenBee/dashboard/, /QueenBee/proxy-bridge/
// - Extensions: .ts, .tsx, .js, .jsx, .css, .json, .md, .html
// - Protection path traversal (..)
// - Backup automatique avant écriture

// GET Response: { path, content, size, modified }
// PUT Request: { content }

```

`POST /api/execution/run`

```javascript
// Exécution de commandes shell
// Request: { command, cwd? }
// Response: { stdout, stderr } ou { error, code }

```

### TERMINAL & LOGS

`/api/terminal/shell`

```javascript
// Terminal PTY temps réel via WebSocket + node-pty
// Socket.io path: /api/terminal/socket
// Events:
// - output: données du terminal -> UI
// - input: saisie UI -> terminal
// - resize: { cols, rows }
// Spawne bash dans /home/fish/clawd

```

`/api/logs/stream`

```javascript
// Streaming de logs via Socket.io
// Events:
// - subscribe_to_job(jobId): rejoint room job_${jobId}
// Utilisé pour logs de background jobs

```

### AUTOMATIONS & SKILLS

`GET/POST/PUT/DELETE /api/automations`

```javascript
// CRUD automations
// Format: { id, title, description, schedule (cron), active, script, lastRun }
// POST: Crée nouvelle automation
// PUT: Update (toggle active, modifier script...)
// DELETE: Supprime par id

```

`GET/POST/DELETE /api/skills`

```javascript
// Gestion des skills/plugins
// GET: { installed: Skill[], available: [recommendations...] }
// POST: Installe skill { id, title, description, type }
// DELETE: Désinstalle skill

```

### PROJETS & CONFIG

`GET/POST /api/projects`

```javascript
// Gestion des projets
// GET: Liste projets { name, path, threads }
// POST: Ajoute projet { name, path } (vérifie existence)

```

`GET/POST /api/config`

```javascript
// Configuration globale Queen Bee
// GET: Retourne QueenBeeConfig complet
// POST: Sauvegarde nouvelle config (valide présence de modèles)

```

---

## 🔗 FLUX DE DONNÉES PRINCIPAL

```text
____________________________________________________
|                DASHBOARD (Vite)                  |
| - CMD+K Bar -> /api/chat ou UniversalDispatcher   |
| - Sidebar Projects -> /api/projects              |
| - Git Panel -> /api/git/* |
| - Terminal -> WebSocket /api/terminal/shell      |
|__________________________________________________|
         |
         v
____________________________________________________
|               PROXY-BRIDGE (Next.js)             |
|                                                  |
|  |EventLoop | -> |Dispatcher | -> |Orchestrator| |
|  |Manager   |    |(Search/Act)|    |(Workflows) | |
|  |__________|    |___________|    |____________| |
|       |                                 |        |
|       v                                 v        |
|  |Socket.io |    |WorkTree   |    |Forge      |  |
|  |Events    |    |Manager    |    |Adapter    |  |
|  |__________|    |___________|    |___________|  |
|                                                  |
|  |Auth      |    |Config     |    |MCP        |  |
|  |Manager   |    |Manager    |    |Bridge     |  |
|  |__________|    |___________|    |___________|  |
|__________________________________________________|
         |
         v
____________________________________________________
|                EXTERNAL SERVICES                 |
| - GitHub API (OAuth, Repos, PRs)                 |
| - LLM Providers (NVIDIA, Gemini, Ollama, OpenAI) |
| - MCP Servers (visionOS-MCP, Figma-MCP)          |
| - Dassault Proxy (Enterprise models)             |
|__________________________________________________|

```
