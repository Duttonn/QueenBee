# Codex Hive: Multi-Forge Support (GitHub & GitLab)

## 1. Abstract Forge Adapter
The Hive now uses an internal `ForgeAdapter` interface to treat GitHub and GitLab identically.
- **Providers:**
    - `GitHubAdapter`: Uses `gh` CLI.
    - `GitLabAdapter`: Uses `glab` CLI.

## 2. GitLab Integration Features
- **Project Discovery:** Scans your GitLab instance (Global or Self-hosted) via `glab repo list`.
- **Merge Requests (MR):** Mirrors the PR workflow but adapted for GitLab's terminology and API.
- **CI/CD Integration:** Monitors GitLab CI pipelines in real-time.

## 3. Universal Forge Switcher
The UI in the `UniversalAuthModal` now includes a GitLab option.
- Requires: Personal Access Token (PAT) and optional Host URL (for private instances).
- Command: `glab auth login` is used in the background to bridge the CLI.

## 4. UI Implementation
The Sidebar "Remotes" section now groups projects by forge:
- 🐙 **GitHub** (Duttonn)
- 🦊 **GitLab** (natao.dutton)
