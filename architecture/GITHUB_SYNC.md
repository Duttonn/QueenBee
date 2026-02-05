# Codex Hive: GitHub Sync & Remote Projects

## 1. GitHub Integration Layer
The Hive uses the `gh` CLI as a primary data source for project discovery.
- **Repository Sync:** The Queen Bee periodically runs `gh repo list` to identify your active repositories.
- **Cloud/Local Mapping:** Projects are categorized as:
    - `LOCAL`: Already cloned in `/home/fish/clawd/`.
    - `REMOTE`: Available on GitHub but not yet on the VPS.

## 2. On-Demand Cloning (The "One-Click" Setup)
If the user selects a `REMOTE` project in the Sidebar:
1. The Global Orchestrator triggers `gh repo clone <name>`.
2. It automatically initializes the `GSD_TASKS.md` and `MEMORY.md` for that new project.
3. The UI state updates instantly to transition the project from "Remote" to "Local Agentic".

## 3. PR & Issue Intelligence
The Hive can "read" GitHub Issues and PRs to generate autonomous tasks:
- **Auto-Triage:** When a new issue is detected, the Queen Bee drafts a `GSD_TASK` to fix it.
- **WorkTree PRs:** Agents can automatically open a PR on GitHub once their WorkTree merge is approved.

## 4. UI Implementation
The Sidebar now includes a "GitHub" section under "Local Projects" showing your remote repos with a "Clone to Hive" button.
