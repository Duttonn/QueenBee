# Orchestrator Visualization & Pre-Flight Logic

## 1. Visual Execution Graph
The Orchestrator UI will display a **Real-Time Task Graph**.
- **Nodes:** Project creation, WorkTree branching, Agent spawning, Code scanning.
- **Lines:** Dependencies (e.g., "Merge Agent" waiting for "Coder Agent" to finish).
- **Status:** Pulse animation for active nodes, Green for success, Red for failure.

## 2. Pre-Flight Prompt Engineering (The "Review" Step)
Before an agent is officially launched on a task, the Global Orchestrator performs a **Contextual Prep**:
1. **Context Extraction:** Scans the specific project directory for relevant files (README, schemas, recent diffs).
2. **Prompt Drafting:** Generates a draft prompt tailored to the task + project context.
3. **User Checkpoint:** Displays the drafted prompt and the planned task graph in the UI.
4. **Validation:** User can "Tweak & Launch" or just "Auto-Approve".

## 3. Real-Time Activity Feed
A vertical "terminal-style" log in the dashboard showing the low-level thoughts of the Orchestrator:
- `[09:12] Scanning BlackjackAdvisor/src/logic...`
- `[09:13] Detected outdated KellyCriterion logic.`
- `[09:13] Drafting prompt for 'Refactor Agent'...`
- `[09:14] Launching WorkTree: feat/kelly-fix`
