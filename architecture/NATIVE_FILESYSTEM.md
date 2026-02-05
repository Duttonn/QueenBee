# Queen Bee: Native Shell & Filesystem Strategy

## 1. The Technology: Electron + IPC Bridge
To move from a "Sandboxed Web App" to a "Native System Controller," we use **Electron**.
- **Main Process (Node.js):** Runs with full system privileges. It can execute `git clone`, `mkdir`, and edit files anywhere on your Mac.
- **Renderer Process (React):** Your UI, which stays fast and beautiful.
- **IPC (Inter-Process Communication):** The bridge that lets the UI say "Clone this repo" and the Main process execute it on the real filesystem.

## 2. Local vs Remote Execution (Hybrid Mode)
The Hive will support two target environments:

### Target: THIS MAC (Native Mode)
- **Filesystem:** The app works in `/Users/natao/Developer/QueenBee/...`
- **Runner:** Uses the local Node.js/Python on your Mac.
- **Sync:** Instant. No need for WebSockets to see file changes.

### Target: VPS (Remote Mode) - Current Setup
- **Filesystem:** Works in `/home/fish/clawd/projects/...` on the Linux server.
- **Communication:** Secure WebSocket link between the Mac App and the VPS.
- **Use Case:** Heavy tasks like 150k Blackjack data generation or background security audits.

## 3. Implementation: `NativeFSManager.ts`
We are adding a layer that abstracts the filesystem:
- `fs.readFile()` will automatically decide whether to read from your Mac's SSD or the VPS Disk based on the active project's "Host" setting.

## 4. Why this solves the "Start Thread" issue:
When you click "New Thread" in the Mac App:
1. You select "Location: Local Mac".
2. The App triggers a native `git clone` into your local Dev folder.
3. The Worker Bees (Agents) get direct path access to your local files.
