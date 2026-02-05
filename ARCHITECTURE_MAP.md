# 🏗️ QUEEN BEE ARCHITECTURE MAP

## Current State vs. Needed State

### LAYER 1: Frontend (Dashboard) ✅ 85% Complete

```
┌─────────────────────────────────────────────────────────┐
│                     DASHBOARD (Vite + React)            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ LoginPage.tsx           → GitHub OAuth UI           │
│  ✓ Sidebar.tsx             → Project/Thread navigation │
│  ✓ CodexLayout.tsx         → Main layout + Composer    │
│  ✓ AgenticWorkbench.tsx    → Chat messages display     │
│  ✓ CustomizationPanel.tsx  → Settings UI               │
│                                                         │
│  ✓ useAuthStore.ts         → Auth state management     │
│  ✓ useHiveStore.ts         → Thread/project state      │
│  ✓ services/api.ts         → API client functions      │
│                                                         │
└─────────────────────────────────────────────────────────┘
                            ↓
                     HTTP (port 3001)
                            ↓
```

### LAYER 2: Backend API (Proxy Bridge) ✅ 75% Complete

```
┌─────────────────────────────────────────────────────────┐
│              PROXY-BRIDGE (Next.js Server)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ /api/auth/github        → OAuth initiation          │
│  ✓ /api/auth/github/callback → OAuth completion        │
│  ✓ /api/chat               → LLM provider router       │
│  ✓ /api/config             → Config read/write         │
│  ✓ /api/git/*              → Git operations            │
│                                                         │
│  ✓ HiveOrchestrator.ts     → Workflow manager          │
│  ✓ WorkTreeManager.ts      → Git worktree ops         │
│  ✓ ForgeAdapter.ts         → GitHub/GitLab client      │
│  ⚠️ ToolExecutor.ts         → MISSING! (critical)       │
│                                                         │
└─────────────────────────────────────────────────────────┘
                            ↓
                   IPC (Electron Bridge)
                            ↓
```

### LAYER 3: Native Layer (Electron) 🔴 20% Complete

```
┌─────────────────────────────────────────────────────────┐
│                 ELECTRON (Main Process)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ main.ts                 → Window creation           │
│  ✓ preload.ts              → IPC API exposure          │
│  ✓ NativeFSManager.ts      → File system handlers      │
│                                                         │
│  IMPLEMENTED HANDLERS:                                  │
│  ✓ fs:clone                → git clone (via shell)     │
│  ✓ fs:read                 → Read file contents        │
│  ✓ fs:write                → Write file contents       │
│  ✓ notification:show       → System notifications      │
│                                                         │
│  MISSING HANDLERS:                                      │
│  ❌ fs:list                 → Directory listing         │
│  ❌ fs:exists               → Path existence check      │
│  ❌ fs:delete               → Delete files/dirs         │
│  ❌ git:diff                → Get git diff              │
│  ❌ git:commit              → Stage + commit changes    │
│  ❌ git:push                → Push to remote            │
│  ❌ git:worktree:create     → Create git worktree       │
│  ❌ git:worktree:remove     → Remove worktree           │
│  ❌ shell:exec              → Execute shell commands    │
│  ❌ shell:spawn             → Spawn long-running proc   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                            ↓
                    macOS/Linux
                            ↓
```

---

## 🔄 DATA FLOW DIAGRAMS

### ✅ WORKING: User Login

```
User clicks "Login with GitHub"
    ↓
LoginPage.tsx → GET /api/auth/github
    ↓
GitHubAuthManager.initiateLogin()
    ↓
Returns: { url: 'https://github.com/login/oauth/...' }
    ↓
Frontend redirects to GitHub
    ↓
User authorizes
    ↓
GitHub redirects to /api/auth/github/callback?code=xxx
    ↓
Backend exchanges code for token
    ↓
⚠️ BUG: Should fetch repos here, but doesn't
    ↓
Returns to frontend with user data
    ↓
App.tsx → handleLoginComplete()
    ↓
useAuthStore.login() ✓
```

### ❌ BROKEN: Agentic File Edit

```
User types: "Add a login button to index.html"
    ↓
CodexLayout handleSendMessage()
    ↓
POST /api/chat with message
    ↓
Backend routes to LLM provider (Gemini/etc)
    ↓
LLM responds: "I'll use write_file tool..."
    ↓
⚠️ BREAKS HERE: No ToolExecutor to parse/execute
    ↓
❌ Tool call ignored, returned as text
    ↓
Frontend shows: "Let me write that file..." (but doesn't)
```

### 🔧 SHOULD BE: Agentic File Edit

