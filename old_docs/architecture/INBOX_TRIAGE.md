# Queen Bee: Inbox Triage & Autonomous Findings

## 1. Concept: The "Triage Center"
Following the OpenAI PRD, the Inbox acts as a filtered feed for autonomous findings. Background jobs (GSD scans, security audits, performance tests) deposit results here.

## 2. Triage Logic
- **Findings with Impact:** Errors, performance bottlenecks, or accessibility gaps appear in the Sidebar "Triage" section.
- **Silent Success:** Clean runs (e.g., all tests passed) are auto-archived unless specified.
- **Actionability:** Each finding comes with a "Fix this" button, which drafts a Super-Prompt for the Queen Bee.

## 3. Implementation Plan
- Storage: `data/inbox.json`
- API: `/api/inbox/list` and `/api/inbox/action`
- Component: `InboxPanel.tsx`
