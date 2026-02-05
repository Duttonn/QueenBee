# Codex Hive: Pull Request Management

## 1. Context-Aware PR Generation
The Queen Bee doesn't just push code; she prepares the submission for review.
- **Content Distillation:** Scans the changes in the current WorkTree.
- **Template Application:** Uses the project's `.github/pull_request_template.md` if available.
- **Semantic Summary:** Writes a detailed PR description explaining *why* changes were made, what files were touched, and any testing performed.

## 2. PR Lifecycle Controls
The UI provides actions to manage the PR without the GitHub web interface:
- **`gh pr create`**: Automated branch creation and submission.
- **`gh pr status`**: Real-time monitoring of CI/CD checks directly in the Hive dashboard.
- **`gh pr merge`**: Final merge button that triggers once all agents and CI checks approve.

## 3. UI Implementation: The "Review & Ship" Panel
A specialized view that appears after a successful `Commit`:
- **PR Draft Preview:** Edit the AI-generated title and description.
- **CI Status Icons:** Real-time visibility of GitHub Actions.
- **Merge Logic Selector:** Choose between Squash, Rebase, or Merge Commit.
