# Codex Hive: Skill & MCP Integration Layer

## 1. Skill Registry
Codex Hive mirrors Clawdbot's skill system but adds a UI-managed directory.
- **Local Skills:** Stored in `/home/fish/clawd/skills/`.
- **Skill Discovery:** The Queen Bee scans these directories to identify available tools (e.g., `gsd-autonomy`, `video-frames`).
- **Dynamic Attachment:** The user can drag-and-drop a skill onto an agent in the sidebar to grant it those capabilities.

## 2. MCP (Model Context Protocol) Bridge
The Hive can connect to any external MCP server (like your visionOS-MCP).
- **Configuration:** Stored in `projects/codex-clone/architecture/MCP_CONFIG.json`.
- **Multi-Server Support:**
    - `visionOS-MCP`: For simulator control and coordinate projection.
    - `Xcode-MCP`: For build monitoring and error fixing.
    - `Filesystem-MCP`: For advanced RAG and search.

## 3. Tool Orchestration
When an agent is spawned, the Queen Bee selects the necessary skills and MCP endpoints based on the task.
- *Example:* A task to "Fix visionOS UI" will automatically attach the `visionOS-MCP` and the `skill-creator` skill.

## 4. UI Implementation: The "Toolbelt"
- A drawer in the Sidebar shows all installed Skills and active MCP Servers.
- Visual status indicators show if an MCP server is online/offline.
