# Session Relay Buffer: Context Preservation Protocol

## Concept: The "Continuity Bridge"
When switching between models (e.g., from a high-reasoning Tier 1 to a cost-effective Tier 2), the Orchestrator must ensure the new model has perfect situational awareness without redundant token waste.

## 1. The Relay Snapshot
Before a handoff, the outgoing agent generates a **Relay Snapshot**:
- **Objective Summary:** What was the goal?
- **Current State:** What has been accomplished?
- **Pending Actions:** What needs to be done next?
- **Critical Constraints:** Which project-specific rules must be followed?

## 2. Storage & Injection
- Snapshots are stored in `/home/fish/clawd/projects/codex-clone/sessions/relay_cache.json`.
- When the new model starts, the Orchestrator injects the snapshot as a **System-Priority Message**.
- This avoids re-sending thousands of lines of raw logs and focuses only on the "Distilled Truth."

## 3. Atomic File Context
The Relay Buffer also tracks the list of files modified in the current session.
- The new agent automatically "pre-reads" the head of these files to ensure it understands the latest code changes.

## 4. UI Implementation
In the `OrchestratorPulse` UI, a "Handoff" animation triggers:
- `[SNAPSHOT] Distilling context from Claude 4.5...`
- `[INJECT] Passing 1.2k tokens of state to Gemini 1.5...`
- `[RESUME] Gemini is now active.`