```
User types: "Add a login button to index.html"
    ↓
CodexLayout handleSendMessage()
    ↓
POST /api/chat with message + context
    ↓
Backend routes to LLM provider
    ↓
LLM responds with function call:
{
  "name": "write_file",
  "arguments": {
    "path": "index.html",
    "content": "..."
  }
}
    ↓
🆕 ToolExecutor.parseAndExecute()
    ↓
Invokes Electron IPC: window.electron.write(path, content)
    ↓
Electron main: ipcMain.handle('fs:write', ...)
    ↓
fs.writeFile() → File written to disk
    ↓
Result returned to LLM
    ↓
LLM: "I've added the login button to index.html"
    ↓
Frontend displays message + shows file change
```

---

## 🎯 INTEGRATION GAPS

### Gap 1: Tool Execution Pipeline (CRITICAL)

**Status:** 🔴 Not Started

**What exists:**
- LLM can output function calls (JSON format)
- Electron has some IPC handlers
- Frontend can display messages

**What's missing:**
- Parser to extract tool calls from LLM response
- Executor to dispatch to IPC
- Result formatter to send back to LLM
- Error handling for failed operations
- Approval flow (sandbox mode)

**Where to build:** `proxy-bridge/src/lib/ToolExecutor.ts`

**Interface:**
```typescript
interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

class ToolExecutor {
  async execute(toolCall: ToolCall, context: Context): Promise<ToolResult> {
    // 1. Validate tool call
    // 2. Check approval policy
    // 3. Invoke IPC method
    // 4. Format result for LLM
  }
}
```

---

### Gap 2: Git Worktree Lifecycle

**Status:** 🟡 Partially Built

**What exists:**
- WorkTreeManager.create() backend method
- `git worktree add` shell command wrapper
- API endpoint /api/git/worktree

**What's missing:**
1. **Trigger on thread creation**
   - When `addThread()` called, should POST to /api/git/worktree
   - Store worktree path in thread metadata
   - Show worktree status in UI

2. **Diff monitoring**
   - Poll `/api/git/diff` every 5s while thread active
   - Update thread.diff stats in sidebar
   - Show changed files in AgenticWorkbench

3. **Commit flow**
   - Commit button → modal for message
   - Call Electron IPC git:commit
   - Update thread metadata
   - Show success notification

**Where to fix:**
- `useHiveStore.ts` - addThread() method
- `CodexLayout.tsx` - Add useEffect for diff polling
- `electron/NativeFSManager.ts` - Add git handlers

---

### Gap 3: IPC Handler Completeness

**Status:** 🔴 20% Complete

**Current preload.ts API:**
```typescript
window.electron = {
  clone: (url, dir) => IPC,
  read: (path) => IPC,
  write: (path, content) => IPC,
  getNativeContext: () => IPC,
  notify: (title, body) => IPC
}
```

**Needed preload.ts API:**
```typescript
window.electron = {
  fs: {
    read: (path: string) => Promise<string>,
    write: (path: string, content: string) => Promise<void>,
    list: (path: string) => Promise<DirEntry[]>,
    exists: (path: string) => Promise<boolean>,
    delete: (path: string) => Promise<void>,
    clone: (url: string, dir: string) => Promise<void>,
  },
  git: {
    diff: (repoPath: string) => Promise<DiffStats>,
    commit: (repoPath: string, message: string) => Promise<void>,
    push: (repoPath: string) => Promise<void>,
    status: (repoPath: string) => Promise<GitStatus>,
    worktree: {
      create: (repo: string, branch: string) => Promise<string>,
      remove: (path: string) => Promise<void>,
    }
  },
  shell: {
    exec: (command: string, cwd?: string) => Promise<ExecResult>,
    spawn: (command: string, cwd?: string) => ChildProcess,
  },
  notify: (title: string, body: string) => void,
  getNativeContext: () => Promise<NativeContext>
}
```

---

## 📦 DEVELOPMENT WORKFLOW

### Current (Broken)

```
Developer runs: npm run dev
    ↓
Vite starts on :5173
    ↓
Dashboard loads in browser
    ↓
⚠️ window.electron is undefined
    ↓
All IPC features fail
    ↓
Cannot test git, files, or native features
```

### Stage 1: Web Mock Mode (RECOMMENDED FIRST)

```
Developer runs: npm run dev
    ↓
Vite starts on :5173
    ↓
Dashboard detects !window.electron
    ↓
Loads mock-backend.ts service
    ↓
Mock service returns fake data:
  - Fake repos
  - Fake file contents
  - Fake git diffs
    ↓
UI fully functional for layout/design work
```

**Build this:** `dashboard/src/services/mock-backend.ts`

### Stage 2: Electron Dev Mode (WHAT WE NEED)

```
Developer runs: npm run dev:electron
    ↓
Concurrently starts:
  1. Vite on :5173
  2. wait-on http://localhost:5173
  3. Electron main process
    ↓
Electron creates BrowserWindow
    ↓
Loads http://localhost:5173 (Vite dev server)
    ↓
Preload script exposes window.electron
    ↓
Hot reload works via Vite
    ↓
IPC features fully testable
```

