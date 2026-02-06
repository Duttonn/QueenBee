# Codex Clone Architecture: "The Hive"

## 1. Global Orchestrator (The App Brain)
A top-level agent with direct access to the Codex API.
- **Capabilities:** Create/Delete projects, spawn agent runners, manage worktrees, modify UI state.
- **UI Integration:** A persistent chat overlay or a "Command Bar" (Cmd+K) that talks to this orchestrator.

## 2. Structural Hierarchy
- **Workspaces:** The root level (e.g., /home/fish/clawd).
- **Projects:** Logical units of work (e.g., Blackjack, visionOS-MCP).
- **Agents:** Individual execution units assigned to a specific task within a project.
    - Multiple agents per project are supported (Parallel Workers).
    - Status: Idle, Thinking, Working, Blocked.

## 3. WorkTrees (Ephemeral Branches)
Inspired by `git worktree` and `Claude Code`.
- **Logic:** When an agent starts a non-trivial task, a `WorkTree` is created (symlink-based or fast-copy).
- **Isolation:** Agents work on their own files without polluting the `master` source.
- **Merge Agent:** A specialized high-reasoning agent that reviews the WorkTree diff and applies it to the main project branch upon user approval.

## 4. Agenting Loop & Runner (OpenClaw Style)
- **Agent Runner:** A persistent process that manages tool calls, context length, and model switching.
- **Shared Memory:** Projects have a local `MEMORY.md` that all agents within that project contribute to.
