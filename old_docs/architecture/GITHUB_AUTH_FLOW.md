# Queen Bee: GitHub Authentication - Hybrid Flow Strategy

## 1. The Strategy: Conditional Flow
To support both the **VPS (Server)** and the **macOS App (Local)**, we implement a conditional authentication logic.

### Mode A: Device Flow (Primary for VPS & CLI)
- **Use Case:** When running on the VPS or via SSH where a local browser cannot reach `localhost`.
- **Reasoning:** Since the VPS is remote, standard OAuth redirect to `localhost` will fail. Device Flow allows you to copy a code and authorize on your Mac's browser while the VPS waits for the token.
- **Action:** **YES**, Enable Device Flow. It's the most robust method for remote agentic workflows.

### Mode B: Standard OAuth (Primary for macOS App)
- **Use Case:** When you run the Electron App on your Mac.
- **Reasoning:** The app can easily handle a local redirect (`queenbee://auth-callback`).
- **Benefit:** Smoother UX, no manual code entry.

## 2. Implementation: `GitHubAuthManager.ts`
The manager will detect the environment:
- If `isRemote()`: Triggers `gh auth login --with-token` or the **Device Flow** (Copy/Paste code).
- If `isNative()`: Opens the system browser for a standard OAuth flow.

## 3. Storage
Tokens are stored in the `Keyring.ts` we developed, ensuring they are never committed to git (now blocked by our `.gitignore`).
