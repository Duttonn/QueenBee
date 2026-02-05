# 🐝 QUEEN BEE: ARCHITECTURE UNIFIÉE & PROTOCOLE DE SOUDURE

> **Document Maître** : Fusion de tous les specs d'architecture  
> **Version** : 3.0 - Février 2026  
> **Objectif** : Transformer Queen Bee d'une collection de composants isolés en un écosystème réactif et intégré  
> **Règle d'Or** : "Backend Truth, Frontend Mirror" - Le Frontend ne décide rien, il affiche ce que le Backend lui dit.

---

# TABLE DES MATIÈRES

1. [VISION & PHILOSOPHIE](#1-vision--philosophie)
2. [ARCHITECTURE TECHNIQUE](#2-architecture-technique)
3. [DESIGN SYSTEM "CUPERTINO FLUX"](#3-design-system-cupertino-flux)
4. [UI COMPONENTS SPECIFICATION](#4-ui-components-specification)
5. [BACKEND SYNTHESIS](#5-backend-synthesis)
6. [AUTHENTIFICATION & SÉCURITÉ](#6-authentification--sécurité)
7. [GIT WORKFLOW & WORKTREES](#7-git-workflow--worktrees)
8. [AGENTS AUTONOMES](#8-agents-autonomes)
9. [SKILLS & MCP INTEGRATION](#9-skills--mcp-integration)
10. [BROWSER & RUNTIME CONTROL](#10-browser--runtime-control)
11. [VISUAL VERIFICATION](#11-visual-verification)
12. [NATIVE MAC APP (ELECTRON)](#12-native-mac-app-electron)
13. [AUTOMATION & SCHEDULING](#13-automation--scheduling)
14. [MODEL SUCCESSION & RELAY](#14-model-succession--relay)
15. [PRD DE CONVERGENCE](#15-prd-de-convergence)
16. [PLAN D'EXÉCUTION](#16-plan-dexécution)
17. [CHECKLIST DE DÉPLOIEMENT](#17-checklist-de-déploiement)

---

# 1. VISION & PHILOSOPHIE

## 1.1 Core Concept: "The Hive"

Queen Bee est un **Command Center** pour orchestrer des agents IA autonomes. L'architecture suit une hiérarchie inspirée d'une ruche :

```
┌─────────────────────────────────────────────────────┐
│                    QUEEN BEE 👑🐝                    │
│         (Global Orchestrator - Le Cerveau)          │
├─────────────────────────────────────────────────────┤
│                   WORKER BEES 🐝                     │
│    (Agents spécialisés par projet/tâche)            │
├─────────────────────────────────────────────────────┤
│                    WORKTREES                         │
│      (Branches git éphémères pour isolation)        │
└─────────────────────────────────────────────────────┘
```

## 1.2 Structural Hierarchy

- **Workspaces** : Niveau racine (ex: `/home/fish/clawd`)
- **Projects** : Unités logiques de travail (Blackjack, visionOS-MCP)
- **Agents** : Unités d'exécution individuelles par tâche
  - Multiple agents par projet (Parallel Workers)
  - Status: `Idle`, `Thinking`, `Working`, `Blocked`
- **WorkTrees** : Branches isolées pour chaque tâche

## 1.3 Design Philosophy

### Principes Fondamentaux
- **Spatial Persistence** : Sidebar et Input Shell constants, Main Canvas mute selon contexte
- **Material Lightness** : Surfaces blanches pures, sidebars translucides, ombres douces
- **Apple DNA** : Typographie SF Pro, contrôles natifs macOS, effets blur subtils
- **Zero Hacker Aesthetic** : Pas de thèmes dark neon, esthétique IDE professionnelle clean

### Local-First Philosophy
- **Identity** : Profil local stocké dans `~/.codex/profiles/default.json`
- **Portability** : Export "Hive Snapshot" en un clic (fichier `.hive` chiffré)
- **Migration** : Import/Export entre VPS et Mac Electron App
- **Security** : Tokens chiffrés avec salt spécifique à la machine

---

# 2. ARCHITECTURE TECHNIQUE

## 2.1 Flux de Données (Event-Driven)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌─────────────┐                           ┌─────────────┐      │
│  │  COMMANDS   │ ─────────────────────────▶│  REACTIONS  │      │
│  │ (User Intent)│                          │ (State Sync) │      │
│  └─────────────┘                           └─────────────┘      │
│        │ POST /api/*                             ▲ Socket.io    │
│        │ IPC invoke                              │ Events       │
└────────┼─────────────────────────────────────────┼──────────────┘
         │                                         │
         ▼                                         │
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Next.js)                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │  PROCESS    │──▶│   MUTATE    │──▶│   NOTIFY    │           │
│  │ (API Route) │   │ (FileSystem)│   │ (Socket.io) │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│                           │                                     │
│                    ┌─────────────┐                              │
│                    │ FILE SYSTEM │ ← Single Source of Truth     │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Séquence d'Action
1. **Action Utilisateur** (Clic "Clone") → **API Call** (`POST /api/project`)
2. **Backend Processing** → Exécute la commande lourde (Git, FS)
3. **Backend Event** → Émet via Socket.io (`PROJECT_READY`, `LOG_STREAM`)
4. **Frontend Update** → `useSocketListener` capte l'événement → Met à jour Zustand

## 2.2 Isolation des Agents (Git Worktrees)

Pour éviter les conflits de fichiers :
- Chaque agent travaille dans `/worktrees/task-{id}`
- Le dossier principal (`/`) reste propre (branche `main`)
- L'UI "Main" pointe vers le dossier principal
- L'UI "Thread" pointe vers le worktree spécifique

## 2.3 Structure Backend

```
proxy-bridge/src/
├── middleware.ts           # Middleware CORS global
├── lib/                    # 47 modules (services, managers, adapters)
│   ├── TypeScript (41 fichiers)
│   └── Python (4 fichiers)
└── pages/api/              # 18 endpoints REST/WebSocket
    ├── auth/               # Authentification (GitHub, Google, Profiles)
    ├── execution/          # Exécution de commandes
    ├── git/                # Opérations Git (diff, commit, worktree)
    ├── logs/               # Streaming de logs WebSocket
    ├── providers/          # Test des providers IA
    └── terminal/           # Terminal PTY en temps réel
```

---

# 3. DESIGN SYSTEM "CUPERTINO FLUX"

## 3.1 Color Palette (Strict - Light Mode)

```css
/* PRIMARY SURFACES */
--main-canvas: #FFFFFF;                    /* Pure white */
--sidebar: rgba(245, 245, 247, 0.8);       /* Translucent with blur */
--cards: #FFFFFF;                          /* With border #E5E5E5 */

/* TEXT HIERARCHY */
--text-primary: #1A1A1A;                   /* text-gray-900 */
--text-secondary: #6B7280;                 /* text-gray-500 */
--text-tertiary: #9CA3AF;                  /* text-gray-400 */
--text-placeholder: #D1D5DB;               /* text-gray-300 */

/* SEMANTIC COLORS */
--addition: bg-green-50 (#F0FDF4) / text-green-700;
--deletion: bg-red-50 (#FEF2F2) / text-red-700;
--active: bg-gray-100 with shadow-inner;
--accent-blue: #3B82F6;
```

## 3.2 The "Native" Shell

### Window & Layout
- **Materials, Not Colors** : `bg-zinc-950/90` avec `backdrop-blur-xl`
- **Sidebar** : Style macOS Finder / Arc Browser
  - Background: `bg-zinc-900/50` (highly translucent)
  - Border: `border-r border-white/5`
  - Selection: `rounded-md bg-white/10 text-white`
- **Window Controls** : Espace top-left pour Traffic Lights (Red/Yellow/Green)

### Typography & Hierarchy
- **Font Stack** : `Inter` ou `SF Pro Display`
- **Headings** : `text-zinc-100` + `font-medium`
- **Body** : `text-zinc-400` (jamais `#fff` pur)
- **Monospace** : `JetBrains Mono` ou `Fira Code`

### "Invisible" UI Elements
- **Borders** : Ultra-thin `border border-white/10`
- **Inputs** : `bg-zinc-800/50`, focus: `ring-1 ring-white/20`
- **Modals** : `backdrop-blur-2xl`, `shadow-2xl`, `border border-white/10`

## 3.3 Component Styling

### Sidebar Navigation
- Section Headers: `uppercase tracking-[0.2em] text-[10px] text-zinc-500`
- Project List: Generous vertical padding

### Agentic Workbench
- **User Message** : Minimalist, no bubble, right-aligned
- **Agent Message** : Left aligned, minimal avatar
- **Thinking Process** : Collapsible with `border-l-2 border-zinc-700 pl-4`
- **Code Blocks** : `bg-black/40`, `rounded-lg`, subtle border

### Automation Cards
- **Glass Cards** : `bg-white/5`, `hover:bg-white/10`, `border border-white/5`
- **Transitions** : `transition-all duration-300 ease-out`

---

# 4. UI COMPONENTS SPECIFICATION

## 4.1 Global App Shell

```
┌─────────────────────────────────────────────────────────────────┐
│ ● ● ●                    New thread                             │  <- Traffic lights + title
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│   SIDEBAR    │              MAIN CANVAS                         │
│   (260px)    │              (flex-grow)                         │
│              │                                                  │
├──────────────┴──────────────────────────────────────────────────┤
│                        COMPOSER BAR                             │  <- Fixed bottom
└─────────────────────────────────────────────────────────────────┘
```

### Z-Index Layering
```
Layer 0 (Base):     Main Canvas (bg-white)
Layer 1 (Nav):      Sidebar (translucent, blur)
Layer 2 (Floating): Header toolbar, Diff stats pill
Layer 3 (Overlay):  Modals, Dropdowns, Toasts
Layer 4 (Top):      User camera bubble
```

## 4.2 Sidebar Structure

```
┌─────────────────┐
│ ✏️ New thread   │  <- Primary action
│ ⏰ Automations  │  <- Navigation item
│ 🔌 Skills       │  <- Navigation item
├─────────────────┤
│ Threads    🗂️ ≡ │  <- Section header
├─────────────────┤
│ 📁 AstroScope   │  <- Project folder (expanded)
│   ├─ Update design...  +47 -20  3h
│   └─ Investigate build...    10h
│ 📁 Wanderlust   │
│   ├─ ○ Migrate Realtime...   3m
│   └─ Add Travel Log +427 -0  4h
└─────────────────┘
```

### Thread Item Interface
```typescript
interface ThreadItem {
  title: string;           // "Update design for Liquid Glass"
  diffStats?: {
    additions: number;     // +47
    deletions: number;     // -20
  };
  timestamp: string;       // "3h"
  status?: 'running' | 'complete' | 'idle';
  hasUnstaged?: boolean;   // Blue dot indicator
}
```

## 4.3 Composer / Input Bar

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Ask Codex anything, @ to add files, / for commands                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [+]  [</> Code ˅]  [GPT-5.2-Codex ˅]  [Medium ˅]              [🔒] [🎤] [⬆️]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [📁 Local]  [Worktree]  [Cloud]       [⚙️ No environment ˅] [🔀 From main ˅]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Controls
| Control | Description |
|---------|-------------|
| `+` | Add file/attachment |
| `</> Code` | Mode selector dropdown |
| `GPT-5.2-Codex` | Model selector |
| `Medium` | Reasoning effort (Low/Medium/High/XHigh) |
| `🔒` | Lock/Security settings |
| `🎤` | Voice dictation (Ctrl+M) |
| `⬆️` | Send button |

## 4.4 Diff View

```
┌───────────────────────────────┬─────────────────────────────────────────────────┐
│ AGENTS.md        +0 -5  ●     │ Filter files...                                 │
│ APODResponse.swift +28 -0 ● > │                                                 │
├───────────────────────────────┤ ⬇ AGENTS.md                                     │
│  1  │ //                      │   📁 AstroScope.xcodeproj                       │
│  2  │ // APODResponse.swift   │      📄 APODResponse.swift                      │
│  8  │ import Foundation       │      📄 ContentView.swift                       │
└───────────────────────────────┴─────────────────────────────────────────────────┘
```

### Diff Color Scheme
```css
.diff-addition {
  background-color: #F0FDF4;  /* green-50 */
  border-left: 3px solid #22C55E;
}
.diff-deletion {
  background-color: #FEF2F2;  /* red-50 */
  border-left: 3px solid #EF4444;
}
```

## 4.5 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+J` | Toggle terminal drawer |
| `Cmd+K` | Command palette |
| `Ctrl+L` | Clear terminal |
| `Ctrl+M` (hold) | Voice dictation |
| `Cmd+N` | New thread |
| `Cmd+,` | Settings |
| `Cmd+Enter` | Send message |

---

# 5. BACKEND SYNTHESIS

## 5.1 Orchestration Core

### HiveOrchestrator.ts
Le "GLUE" central - Connecte Worktrees, Environment, Watching, Shipping.

```typescript
class HiveOrchestrator {
  async startFeatureWorkflow(projectId, featureName, sourcePath) {
    // 1. Crée branche isolée: `gsd-${featureName}-${timestamp}`
    // 2. Setup environnement (npm install, etc.)
    // 3. Attache monitoring temps réel (AutoContextManager)
    return { treePath, branchName }
  }

  async shipAndCleanup(treePath, repoPath, prTitle, prBody) {
    // 1. Crée la PR via ForgeAdapter
    // 2. Nettoie le worktree éphémère
    // Émet: WORKFLOW_COMPLETE avec URL PR
  }
}
```

### EventLoopManager.ts
Le "SYSTÈME NERVEUX" - Gère la continuité logique UI ↔ Backend.

```typescript
class EventLoopManager {
  // CMD_SUBMIT: Soumission prompt → Émet QUEEN_STATUS (thinking)
  // FILE_CHANGE_DETECTED: Fichier modifié → Émet UI_UPDATE (UPDATE_LIVE_DIFF)
  // AGENT_CODE_COMPLETE: Agent finit → Émet UI_UPDATE (SET_AGENT_STATUS)
}
```

### UniversalDispatcher.ts
Logique CMD+K BAR - Décide entre Search et Command.

```typescript
class UniversalDispatcher {
  async dispatch(input, activeProjectPath) {
    // Détection heuristique: mots-clés d'action = create, build, fix...
    if (isAction) {
      socket.emit('DISPATCH_TYPE', { type: 'ACTION' })
    } else {
      socket.emit('DISPATCH_TYPE', { type: 'SEARCH' })
      socket.emit('SEARCH_RESULTS', results)
    }
  }
}
```

## 5.2 Context & Indexation

### ContextScraper.ts
"L'œil de reconnaissance" de Queen Bee.

```typescript
class ContextScraper {
  async scrape(projectPath) {
    // 1. Extrait README.md (premiers 2000 chars)
    // 2. Identifie TODO: et FIXME:
    // 3. Détecte tech stack
    return { readme, todos: [{file, line, text}], techStack }
  }
}
```

### FastIndexer.ts
Indexation ultra-rapide via ripgrep et find.

```typescript
class FastIndexer {
  async search(query, projectPath) {
    // find -iname "*query*"
    // rg --line-number --smart-case "query"
    return { files, snippets: [{ file, line, preview }] }
  }
}
```

## 5.3 API Endpoints

### Chat & Providers
```typescript
// POST /api/chat - Proxy LLM avec fallback automatique
// Stratégie: X-Codex-Provider → NVIDIA → Gemini → Ollama → Mock

// POST /api/providers/test - Test connexion providers
// Supporte: openai, anthropic, gemini, nvidia, ollama, azure, custom
```

### Git Operations
```typescript
// GET /api/git/status?path=/path/to/repo
// GET /api/git/diff?projectPath=/path&filePath=optional
// POST /api/git/commit { message, path }
// GET/POST/DELETE /api/git/worktree
```

### Terminal & Logs
```typescript
// /api/terminal/shell - Terminal PTY via WebSocket + node-pty
// /api/logs/stream - Streaming logs via Socket.io
```

## 5.4 Événements Socket.io

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `CMD_SUBMIT` | Client → Server | Soumission prompt |
| `QUEEN_STATUS` | Server → Client | État Queen Bee (thinking) |
| `DISPATCH_TYPE` | Server → Client | Type dispatch (ACTION/SEARCH) |
| `UI_UPDATE` | Server → Client | Mise à jour UI |
| `FILE_CHANGE` | Server → Client | Fichier modifié |
| `WORKFLOW_COMPLETE` | Server → Client | Fin workflow avec URL PR |
| `NATIVE_NOTIFICATION` | Server → Client | Notification système Mac |

---

# 6. AUTHENTIFICATION & SÉCURITÉ

## 6.1 Multi-Provider OAuth

### AuthManager.ts
```typescript
class AuthManager {
  static async initiateOAuth(provider) {
    // OAuth Google avec PKCE (Code Verifier/Challenge)
    // Scopes: openid, email, profile, cloud-platform
  }

  static async exchangeCodeForToken(provider, code, codeVerifier) {
    // Échange code → access_token + refresh_token
    // Décode ID token JWT pour email
  }

  static async addStaticToken(provider, token, alias) {
    // Ajoute token statique (Gemini CLI, Claude, etc.)
  }
}
```

### AuthProfile Interface
```typescript
interface AuthProfile {
  id: string              // ex: "google:user@email.com"
  provider: string        // google, anthropic, etc.
  mode: 'api_key' | 'oauth' | 'token'
  access?: string         // OAuth access token
  refresh?: string        // OAuth refresh token
  expires?: number        // Timestamp expiration
  apiKey?: string         // Clé API statique
}
```

## 6.2 GitHub Auth Strategy

### Hybrid Flow (Device + OAuth)
```typescript
class GitHubAuthManager {
  static async initiateLogin(redirectUri) {
    // HYBRIDE:
    // - macOS local → Web Flow (redirect) pour meilleure UX
    // - VPS/Linux → Device Flow (code à copier-coller)
    // Scopes: user:email, read:user, repo, workflow, read:org, gist
  }
}
```

## 6.3 Security Audit Agent

### Leak Detection
```typescript
class SecurityAuditAgent {
  private sensitivePatterns = [
    /nvapi-[a-zA-Z0-9]{32,}/g,        // NVIDIA API Keys
    /AIzaSy[a-zA-Z0-9_-]{33}/g,       // Google AI Keys
    /sk-[a-zA-Z0-9]{48}/g,            // OpenAI keys
    /ghp_[a-zA-Z0-9]{36}/g            // GitHub PATs
  ]

  async auditProject(projectPath) {
    // Pre-commit scan pour détecter credentials
    // Auto-block si leak détecté
  }
}
```

## 6.4 Storage Paths

```
~/.queenbee/
├── config.yaml             # Configuration globale
├── auth-profiles.json      # Profils OAuth (permissions 0o600)
└── github-token.json       # Token GitHub

~/.codex/
├── auth.json               # Keyring multi-comptes
├── hive_state.json         # État portable
└── user_states/            # États par utilisateur
```

---

# 7. GIT WORKFLOW & WORKTREES

## 7.1 WorkTree Manager

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
  }
}
```

## 7.2 Automated Commit Logic

```typescript
// 1. Diff Analysis: git diff pour comprendre les changements
// 2. Message Generation: Draft semantic commit (feat/fix/docs)
// 3. Review Step: User voit staged files + suggested message
// 4. Push: git push origin <branch>
```

## 7.3 PR Management

### Context-Aware PR Generation
```typescript
class UniversalForgeAdapter {
  async createPR(repoPath, title, body) {
    // gh pr create --title "..." --body "..."
    // Utilise .github/pull_request_template.md si disponible
  }
}
```

### PR Lifecycle Controls
- `gh pr create` : Création automatisée
- `gh pr status` : Monitoring CI/CD en temps réel
- `gh pr merge` : Merge après approbation

## 7.4 Conflict Resolution

```typescript
class ConflictResolver {
  async solve(projectPath, filePath) {
    // 1. Lit les marqueurs de conflit
    // 2. Génère prompt pour raisonnement LLM
    // 3. Applique "Smart Merge"
    return { status: 'pending', resolved: false }
  }
}
```

---

# 8. AGENTS AUTONOMES

## 8.1 Autonomous Protocol

### High-Trust Execution
Les agents priorisent **completion** sur **clarity**. Autorisés à faire des assumptions logiques plutôt que s'arrêter pour poser des questions.

### "Assumption-First" Loop
1. **Identify Ambiguity** : Reconnaître un détail manquant
2. **Make Assumption** : Choisir le path le plus standard
3. **Execute** : Compléter la tâche, run tests, ensure compilation
4. **Log Assumption** : Garder un record des assumptions

### Completion Criteria
L'agent ne report qu'à la Queen Bee quand :
- **Success** : Code implémenté ET tests passent
- **Compilation** : Code compile sans erreurs
- **Final Report** : "🚀 Task Completed" + "🧠 Assumptions Made"

## 8.2 System Prompt Injection

```typescript
export const AUTONOMOUS_SYSTEM_PROMPT_INJECT = `
# AUTONOMY DIRECTIVE
1. Tu es un worker autonome de haute confiance
2. NE JAMAIS s'arrêter pour poser des questions
3. Si info manquante → ASSUMPTION professionnelle
4. Objectif: solution finie, testée, qui compile
5. Continue les tool calls jusqu'à vérification complète
6. À la fin: liste les assumptions sous '🧠 ASSUMPTIONS'
`
```

## 8.3 Recursive Prompting

### Phase 1: Silent Reconnaissance ("The Peek")
```typescript
// Pour chaque projet:
// 1. Tree Scan: ls -R + README.md + package.json
// 2. Context Mapping: Identifier fichiers relevant
// 3. Execution Check: Run build/test si possible
```

### Phase 2: Knowledge Synthesis
```typescript
// Combine 3 sources:
// - User Intent (raw prompt)
// - Project DNA (file structure, tech stack)
// - Agent Best Practices
```

### Phase 3: Super-Prompt Engineering
```typescript
// Transformation:
// User: "Change the close button"
// Queen Bee: "Project uses Tailwind + Framer Motion. 
//            Located in src/components/Modal.tsx. 
//            Requirement: Change close button to 'Minimalist X',
//            ensuring hover animation remains consistent with theme.ts"
```

---

# 9. SKILLS & MCP INTEGRATION

## 9.1 Skill Registry

```typescript
// Local Skills: /home/fish/clawd/skills/
// Skill Discovery: Queen Bee scans pour identifier tools
// Dynamic Attachment: Drag-and-drop skill onto agent
```

## 9.2 MCP Bridge

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

### Multi-Server Support
- `visionOS-MCP` : Simulator control, coordinate projection
- `Xcode-MCP` : Build monitoring, error fixing
- `Figma-MCP` : Design-to-code workflows
- `Filesystem-MCP` : Advanced RAG and search

## 9.3 Tool Orchestration

```typescript
// Lors du spawn d'un agent, Queen Bee sélectionne:
// - Skills nécessaires basés sur la tâche
// - MCP endpoints appropriés

// Exemple: Tâche "Fix visionOS UI"
// → Attach visionOS-MCP + skill-creator
```

## 9.4 UI Implementation: The "Toolbelt"

- Drawer dans Sidebar avec Skills installés et MCP Servers actifs
- Indicateurs visuels online/offline
- Drag-and-drop pour attacher skills aux agents

---

# 10. BROWSER & RUNTIME CONTROL

## 10.1 Browser Relay

### "Live Eye" System
```typescript
class BrowserRelay {
  async attachToTab(tabId) {
    // CDP (Chrome DevTools Protocol) handshake
    socket.emit('BROWSER_ATTACHED', { tabId, url })
  }

  async captureSnapshot() {
    // Retourne aria-tree + screenshot base64
  }

  async performAction(kind: 'click' | 'type', selector, value?) {
    // Commands CDP
  }
}
```

### Browser Control Protocol
- **Live Sync** : Attach à Chrome tab via CDP
- **DOM Inspection** : Semantic snapshot (Aria-tree)
- **Visual Feedback** : High-frequency screenshots streamés
- **Interaction** : Click, type, scroll via coordinates ou selectors

## 10.2 Deep Inspector (Runtime Bridge)

### Web Apps (React/Next.js)
```typescript
// Injection: codex-inspector.js dans dev server
// Precision: React DevTools hook pour mapper UI → source file:line
// Interaction: CLICK_COMPONENT(id) exécuté par runtime
```

### Native Apps (visionOS/iOS)
```typescript
// MCP Bridge: Query RealityKit Entity Tree
// Visual Inspection: Corrélation Entity Tree + AXe labels
```

### RuntimeBridge.ts
```typescript
class RuntimeBridge {
  async inspectElement(componentId) {
    // Lie élément UI à son code source
    return { file: 'src/Header.tsx', line: 42, props }
  }

  async executeRuntimeAction(action, params) {
    // Exécute action de test dans l'app
    socket.emit('RUNTIME_EXEC', { action, params })
  }
}
```

## 10.3 Auto-Test Loop

```
1. ACTION: Agent implémente feature dans WorkTree
2. RUN: Hive lance app en "Live Runtime" mode
3. INSPECT: DeepInspector vérifie élément via RuntimeBridge
4. ASSERT: Agent exécute script de vérification
5. REPORT: Si erreur → agent auto-restart loop
```

---

# 11. VISUAL VERIFICATION

## 11.1 Screenshot Analyzer

```typescript
class ScreenshotAnalyzer {
  async verifyUIChange(expectation) {
    // 1. Capture via MCPBridge.getScreenshot()
    // 2. Analyse vision (Kimi ou NVIDIA NIM)
    return { success, analysis, timestamp }
  }
}
```

## 11.2 Visual UI Diff

### Modes de Comparaison
- **Ghosting** : Nouvelle UI overlaid sur l'ancienne à 50% opacity
- **Side-by-Side** : Comparaison traditionnelle left/right
- **Slider (Swipe)** : Handle vertical pour swipe Before/After

### Automation Bridge
```typescript
// 1. Snap Base: Screenshot du main branch
// 2. Apply & Build: Agent applique changes, rebuild
// 3. Snap Delta: Second screenshot même viewport
// 4. Analysis: ScreenshotAnalyzer calcule pixel-diff
```

## 11.3 Visual Annotations

### Semantic Pinning
```typescript
// User clique élément dans Live View + tape: "Make this label bold"
// DeepInspector capture metadata (file, line, props)
// Queen Bee crée task autonome:
//   Target: src/components/StatusLabel.tsx:12
//   Instruction: Apply bold and blue styles
//   Context: Screenshot + code snippet
```

### Visual Markups
- **Highlighting** : Orchestrator "dessine" sur Live View
- **Diff Preview** : Ghost overlay de nouvelle UI sur ancienne

---

# 12. NATIVE MAC APP (ELECTRON)

## 12.1 Strategy

Wrapper React dashboard dans Electron shell pour:
- True "Apple Aesthetic"
- System-level features (Seatbelt sandboxing, global hotkeys)

## 12.2 Native Capabilities

- **Title Bar** : `hiddenInset` pour blend avec macOS chrome
- **Auto Context** : macOS Accessibility API pour détecter fichier ouvert
- **Global Hotkeys** : Cmd+K (Queen Bee), Cmd+J (Terminal) même en background
- **Push-to-Talk** : System-level microphone access pour Whisper

## 12.3 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ELECTRON SHELL (Mac)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   RENDERER (React)                          ││
│  │                   Dashboard UI                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                    IPC Bridge (preload.ts)                       │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   MAIN PROCESS (Node.js)                    ││
│  │              NativeFSManager (full system access)           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                      WebSocket (Secure)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   VPS PROXY-BRIDGE (Linux)                       │
│              High-performance agent execution                    │
└─────────────────────────────────────────────────────────────────┘
```

## 12.4 IPC Exposition (preload.ts)

```typescript
contextBridge.exposeInMainWorld('electron', {
  fs: { readFile, writeFile, readDir, listDir },
  shell: { openExternal, showItemInFolder },
  git: { status, diff },
  clone: (repoUrl, targetDir) => ipcRenderer.invoke('fs:clone', {...}),
  notify: (title, body) => ipcRenderer.send('notification:show', {...})
});
```

## 12.5 Hybrid Mode (Local vs Remote)

### Target: THIS MAC (Native Mode)
- Filesystem: `/Users/natao/Developer/QueenBee/...`
- Runner: Local Node.js/Python
- Sync: Instant (no WebSockets needed)

### Target: VPS (Remote Mode)
- Filesystem: `/home/fish/clawd/projects/...`
- Communication: Secure WebSocket
- Use Case: Heavy tasks, background jobs

---

# 13. AUTOMATION & SCHEDULING

## 13.1 Hive Cron System

### Job Types
- `GSD_SCAN` : Periodic workspace analysis
- `SYNC_REPOS` : Background GitHub/GitLab fetching
- `DATA_GEN` : Continuous dataset generation
- `MAINTENANCE` : Cleanup temp worktrees, build artifacts

## 13.2 Scheduler UI

```typescript
interface AutomationJob {
  id: string;
  title: string;
  description: string;
  schedule: string;        // Cron syntax
  active: boolean;
  script?: string;
  lastRun?: string;
}
```

### Controls
- Create, Pause, Resume, Delete jobs
- History: View last 10 executions
- Status: Real-time next scheduled run

## 13.3 Autonomous Triggering ("Queen's Pulse")

```typescript
// Queen Bee peut suggérer des schedules automatiquement:
// "I noticed you're generating a large dataset. 
//  Should I schedule this to run every night at 2 AM?"
```

## 13.4 Inbox Triage

```typescript
class InboxManager {
  async addFinding(agentId, title, content) {
    // Findings avec Impact: Errors, bottlenecks, accessibility gaps
    // Silent Success: Clean runs auto-archived
    // Actionability: "Fix this" button → draft Super-Prompt
  }
}
```

---

# 14. MODEL SUCCESSION & RELAY

## 14.1 Preference Stack

Chaque projet/agent peut être configuré avec un **Model Preference Stack**:

```typescript
// Tier 1 (Preferred): claude-opus-4-5-thinking (High reasoning)
// Tier 2 (Fallback): gemini-3-flash-preview (Cost-efficient)
// Tier 3 (Local): ollama/llama3 (Privacy/Offline)
```

## 14.2 Dynamic Succession ("Relay" System)

```typescript
// 1. Task Completion: Orchestrator évalue si next step nécessite même modèle
// 2. Model Hot-Swap: Si token limit atteint ou complexité réduite
//    → Orchestrator "relays" context au modèle suivant
// 3. Session Continuity: Nouveau modèle reçoit full summary
```

## 14.3 Relay Buffer

### Relay Snapshot
```typescript
interface RelaySnapshot {
  objectiveSummary: string;   // Goal
  currentState: string;       // Accomplished
  pendingActions: string[];   // Todo
  criticalConstraints: string[]; // Rules
}
```

### Storage & Injection
```typescript
// Snapshots: /sessions/relay_cache.json
// Injection: System-Priority Message au nouveau modèle
// Focus: "Distilled Truth" sans re-envoyer logs bruts
```

### UI Implementation
```
[SNAPSHOT] Distilling context from Claude 4.5...
[INJECT] Passing 1.2k tokens of state to Gemini 1.5...
[RESUME] Gemini is now active.
```

## 14.4 Multi-Tenancy

```typescript
// Queen Bee détecte quotas disponibles:
// Si Account_A (Dassault) throttled → switch à Account_B (Personal)
// Sans interrompre le workflow
```

---

# 15. PRD DE CONVERGENCE

## 15.1 Diagnostic de l'État Actuel

### Ce qui FONCTIONNE :
- ✅ Socket.io initialisé dans `useHiveStore.ts`
- ✅ Listeners pour `UI_UPDATE` et `NATIVE_NOTIFICATION`
- ✅ Service API (`api.ts`) avec fonctions chat, diff, worktree
- ✅ Electron IPC expose `clone`, `read`, `write`, `notify`
- ✅ NativeFSManager gère opérations fichiers

### Ce qui est CASSÉ / DÉCONNECTÉ :

| Problème | Localisation | Impact |
|----------|--------------|--------|
| **Projets hardcodés** | `useHiveStore.ts` ligne 28-31 | Projets en dur, pas chargés du backend |
| **Socket non initialisé au boot** | `App.tsx` | Aucun `useEffect` n'appelle `initSocket()` |
| **GlobalCommandBar déconnectée** | Components | Submit ne passe pas par `api.sendChatMessage()` |
| **Diff View statique** | Components | Aucun listener pour `FILE_CHANGE` / `DIFF_UPDATE` |
| **Terminal isolé** | Components | N'écoute pas les logs backend |
| **Electron API non utilisée** | Dashboard | `window.electron` jamais appelé |

## 15.2 Gap Analysis (Missing Features)

### Thread Modes (The "Missing Triad")
- **Local** : Edit project files directly
- **Worktree** : Isolate in git worktree (implemented)
- **Cloud** : Execute on remote instance

### Missing Components
- ❌ Integrated Terminal (Xterm.js + WebSocket)
- ❌ IDE Sync & "Auto Context" (file-watcher plugin)
- ❌ Voice Prompting (Whisper transcription)
- ❌ Visual Verification (screenshot tool)
- ❌ Security Approvals (Approve once/for session UI)
- ❌ Sleep Prevention & Notifications

---

# 16. PLAN D'EXÉCUTION

## 16.1 PHASE 1 : Le Système Nerveux (Socket & IPC)

| ID | Tâche | Type | Fichier | Validation |
|----|-------|------|---------|------------|
| S-01 | Appeler `initSocket()` au montage | Front | `App.tsx` | Console log "Dashboard connected" |
| S-02 | Créer hook `useSocketEvents.ts` | Front | Nouveau | Hook réutilisable |
| S-03 | Écouter `QUEEN_STATUS` | Front | `useHiveStore.ts` | Indicateur "thinking" fonctionne |
| S-04 | Écouter `PROJECT_LIST_UPDATE` | Front | `useHiveStore.ts` | Sidebar update auto |
| S-05 | Ajouter broadcast helper | Back | `EventLoopManager.ts` | Tous clients reçoivent events |
| S-06 | Émettre `PROJECT_LIST_UPDATE` après création | Back | `/api/projects.ts` | Event émis après POST |

## 16.2 PHASE 2 : L'Accès Physique (Native Filesystem)

| ID | Tâche | Type | Fichier | Validation |
|----|-------|------|---------|------------|
| N-01 | Créer `NativeService.ts` wrapper | Front | Nouveau | Abstraction `window.electron` |
| N-02 | Exposer `selectDirectory()` | Electron | `preload.ts` | Dialog natif s'ouvre |
| N-03 | Exposer `listDirectory()` | Electron | `preload.ts` | Retourne liste fichiers |
| N-04 | Handler `fs:listDir` | Electron | `NativeFSManager.ts` | Lit contenu dossier |
| N-05 | Connecter FileExplorer | Front | `SourceControl.tsx` | Affiche vrais fichiers |
| N-06 | Auto-save debounced | Front | `FileEditor.tsx` | Sauvegarde 500ms après stop |

## 16.3 PHASE 3 : La Boucle Agentique (Tool Execution)

| ID | Tâche | Type | Fichier | Validation |
|----|-------|------|---------|------------|
| A-01 | Créer `ToolExecutor.ts` | Back | Nouveau | Parse `write_file`, `run_shell` |
| A-02 | Intégrer dans chat stream | Back | `/api/chat.ts` | Détecte tool calls |
| A-03 | Émettre `TOOL_EXECUTION` events | Back | `ToolExecutor.ts` | Frontend voit actions |
| A-04 | Créer `ToolCallViewer.tsx` | Front | Nouveau | Affiche "Writing to file..." |
| A-05 | Boutons Approve/Reject | Front | `ToolCallViewer.tsx` | Confirmation demandée |
| A-06 | Écouter `TOOL_RESULT` | Front | `useHiveStore.ts` | Logs montrent succès/échec |

## 16.4 PHASE 4 : Le Flux Git & Worktrees

| ID | Tâche | Type | Fichier | Validation |
|----|-------|------|---------|------------|
| G-01 | Connecter "New Thread" à API | Front | `Sidebar.tsx` | Crée vrai dossier |
| G-02 | Émettre `WORKTREE_CREATED` | Back | `/api/git/worktree.ts` | Sidebar update |
| G-03 | Écouter `FILE_CHANGE` pour badges | Front | `useHiveStore.ts` | Badge +N -N temps réel |
| G-04 | Connecter bouton "Commit" | Front | `TopBar.tsx` | Crée vrai commit |
| G-05 | Écouter `DIFF_UPDATE` | Front | `DiffViewer.tsx` | Diff refresh auto |
| G-06 | Intégrer `FileWatcher` | Back | `HiveOrchestrator.ts` | Détecte changements |

## 16.5 Scénario de Cascade : "L'Effet Papillon"

**Trigger** : User tape `/fix le bug dans Header.tsx`

```
ÉTAPE 1: GlobalCommandBar → api.sendChatMessage()
    ↓
ÉTAPE 2: /api/chat.ts → EventLoopManager.emit('QUEEN_STATUS', 'thinking')
    ↓
ÉTAPE 3: useHiveStore → set({ queenStatus: 'thinking' }) → Spinner UI
    ↓
ÉTAPE 4: LLM répond avec tool call → ToolExecutor.execute('write_file')
    ↓
ÉTAPE 5: FileWatcher détecte → EventLoopManager.emit('FILE_CHANGE')
    ↓
ÉTAPE 6: git_diff_extractor.py → EventLoopManager.emit('DIFF_UPDATE')
    ↓
ÉTAPE 7: useHiveStore reçoit events → Update file tree, badges, spinner off
    ↓
ÉTAPE 8: React re-render → Sidebar badge +5 -2, DiffViewer shows changes
```

---

# 17. CHECKLIST DE DÉPLOIEMENT

## Phase 1 : Sockets
- [ ] **S-01** : `initSocket()` appelé au boot
- [ ] **S-02** : Hook `useSocketEvents.ts` créé
- [ ] **S-03** : `QUEEN_STATUS` écouté
- [ ] **S-04** : `PROJECT_LIST_UPDATE` écouté
- [ ] **S-05** : `broadcast()` helper créé backend
- [ ] **S-06** : Events émis après mutations API

## Phase 2 : Native FS
- [ ] **N-01** : `NativeService.ts` créé
- [ ] **N-02** : `selectDirectory()` exposé
- [ ] **N-03** : `listDirectory()` exposé
- [ ] **N-04** : Handler `fs:listDir` implémenté
- [ ] **N-05** : FileExplorer connecté
- [ ] **N-06** : Auto-save implémenté

## Phase 3 : Tool Execution
- [ ] **A-01** : `ToolExecutor.ts` créé
- [ ] **A-02** : Tool calls détectés dans chat
- [ ] **A-03** : `TOOL_EXECUTION` events émis
- [ ] **A-04** : `ToolCallViewer.tsx` créé
- [ ] **A-05** : Boutons Approve/Reject ajoutés
- [ ] **A-06** : `TOOL_RESULT` écouté

## Phase 4 : Git Flow
- [ ] **G-01** : "New Thread" connecté à API
- [ ] **G-02** : `WORKTREE_CREATED` émis
- [ ] **G-03** : `FILE_CHANGE` met à jour badges
- [ ] **G-04** : Bouton Commit connecté
- [ ] **G-05** : `DIFF_UPDATE` rafraîchit DiffViewer
- [ ] **G-06** : FileWatcher intégré à Orchestrator

## Validation Globale

### Test 1 : Synchronisation Temps Réel
```bash
touch ~/Projects/MyApp/src/NewComponent.tsx
# → Fichier apparaît dans UI en < 2 secondes sans refresh
```

### Test 2 : Persistance Backend
```bash
# Clic "New Thread" → Dossier worktrees/thread-xyz existe sur disque
# git branch montre experiment/thread-xyz
# Relancer app → Thread toujours là
```

### Test 3 : Cascade Agent
```bash
# Taper "/fix add dark mode"
# → Spinner Queen Bee s'active
# → Panel Agent affiche "Thinking..."
# → Panel Agent affiche "Writing to styles.css..."
# → DiffViewer montre changements
# → Badge sidebar mis à jour
```

### Test 4 : Zéro Redémarrage
```bash
# Modifier config.yaml depuis UI Settings
# → Nouveau modèle LLM utilisable immédiatement
```

---

## 🤖 Guide de Mission pour Agents IA

### AGENT FRONTEND - Tâches Atomiques

```markdown
## F-01 : Initialisation Socket au Boot
**Fichier** : `dashboard/src/App.tsx`
**Code** :
useEffect(() => { initSocket(); }, [initSocket]);
**Validation** : Console "[LogRelay] Dashboard connected"

## F-02 : Supprimer les Projets Hardcodés
**Fichier** : `dashboard/src/store/useHiveStore.ts`
**Code** : projects: [],
**Validation** : Sidebar affiche "No projects"

## F-03 : Charger les Projets depuis l'API
**Fichier** : `dashboard/src/store/useHiveStore.ts`
**Code** :
fetchProjects: async () => {
  const res = await fetch('http://localhost:3000/api/projects');
  if (res.ok) set({ projects: await res.json() });
}
**Validation** : Projets de queenbee.json apparaissent

## F-04 : Écouter QUEEN_STATUS
**Code** :
socket.on('QUEEN_STATUS', (data) => set({ queenStatus: data.status }));
**Validation** : Status change quand backend émet

## F-05 : Écouter DIFF_UPDATE pour badges
**Code** :
socket.on('DIFF_UPDATE', (data) => {
  get().updateProjectDiff(data.projectId, data.file, data.added, data.removed);
});
**Validation** : Badges +N -N apparaissent temps réel
```

### AGENT BACKEND - Tâches Atomiques

```markdown
## B-01 : Socket.io Singleton
**Fichier** : `proxy-bridge/src/lib/socket-instance.ts` (nouveau)
**Code** :
let io: Server | null = null;
export function getIO() { return io; }
export function setIO(server) { io = server; }
export function broadcast(event, data) { io?.emit(event, data); }

## B-02 : Émettre PROJECT_LIST_UPDATE
**Fichier** : `proxy-bridge/src/pages/api/projects.ts`
**Code** :
db.projects.push(newProject);
saveDb(db);
broadcast('PROJECT_LIST_UPDATE', { projects: db.projects });

## B-03 : Intégrer FileWatcher à l'Orchestrator
**Code** :
const watcher = chokidar.watch(treePath, { ignoreInitial: true });
watcher.on('change', (path) => {
  broadcast('FILE_CHANGE', { projectId, path, timestamp: Date.now() });
});

## B-04 : Créer ToolExecutor.ts
**Code** :
export class ToolExecutor {
  async execute(tool, projectPath) {
    broadcast('TOOL_EXECUTION', { tool: tool.name, status: 'running' });
    switch (tool.name) {
      case 'write_file': await fs.writeFile(...); break;
      case 'run_command': execSync(...); break;
    }
    broadcast('TOOL_RESULT', { tool: tool.name, status: 'success' });
  }
}

## B-05 : Auto-trigger Diff après FILE_CHANGE
**Code** :
socket.on('FILE_CHANGE_DETECTED', async ({ projectId, filePath }) => {
  const diffJson = execSync(`python3 git_diff_extractor.py ${projectPath} ${filePath}`);
  const diff = JSON.parse(diffJson);
  broadcast('DIFF_UPDATE', { projectId, file: filePath, added, removed });
});
```

---

## Matrice de Priorité

| Phase | Effort | Impact | Priorité | Dépendances |
|-------|--------|--------|----------|-------------|
| Phase 1 (Sockets) | Moyen | Critique | 🔴 P0 | Aucune |
| Phase 2 (Native FS) | Élevé | Haut | 🟠 P1 | Phase 1 |
| Phase 3 (Tool Exec) | Élevé | Critique | 🔴 P0 | Phase 1 |
| Phase 4 (Git Flow) | Moyen | Haut | 🟠 P1 | Phase 2, 3 |

**Recommandation** : Commencer par **Phase 1 (S-01 à S-06)** - le canal de communication. Sans lui, toutes les autres phases sont bloquées.

---

*Document généré le 5 février 2026*  
*Pour guider l'intégration complète de Queen Bee*


