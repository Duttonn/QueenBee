# QueenBee - AI Agent Command Center
## Comprehensive Codebase Documentation

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Backend (proxy-bridge)](#backend-proxy-bridge)
5. [Frontend (dashboard)](#frontend-dashboard)
6. [Electron Desktop App](#electron-desktop-app)
7. [State Management](#state-management)
8. [API Communication](#api-communication)
9. [Git Worktrees](#git-worktrees)
10. [Key Features](#key-features)
11. [Technology Stack](#technology-stack)
12. [Phase 7 Roadmap (VoxYZ Agent Coordination)](#phase-7-roadmap-voxyz-agent-coordination)

---

## Project Overview

**QueenBee** is an AI Agent Command Center that orchestrates autonomous AI agents to develop software. It follows a hive metaphor:
- **Queen Bee**: Global orchestrator (the brain)
- **Worker Bees**: Specialized agents per project/task
- **Worktrees**: Isolated git branches for each task

The application is built as a native macOS desktop app using Electron, with a React/Vite frontend and Next.js backend.

---

## Architecture Overview

### Design Pattern: "Backend Truth, Frontend Mirror"

QueenBee follows a CQRS-lite pattern where:
- **Backend** (proxy-bridge): Processes commands, mutates filesystem, broadcasts events (single source of truth)
- **Frontend** (dashboard): Sends commands via REST, receives reactions via Socket.io (display-only, never generates its own data)

### Event-Driven Communication

Real-time updates are powered by Socket.io with ~15+ named events:
- `CMD_SUBMIT` - User command submission
- `QUEEN_STATUS` - Queen orchestrator status updates
- `FILE_CHANGE` - Filesystem change notifications
- `DIFF_UPDATE` - Git diff updates
- `TOOL_EXECUTION` - Tool execution events
- `WORKFLOW_COMPLETE` - Task completion notifications

### 3-Layer Memory Architecture

1. **Working Memory**: Thread-specific (ephemeral)
2. **Shared Memory**: `MEMORY.md` file (project-level)
3. **Long-term Memory**: Future vector RAG implementation

---

## Project Structure

```
QueenBee/
├── proxy-bridge/          # Next.js backend API (port 3000)
│   ├── src/
│   │   ├── lib/           # 90+ service modules
│   │   ├── pages/api/     # 70+ API endpoints
│   │   ├── utils/         # Utilities
│   │   └── middleware.ts
│   └── server.ts
├── dashboard/             # React + Vite frontend (port 5173)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   └── store/         # Zustand state management
│   └── index.html
├── electron/              # Electron desktop wrapper
│   ├── main.ts            # Main process
│   ├── preload.ts         # IPC bridge
│   └── NativeFSManager.ts
├── worktrees/             # Git worktree branches (~30 branches)
├── sessions/              # Session relay cache
├── config/                # Local configuration
├── masterdocs/            # Master documentation & prompts
├── architecture/          # Architecture synthesis documents
├── scripts/               # DevOps and utility scripts
├── electron-expert/       # Electron expert skill
├── projects/              # Project workspaces
├── Users/                 # User-specific data
└── notebookresearch/      # Research documents
```

---

## Backend (proxy-bridge)

### Technology
- **Runtime**: Bun
- **Framework**: Next.js (API routes)
- **WebSocket**: Socket.io

### Key Modules (90+ lib modules)

| Category | Modules |
|----------|---------|
| **Orchestration** | `HiveOrchestrator.ts`, `EventLoopManager.ts`, `AutonomousRunner.ts`, `UniversalDispatcher.ts`, `TriggerEngine.ts`, `OrchestrationVisualizer.ts` |
| **Agent Management** | `AgentSession.ts`, `TaskManager.ts`, `Roundtable.ts`, `ProposalService.ts`, `ReactionMatrix.ts`, `MedicAgent.ts`, `AccessibilityAgent.ts`, `SecurityAuditAgent.ts` |
| **LLM/AI** | `UnifiedLLMService.ts`, `LLMProvider.ts`, `ToolExecutor.ts`, `ToolDefinitions.ts`, `PromptOptimizer.ts` |
| **Git Integration** | `WorkTreeManager.ts`, `GitHubSyncService.ts`, `RepoClonerService.ts`, `ConflictResolver.ts`, `GitHubAuthManager.ts`, `RepoContextAggregator.ts` |
| **Memory** | `MemoryStore.ts`, `MemoryDistillation.ts`, `AutoContextManager.ts`, `SessionManager.ts` |
| **Security** | `SecurityAuditor.ts`, `PolicyStore.ts`, `Keyring.ts`, `AccountPersistenceService.ts`, `AccountStateManager.ts` |
| **Providers** | `OpenAIProvider.ts`, `AnthropicProvider.ts`, `GeminiProvider.ts`, `MistralProvider.ts`, `KimiAdapter.ts` |
| **MCP** | `MCPBridge.ts`, `ToolSchemaBridge.ts` |
| **System** | `FileWatcher.ts`, `HealthCheck.ts`, `CronManager.ts`, `CostTracker.ts`, `PerfMonitor.ts`, `EventLog.ts`, `DiagnosticCollector.ts` |
| **Browser Control** | `BrowserControlService.ts`, `BrowserRelay.ts`, `ContextScraper.ts`, `ScreenshotAnalyzer.ts`, `ScreenshotComparator.ts`, `VisualVerificationEngine.ts` |
| **Terminal** | `TerminalSessionManager.ts`, `RuntimeBridge.ts` |
| **Forges** | `ForgeAdapter.ts`, `GitHubAdapter.ts`, `GitLabAdapter.ts` |
| **Learning** | `DiffLearner.ts`, `StyleScraper.ts` |
| **Phase 7 (Implemented)** | `HeartbeatService.ts`, `ProposalService.ts`, `PolicyStore.ts`, `MemoryDistillation.ts`, `ReactionMatrix.ts` |

### API Endpoints (70+)

```
/api/auth/*           - Authentication (login, profiles, GitHub OAuth)
/api/chat             - AI chat with streaming support
/api/projects/*       - Project management, threads, files
/api/git/*            - Git operations (status, diff, commit, worktree)
/api/tasks/*          - Task claiming and completion
/api/execution/*      - Command execution
/api/skills/*         - Skills/MCP management
/api/automations      - Automation scheduling
/api/voice/*         - Voice transcription
/api/config/*        - Configuration management
/api/health          - Health check
/api/providers/*     - LLM provider testing
/api/workflow/ship  - Ship worktree to GitHub/GitLab
/api/roundtable/*    - Multi-agent communication
/api/inbox/*         - Message inbox triage
/api/logs/stream     - WebSocket log streaming
/api/github/*        - GitHub API integration
/api/gitlab/*        - GitLab API integration
/api/terminal/*     - Terminal session management
/api/account/*       - Account persistence
/api/audio/*        - Audio processing
/api/diagnostics    - System diagnostics
/api/events/*       - Event management
/api/policies/*     - Policy management
/api/costs/*        - Cost tracking
/api/usage/*        - Usage statistics
/api/files/*        - File operations
/api/utils/*        - Utility functions
/api/automation/*   - Automation endpoints
```

---

## Frontend (dashboard)

### Technology
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand

### Key Components

#### Layout Components
- `AgenticWorkbench.tsx` - Main workspace layout
- `CodexLayout.tsx` - Code editor layout
- `Sidebar.tsx` - Navigation sidebar
- `GlobalCommandBar.tsx` - Command palette (Cmd+K)
- `GlobalOrchestrator.tsx` - Queen bee visualization
- `AutonomousStatus.tsx` - Agent status display

#### Agent Components
- `AgentStepsPanel.tsx` - Agent execution steps
- `OrchestratorPulse.tsx` - Queen bee pulse animation
- `RoundtablePanel.tsx` - Multi-agent discussion panel
- `ToolCallViewer.tsx` - Tool execution viewer

#### Project Components
- `ProjectOverview.tsx` - Project dashboard
- `DiffViewer.tsx` - Git diff viewer
- `CommitModal.tsx` - Git commit dialog
- `PRPanel.tsx` - Pull request management
- `VisualUIDiff.tsx` - UI visual regression diff

#### Feature Components
- `VoiceInput.tsx` - Voice command input
- `RealTimeLogFeed.tsx` - Live log streaming
- `TerminalPane.tsx` - Terminal emulator
- `XtermTerminal.tsx` - xterm.js wrapper

---

## Electron Desktop App

### Main Process (`main.ts`)

The Electron main process handles:
- **Window Management**: 1400x900 window, hidden title bar, macOS vibrancy
- **Deep Linking**: `queenbee://` protocol for OAuth callbacks
- **Global Shortcuts**: `Cmd+Option+B` to toggle window
- **Menu Bar**: Native macOS menu with Edit, View, Window, Help
- **IPC Communication**: Native notifications, filesystem operations, logging

### Preload Bridge (`preload.ts`)

Exposes secure APIs to renderer:
```typescript
window.electron = {
  clone: (repoUrl, targetDir) => ipcRenderer.invoke('fs:clone', ...),
  read: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  write: (filePath, content) => ipcRenderer.invoke('fs:write', ...),
  fs: { readFile, writeFile, readDir },
  shell: { openExternal, showItemInFolder },
  git: { status, diff },
  dialog: { showOpen, showMessage },
  storage: { encrypt, decrypt },
  notify: (title, body) => ipcRenderer.send('notification:show', ...),
  log: (level, message) => ipcRenderer.send('app:log', ...),
}
```

### NativeFSManager

Provides:
- File cloning and directory operations
- Git repository management
- Shell command execution

---

## State Management

### Zustand Stores

#### 1. `useAppStore` (Global App State)

Manages:
- Automations (scheduled tasks)
- Skills (MCP/plugins)
- Global UI state (command bar)
- Project addition
- Git operations
- Security configuration

#### 2. `useHiveStore` (Project/Agent State)

Manages:
- Projects and threads
- Active agents
- Queen bee status
- Socket.io connection
- Tasks/GSD phases
- Swarm operations

**Key Features**:
- Real-time sync via Socket.io
- Debounced persistence to backend
- Message deduplication (BP-13)
- Unread thread tracking
- Swarm reset functionality

#### 3. `useAuthStore` (Authentication State)

Manages:
- User authentication status
- GitHub OAuth tokens
- Session persistence

---

## API Communication

### REST API Layer (`services/api.ts`)

Key functions:
- `sendChatMessage()` - Send chat to LLM
- `sendChatMessageStream()` - Streaming chat with retry logic
- `getGitDiff()` - Get project diffs
- `getGitBranches()` - List branches
- `executeCommand()` - Run shell commands
- `createWorktree()` - Create git worktree
- `shipWorktree()` - Ship to GitHub/GitLab
- `getProjects()` - Fetch all projects
- `healthCheck()` - Backend health

### WebSocket Layer

Socket.io connection for real-time events:
- Path: `/api/logs/stream`
- Auto-reconnection with exponential backoff
- Connection states: connected, connect_error, disconnect

---

## Git Worktrees

### Worktree Management

QueenBee uses git worktrees for isolated task execution:
- Each task gets its own branch/worktree
- Prevents conflicts between concurrent tasks
- 60+ worktrees currently active

### Naming Convention
- `p1-01`, `p1-02`, etc. - Phase 1 tasks
- `s-01`, `s-02`, etc. - Sprint tasks
- `worker-*-*` - Autonomous agent tasks
- `finish-*` - Completion tasks

### Worktree Operations

```bash
# Create worktree
git worktree add ../worktrees/feature-name -b feature-branch

# Ship worktree (via API)
POST /api/workflow/ship
{ treePath, repoPath, prTitle, prBody }
```

---

## Key Features

### 1. Autonomous Agents
- **Assumption-First Approach**: Plan → Execute → Fix
- Agent types: Logic Bee, UI Bee, Test Bee
- Tool execution with retry logic

### 2. Multi-Provider LLM Support
- OpenAI, Anthropic, Gemini, Mistral
- NVIDIA, Ollama (local)
- Kimi (Chinese provider)

### 3. Skills & MCP Integration
- Extensible via skills
- Model Context Protocol (MCP) servers
- Custom tool definitions

### 4. Git Integration
- Repository cloning
- Branch management
- Diff viewing and staging
- Commit and PR creation

### 5. Real-time UI
- Socket.io live updates
- Diff updates
- Status streaming
- Log tailing

### 6. Voice Input
- Whisper transcription
- Voice commands

### 7. Security
- Command whitelisting
- Keychain integration
- Policy store
- Security audit agent

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Desktop Shell** | Electron |
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Backend** | Next.js (API routes) |
| **Runtime** | Bun |
| **Real-time** | Socket.io |
| **State** | Zustand |
| **Terminal** | xterm.js |
| **Build** | electron-builder |

### Ports
- **Dashboard**: `http://localhost:5173`
- **Proxy Bridge**: `http://localhost:3000`
- **Socket**: `http://localhost:3001`

---

## Phase 7 Roadmap (VoxYZ Agent Coordination)

The following Phase 7 components are planned:

### PolicyStore
- Agent behavior policies
- Resource allocation rules
- Conflict resolution strategies

### HeartbeatService
- Agent health monitoring
- Timeout detection
- Automatic recovery

### ProposalService
- Inter-agent proposal generation
- Consensus building
- Voting mechanisms

### ReactionMatrix
- Agent response patterns
- Decision mapping
- Action triggers

### Memory Distillation
- Context compression
- Key information extraction
- Long-term memory encoding

### Key Research Documents
- `/notebookresearch/Voxyz_ai.pdf` - VoxYZ architecture
- `/notebookresearch/Comparaison des Méthodes de Gestion de Mémoire et de Consensus pour Essaims d'Agents/` - Memory and consensus methods

---

## Development Commands

```bash
# Install dependencies
bun install

# Start dashboard (frontend)
cd dashboard && npm run dev

# Start proxy-bridge (backend)
cd proxy-bridge && bun run dev

# Build Electron app
npm run electron:build

# Development with hot reload
npm run dev:all
```

---

## Current Status (Feb 2026)

- ✅ Phases 1-6: Largely complete
- 🔄 Phase 7: Planned (VoxYZ Agent Coordination)

### Active Worktrees
60+ git worktrees managing concurrent tasks across multiple projects.

---

## References

- Architecture: `/architecture/queen-bee-backend-synthesis.md`
- PRD: `/masterdocs/Queen_Bee_PRD_v3_Ground_Truth.docx`
- Workflow: `/SWARM_WORKFLOW.md`
- Agent Prompts: `/masterdocs/QUEEN_BEE_AGENT_PROMPTS_v2.md`
- Context: `/context.md`

---

*Last Updated: February 2026*
*Version: 3.x*
