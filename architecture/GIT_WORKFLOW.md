# Codex Hive: Git Workflow (Commit & Push)

## 1. Integrated Source Control
Every project and WorkTree in the Hive is a first-class Git citizen. The UI provides direct triggers for core Git operations.

## 2. Automated Commit Logic (AI-Assisted)
Instead of manual messages, the Queen Bee assists in the commit process:
- **Diff Analysis:** Before committing, the Orchestrator runs `git diff` to understand the changes.
- **Message Generation:** It drafts a semantic commit message (e.g., `feat(ui): add Queen Bee command bar`).
- **Review Step:** The user sees the staged files and the suggested message in the UI before confirming.

## 3. The "Sync" Button (Push/Pull)
- **Push:** Triggers `git push origin <branch>`. If a PR is needed, the Queen Bee offers to create one via `gh pr create`.
- **Pull:** Automatically checks for remote changes to prevent merge conflicts during WorkTree creation.

## 4. UI Implementation: Source Control Panel
A new "Source Control" tab or section in the Sidebar/Agent view:
- **Unstaged/Staged Changes:** Visual list of modified files.
- **Commit Input:** Pre-filled with the Queen Bee's suggestion.
- **Push Indicator:** Shows if the local branch is ahead of origin.