**Dependencies needed:**
```bash
npm install --save-dev concurrently wait-on electron electron-builder
```

**Scripts to add:**
```json
{
  "dev": "vite",
  "dev:electron": "concurrently \"npm:dev\" \"npm:electron:wait\"",
  "electron:wait": "wait-on http://localhost:5173 && electron .",
  "build": "vite build && electron-builder"
}
```

---

## 🧪 TESTING STRATEGY

### Unit Tests (Not Started)
- Store actions (zustand)
- API client functions
- IPC handlers

### Integration Tests (Not Started)
- OAuth flow end-to-end
- Thread creation → worktree creation
- Chat message → LLM response

### E2E Tests (Not Started - Playwright)
```typescript
test('full agentic loop', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  
  // Login via dev bypass
  await page.click('text=Dev Bypass');
  
  // Create thread
  await page.click('text=New thread');
  
  // Send message
  await page.fill('textarea', 'Create hello.txt with "Hello World"');
  await page.press('textarea', 'Enter');
  
  // Verify file created
  await expect(page.locator('text=File created')).toBeVisible({ timeout: 10000 });
  
  const fs = require('fs');
  expect(fs.existsSync('/tmp/test-project/hello.txt')).toBe(true);
});
```

---

## 🚀 IMPLEMENTATION PRIORITY

### P0: Foundation (Blocks Everything)
1. ✅ Electron dev scripts (30 min)
2. ✅ Mock backend service (2 hours)
3. ✅ Complete IPC handlers (4 hours)

### P1: Core Loop (Enables Agentic Features)
4. ✅ ToolExecutor class (1-2 days)
5. ✅ OAuth repo fetch (2 hours)
6. ✅ Worktree lifecycle (1 day)
7. ✅ Diff polling (3 hours)

### P2: UX Polish
8. ⬜ Streaming chat (1 day)
9. ⬜ Voice input (1 day)
10. ⬜ Slash commands (4 hours)
11. ⬜ File picker (@) (3 hours)

### P3: Advanced
12. ⬜ Approval flow (1 day)
13. ⬜ Multi-agent spawning (2 days)
14. ⬜ Automations scheduler (1 day)
15. ⬜ E2E tests (1 week)

---

## 💾 CODE EXAMPLES

### Example: Adding git:diff IPC Handler

**1. Update preload.ts:**
```typescript
git: {
  diff: (repoPath: string) => ipcRenderer.invoke('git:diff', repoPath),
  // ... other methods
}
```

**2. Update NativeFSManager.ts:**
```typescript
import simpleGit from 'simple-git';

setupHandlers() {
  // Existing handlers...
  
  ipcMain.handle('git:diff', async (event, repoPath) => {
    const git = simpleGit(repoPath);
    const diff = await git.diff();
    return diff;
  });
}
```

**3. Update electron.d.ts:**
```typescript
interface IElectronAPI {
  // Existing...
  git: {
    diff: (repoPath: string) => Promise<string>;
  };
}
```

**4. Use in frontend:**
```typescript
const diff = await window.electron.git.diff('/path/to/project');
console.log('Diff:', diff);
```

---

### Example: Creating ToolExecutor

**proxy-bridge/src/lib/ToolExecutor.ts:**
```typescript
export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

export class ToolExecutor {
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    console.log(`[ToolExecutor] Executing: ${toolCall.name}`);
    
    switch (toolCall.name) {
      case 'read_file':
        return this.readFile(toolCall.arguments.path);
      
      case 'write_file':
        return this.writeFile(toolCall.arguments.path, toolCall.arguments.content);
      
      case 'list_directory':
        return this.listDirectory(toolCall.arguments.path);
      
      case 'shell_exec':
        return this.shellExec(toolCall.arguments.command, toolCall.arguments.cwd);
      
      default:
        return { success: false, error: `Unknown tool: ${toolCall.name}` };
    }
  }
  
  private async readFile(path: string): Promise<ToolResult> {
    // Call Electron IPC or local fs depending on environment
    try {
      const content = await fs.readFile(path, 'utf-8');
      return { success: true, output: content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // ... other tools
}
```

**Integration in chat endpoint:**
```typescript
// In /api/chat
const response = await llm.chat(messages);

// Check if response has function call
if (response.choices[0].message.function_call) {
  const toolCall = response.choices[0].message.function_call;
  const executor = new ToolExecutor();
  const result = await executor.execute(toolCall);
  
  // Send result back to LLM
  const secondResponse = await llm.chat([
    ...messages,
    response.choices[0].message,
    { role: 'function', name: toolCall.name, content: JSON.stringify(result) }
  ]);
  
  return secondResponse;
}
```

---

**This architecture map shows exactly what's built, what's missing, and how to connect the pieces.**
