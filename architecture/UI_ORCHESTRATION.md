# Global Orchestrator: UI Control Protocol

## Concept: "The Agent is the User"
Instead of the Orchestrator calling backend APIs directly, it interacts with a **State Management Layer** (Redux/Zustand) that the Frontend observes.

## 1. Action Schema (JSON-RPC style)
The UI exposes a set of executable actions to the Orchestrator:
```json
{
  "action": "CREATE_PROJECT",
  "params": { "name": "New Research", "path": "/home/fish/clawd/research" }
}
```
or 
```json
{
  "action": "SPAWN_AGENT",
  "params": { "projectId": "bj-1", "agentName": "Strategist", "model": "gemini-flash" }
}
```

## 2. Real-Time Sync via WebSocket
- The Frontend connects to the ProxyBridge via WebSocket.
- When the Orchestrator (on the server) emits a UI command, the Frontend receives it and updates the local state immediately.
- Result: You see the sidebar update, a chat window open, and an agent start "typing" in real-time, exactly as if you had clicked the buttons.

## 3. Visual Feedback Loop
The Orchestrator can "read" the current UI state to know what's on your screen:
- `GET_UI_STATE` returns a tree of active projects, open agents, and logs.

## 4. Automation Flow
1. User: "Fitch, create a new project for visionOS-v2 and put 3 agents on it."
2. Fitch (Orchestrator): Executes 3 UI-Actions.
3. UI: Automatically opens 3 tabs and displays 3 active agent sessions.
