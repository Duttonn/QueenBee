# Queen Bee: Multi-User Cloud Persistence Layer

## 1. Concept: Account-Bound State
To ensure session continuity across logins and devices, the Hive state must be persisted in a centralized database (Server-side) linked to the `userId`.

## 2. Architecture Change
- **From:** Client-side only (localStorage).
- **To:** Hybrid Sync (Local cache + Server database).

## 3. Data Flow
1. **Login:** User authenticates via the `UniversalAuthModal`.
2. **Pull:** The HiveOrchestrator fetches the stored JSON state for that specific user from the VPS storage (`/home/fish/.codex/user_states/<userId>.json`).
3. **Hydrate:** The Zustand store is populated with the fetched data.
4. **Push:** Every significant UI event (`SPAWN_AGENT`, `MERGE_PR`) triggers an async background push to the server to update the cloud snapshot.

## 4. Security
- States are stored in a protected directory on the VPS.
- Encrypted at rest using the user's secure key if required.

## 5. UI Implementation
- The `UniversalAuthModal` now handles session lifecycle.
- Visual indicator: "Synced to Cloud" status in the sidebar.
