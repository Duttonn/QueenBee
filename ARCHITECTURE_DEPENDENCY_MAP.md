# QueenBee System Dependency Map

## Overview
QueenBee operates as a local-first, agent-orchestrated development environment. The architecture is split into three primary layers: Frontend (Dashboard), Bridge (Proxy/Orchestrator), and Native (Electron).

## Dependency Graph

### 1. Frontend (dashboard/)
- **Store Layer:** `useHiveStore` (Zustand) - Global state for Hive, Agents, Threads, Tasks.
- **Component Layer:**
    - `CodexLayout`: Main UI frame.
    - `MissionBoard`: Orchestration hub (AgentFleetMonitor, CostSentinel).
    - `BrowserPanel`: Navigator for browsing tasks.
- **Service Layer:** `SystemService` (Logs, API interactions).
- **Hooks:** `useSocketEvents` (Backend communication), `useHiveStore` (State access).

### 2. Bridge (proxy-bridge/)
- **Core Controller:** `BrowserControlService` (Puppeteer/CDP integration).
- **Communication:** `socket-instance` (Socket.io) - Real-time relay to frontend.
- **API Endpoints:** `/api/browser/*` - REST endpoints for browser actions (navigation, DOM, interaction).
- **Logic Hub:** `HiveOrchestrator` - Agent lifecycle and swarm management.

### 3. Native (electron/)
- **FS Manager:** `NativeFSManager` - Direct file system access.
- **Bridge:** `preload.ts` - Exposes native methods to the renderer via contextBridge.

## Core Data Flows
- **Browser Automation Flow:**
  - `BrowserPanel.tsx` (UI) → `fetch(/api/browser/*)` → `BrowserControlService` (Bridge) → `Puppeteer` → Browser.
- **Agent Orchestration Flow:**
  - `HiveOrchestrator` → `socket.io` → `useHiveStore` → `Dashboard Components`.

## New Additions
- **Pinchtab Integration:** Integrated as an orchestration tool within `BrowserControlService` for stealth research.
- **Mission Control UI:** Added to `dashboard/src/components/mission-control/`.
- **SOUL Schema:** Persistent agent-task state schema in `useHiveStore`.
