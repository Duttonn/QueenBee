# Hive Intelligence: Model Preference & Succession Logic

## 1. Preference Stack
Each project or agent can be configured with a **Model Preference Stack**.
- **Tier 1 (Preferred):** e.g., `google-antigravity/claude-opus-4-5-thinking` (High reasoning).
- **Tier 2 (Fallback/Successive):** e.g., `google/gemini-3-flash-preview` (Cost-efficient).
- **Tier 3 (Local):** `ollama/llama3` (Privacy/Offline).

## 2. Dynamic Succession (The "Relay" System)
The Global Orchestrator monitors agent lifecycle events via the ProxyBridge.
1. **Task Completion:** When an agent finishes its specific sub-task (e.g., "Refactor logic"), the Orchestrator evaluates if the *next* step (e.g., "Unit Testing") requires the same high-tier model.
2. **Model Hot-Swap:** If the high-tier model has reached a token limit or the task complexity has decreased, the Orchestrator automatically "relays" the context to the next model in the Preference Stack.
3. **Session Continuity:** The new model receives the full summary of the previous model's work to ensure zero-loss transitions.

## 3. Account Multi-Tenancy
The Queen Bee detects which accounts have available quota:
- If `Account_A` (Dassault) is throttled, she automatically switches the Preference Stack to `Account_B` (Personal) without interrupting the workflow.

## 4. UI Implementation
In the `UniversalAuthModal`, a "Star" icon next to models allows the user to rank them. The Sidebar shows the current model and the "Next in Line" icon.
