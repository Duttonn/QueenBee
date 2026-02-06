# Queen Bee: Local-First Config & Data Portability

## 1. Concept: "Your Data is Yours"
To mirror the 'Local-First' philosophy of Clawdbot and avoid the complexity of a centralized user database, Queen Bee prioritizes local storage with powerful **Import/Export** capabilities.

## 2. Config Sovereignty
- **Identity:** Your "Account" is a local profile stored in `~/.codex/profiles/default.json`.
- **Portability:** Instead of a cloud login, the Hive provides a one-click "Export Hive Snapshot" feature.
- **Format:** A single `.hive` (encrypted JSON) file containing all your project links, agent history, and auth tokens.

## 3. Workflow
1. **Setup:** Install Queen Bee on Mac or VPS.
2. **Work:** All data stays on the machine.
3. **Migrate:** Export config from the VPS dashboard, Import it into the Mac Electron App.
4. **Result:** Instant parity across environments without any cloud hosting.

## 4. UI Implementation
- **Settings Pane:** "Download Configuration" and "Restore from Backup" buttons.
- **Auto-Backup:** Periodic snapshots saved to `/home/fish/clawd/backups/`.

## 5. Security
- Tokens are encrypted with a local machine-specific salt.
- Exported files can be password-protected.
