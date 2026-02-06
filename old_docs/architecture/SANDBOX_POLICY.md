# Codex Hive: Autonomous Sandbox & Safety Protocol

## 1. Autonomous Execution Policy
Fitch is granted **High Autonomy**. The agent is authorized to implement any feature or architectural improvement deemed beneficial to the Hive project without prior per-task approval.

## 2. The "Notify-First" Loop
Instead of blocking for permission, the execution flow follows a **Non-Blocking Notification** pattern:
1. **Decision:** Agent identifies a valuable feature/fix.
2. **Notification:** Agent sends a message to Natao (Telegram) explaining *what* it is doing and *why*.
3. **Execution:** Agent proceed with implementation immediately.
4. **Validation:** Agent reports completion with a diff or status update.

## 3. The Sandbox Layer
While autonomous, work remains scoped to the project environment:
- **Project Isolation:** Agents work within their assigned `WorkTrees` or `/home/fish/clawd` subdirectories.
- **Resource Limits:** Automatic monitoring of token spend and process duration.
- **Undo Capability:** All autonomous changes are committed to git, allowing for one-click reverts if a "surprise" feature is not desired.

## 4. UI Implementation: `ApprovalOverlay.tsx` (Passive Mode)
A discrete status bar at the bottom of the screen showing "Autonomous Work in Progress":
- Displays the current task the agent decided to tackle.
- Provides a "Pause" button if the user wants to take manual control.
