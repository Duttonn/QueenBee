# Codex Hive: Gap Analysis & Roadmap (v2.0)

Based on the official OpenAI Codex app features, here are the missing components we need to implement to achieve parity:

## 1. Thread Modes (The "Missing Triad")
We have local and worktree concepts, but we need to unify them into **Thread Modes**:
- **Local:** Edit project files directly.
- **Worktree:** Isolate in a git worktree (implemented).
- **Cloud:** Execute on a remote instance (useful if your Mac is the UI but the VPS is the runner).

## 2. Integrated Terminal (The Cmd+J experience)
- **Missing:** A terminal pane scoped to the project/worktree.
- **Action:** Add an Xterm.js component to the Dashboard that talks to the VPS shell via WebSocket.

## 3. IDE Sync & "Auto Context"
- **Missing:** Real-time sync with VSCode/Xcode.
- **Action:** Create a small plugin or use a file-watcher that tells The Hive which file you currently have open on your Mac, so the agent can say "I see you're looking at `Sidebar.tsx`...".

## 4. Voice Prompting (The Ctrl+M hold)
- **Missing:** Push-to-talk transcription.
- **Action:** Integrate a Whisper-based transcription service into the Global Command Bar.

## 5. Visual Verification (Screenshot Tool)
- **Missing:** Ability for the agent to take a screenshot and "see" its work.
- **Action:** Bridge your `visionOS-MCP` screenshot capability into the standard agent toolset so it can verify UI changes.

## 6. Security & Approvals (The Sandbox)
- **Missing:** Granular "Approve once" / "Approve for session" UI for tool execution.
- **Action:** Add an approval overlay that triggers before any `exec` or `write` command.

## 7. Sleep Prevention & Notifications
- **Missing:** Background task notifications and `prevent sleep` toggle.
- **Action:** Use Browser Notification API and a WakeLock API implementation.
