# Codex Hive: Browser & App Control Bridge (Relay Mode)

## 1. Concept: The "Live Eye"
The Hive implements a **Browser Relay** system similar to Antigravity. It allows agents to treat a web browser (Chrome) or a running application as a live, interactive environment.

## 2. Browser Control Protocol
- **Live Sync:** The agent can attach to a Chrome tab via a dedicated extension or the CDP (Chrome DevTools Protocol).
- **DOM Inspection:** The agent retrieves a semantic snapshot of the page (Aria-tree) instead of raw HTML.
- **Visual Feedback:** High-frequency screenshots are streamed to the Hive UI, showing what the agent "sees."
- **Interaction:** The agent can click, type, and scroll using precise coordinates or semantic selectors.

## 3. "Run" Mode Integration
When a project is in "Run" mode:
- **Application Monitoring:** The Hive attaches a visual debugger to the process.
- **Native Screenshots:** For macOS apps (e.g., Xcode Simulator), it uses the visionOS-MCP screenshot tool.
- **Auto-Fix Loop:** If the browser console shows an error or the app crashes, the agent automatically captures the stack trace and suggests a fix in a new WorkTree.

## 4. UI Implementation: The "Live View" Pane
A specialized view in the Agentic Workbench that displays:
- **Screenshot Stream:** Real-time view of the browser/app.
- **Console Logs:** Integrated stream of browser/app logs.
- **Control Toolbar:** Manual override buttons (Inspect, Refresh, Take Screenshot).

## 5. Security (User-in-the-loop)
- **Attach Permission:** The agent must ask to "attach" to a browser session.
- **Privacy Masking:** Sensitive data (passwords, auth tokens) are blurred in the UI stream if possible.
