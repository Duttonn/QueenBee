# Queen Bee: System Integration & Orchestration Logic

## 1. The "Feature-to-PR" Pipeline
A unified sequence ensuring every task follows a production-grade lifecycle.

1. **TRIGGER:** User/QueenBee initiates task via Command Bar.
2. **BRANCH:** `WorkTreeManager` creates an ephemeral git worktree.
3. **SETUP:** `LocalEnvironmentManager` runs `.codex/setup.sh` inside the worktree.
4. **WATCH:** `AutoContextManager` starts `FileWatcher` on the worktree path.
5. **EXECUTE:** `AutonomousRunner` executes the agent loop using `ModelSuccession` (Relay).
6. **VERIFY:** 
    - `ScreenshotAnalyzer` compares UI via `VisualUIDiff`.
    - `RuntimeBridge` runs semantic assertions in the live app.
7. **SHIP:** `UniversalForgeAdapter` creates a Pull Request/Merge Request.
8. **CLEANUP:** `WorkTreeManager` removes the ephemeral directory after merge.

## 2. Integrated Event Bus (Orchestrator Logic)
The `GlobalOrchestrator` now acts as a central event dispatcher:
- **`ON_AGENT_SUCCESS`** -> Triggers `VisualDiff` UI mode.
- **`ON_UI_APPROVE`** -> Triggers `ForgeAdapter.createPR`.
- **`ON_PR_MERGE`** -> Triggers `WorkTree.cleanup` and `AutoContext.rebase`.

## 3. Data Flow Persistence
- **Global Store:** State is persisted in `/home/fish/.codex/hive_state.json` to survive VPS restarts.
- **Project Memory:** Shared findings are synced between the `InboxManager` and the project's `MEMORY.md`.
