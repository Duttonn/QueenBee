# Codex Hive: Automation Engine & Scheduler

## 1. Hive Cron System
A visual interface for managing recurring tasks and long-running automation jobs.
- **Job Types:**
    - `GSD_SCAN`: Periodic workspace analysis for improvements.
    - `SYNC_REPOS`: Background fetching of GitHub/GitLab updates.
    - `DATA_GEN`: Continuous dataset generation (e.g., Blackjack hands).
    - `MAINTENANCE`: Cleanup of temp worktrees and build artifacts.

## 2. Integrated Scheduler UI
A new dashboard view to manage these jobs without touching crontab.
- **Controls:** Create, Pause, Resume, and Delete jobs.
- **History:** View logs of the last 10 executions for each job.
- **Status:** Real-time indicator of the next scheduled run.

## 3. Autonomous Triggering (The "Queen's Pulse")
The Queen Bee can suggest and set up schedules automatically based on project needs.
- *Example:* "I noticed you're generating a large dataset. Should I schedule this to run every night at 2 AM?"

## 4. UI Implementation: `AutomationDashboard.tsx`
A dedicated section in the Hive for orchestrating time-based agent work.
