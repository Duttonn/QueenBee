# Codex Hive: Deep Inspector & Live Runtime Bridge

## 1. The Strategy: The Custom Runtime Proxy
To achieve "Atlas-level" precision without building a full browser from scratch, we use a **Bi-directional Bridge** injected into the app's runtime.

### Web Apps (React/Next.js)
- **Injection:** We inject a `codex-inspector.js` script into the dev server (via Vite plugin or local proxy).
- **Precision:** This script communicates directly with the React DevTools hook to map UI elements to their exact source file and line number (e.g., `Button.tsx:24`).
- **Interaction:** The agent doesn't just click "pixels"; it sends a `CLICK_COMPONENT(id)` event that the runtime executes.

### Native Apps (visionOS/iOS)
- **MCP Bridge:** We use the existing `visionOS-MCP` to query the **RealityKit Entity Tree**.
- **Visual Inspection:** We correlate the Entity Tree with the AXe (Accessibility) labels to provide the agent with a semantic map of the 3D space.

## 2. Integrated Inspector UI
A "Mirror" of the app inside the Hive Workbench:
- **Overlay:** When you hover over an element in the Hive's "Live View," it highlights the component in the real app.
- **Bi-sync:** Selecting a line of code in the "Code Bridge" highlights the UI element, and clicking a UI element opens the corresponding file in the Worktree.

## 3. The "Auto-Test" Loop
1. **Action:** Agent implements a feature in a Worktree.
2. **Run:** Hive launches the app in "Live Runtime" mode.
3. **Inspect:** The `DeepInspector` verifies the element exists using the Runtime Bridge.
4. **Assert:** The agent executes a script (e.g., "Verify the counter increments when clicked") via the bridge.
5. **Report:** If the runtime returns a console error or a failed assertion, the agent auto-restarts the loop.

## 4. Implementation: `RuntimeBridge.ts`
This module manages the WebSocket connection between the Hive and the `codex-inspector` script running inside your app.
