# Role: Senior Frontend Architect & UX Engineer
# Project: "Codex Hive" (The Codex App Clone)
# Context: You are building a pixel-perfect reproduction of the OpenAI Codex App UI based on the internal "Hive" architecture documents.

## OBJECTIVE
Generate the React frontend (using TailwindCSS + Lucide React icons) for the "Codex Hive" Desktop App. The UI must be a "Command Center" for orchestrating multiple AI agents.

## 1. GLOBAL LAYOUT & SHELL
Create a `AppShell` component with the following structure:
- **Theme:** "Cyber-Organic" Dark Mode (Slate/Zinc palette).
- **Sidebar (Left):**
  - **Workspaces:** Root level selection (e.g., `/home/fish/clawd`).
  - **Projects:** Tree view separating "Local" (active) and "Remote" (GitHub/GitLab) projects.
  - **Triage & Automations:** Access to the Scheduler Dashboard.
  - **Footer:** User profile & Settings cog.
- **Global Command Bar (Cmd+K):** A centered floating modal ("The Queen's Pulse") for natural language commands. Include a microphone icon for "Voice Prompting" (Ctrl+M).
- **Bottom Drawer (Collapsible):** An integrated terminal view (`xterm.js` style) toggleable via `Cmd+J`.

## 2. CORE FEATURE: UNIVERSAL AUTH MODAL
Implement a `UniversalAuthModal.tsx` that appears on first launch or via Settings.
- **Visuals:** Clean, tabbed interface.
- **Tab 1: Identity:**
  - Input for `OPENAI_API_KEY` (Store in local state/context).
  - Model Preference Stack: A drag-and-drop list to order models (Tier 1: High Reasoning, Tier 2: Flash/Fast, Tier 3: Local).
- **Tab 2: Forges (Source Control):**
  - **GitHub:** Button to "Connect Account" (Simulate OAuth or PAT input).
  - **GitLab:** Input for Host URL and PAT.
- **State:** Show "Connected" green badges when keys are valid.

## 3. CORE FEATURE: THE AGENTIC WORKBENCH
Create the main `ThreadView.tsx`:
- **Header:**
  - **Thread Mode Toggle:** A segmented control for [Local | WorkTree | Cloud].
  - **Model Indicator:** Shows current active model (e.g., "Gemini 3 Pro") and the "Next in Line" fallback.
- **Chat Stream:**
  - Differentiate "User" (bubbles) vs. "Queen Bee" (flat text).
  - **Thought Blocks:** Collapsible "Thinking..." accordions.
  - **Tool Use:** Distinct UI blocks for actions like `run_terminal` or `write_file`.
- **Composer (Input):**
  - Multi-line text area.
  - "Auto Context" Pill: A visual indicator saying "👀 Looking at <CurrentFile>" (Simulating IDE sync).
  - Attachment button for images/screenshots.

## 4. CORE FEATURE: AUTOMATION DASHBOARD
Create a `AutomationScheduler.tsx` view:
- **Visuals:** Card-based grid layout.
- **Job Cards:** Display Job Type (`GSD_SCAN`, `SYNC_REPOS`), Schedule (Cron syntax), and Status (Next run in X hours).
- **Controls:** Play, Pause, and Delete buttons on each card.
- **History:** A mini-log sidebar showing the last 10 execution results (Green Check / Red X).

## 5. CORE FEATURE: DIFF & REVIEW
Create a `DiffViewer.tsx` component:
- **Layout:** Split-pane side-by-side view.
- **Style:** Red background for deletions (left), Green for additions (right).
- **Queen Bee Summary:** A sticky yellow note at the top summarizing the *intent* of the changes.
- **Actions:** "Commit & Ship" button that opens a PR draft preview.

## TECHNICAL CONSTRAINTS
- Use `lucide-react` for all icons.
- Use `framer-motion` for smooth transitions (sidebar collapse, modal fade-in).
- Mock the backend data (projects, logs, diffs) to demonstrate the UI states immediately.
- Ensure the "WorkTree" concept is visually distinct (e.g., a purple border or badge) from "Local" mode.

## EXECUTION STEP
Start by generating the **Universal Auth Modal** and the **App Shell** (Sidebar + Main Layout) so I can "login" and see the structure.