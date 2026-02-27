# QueenBee Implementation Plan - Comprehensive Refactoring & Enhancement Guide

> **Version:** 2.0  
> **Date:** February 2026  
> **Goal:** Transform QueenBee from a sophisticated prototype into the definitive autonomous multi-agent coding platform that dominates the competition  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Critical Fixes (P0)](#critical-fixes-p0)
4. [High-Impact Features (P1)](#high-impact-features-p1)
5. [Competitive Differentiation Strategy](#competitive-differentiation-strategy)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Technical Deep Dives](#technical-deep-dives)

---

## Executive Summary

QueenBee represents perhaps the most ambitious autonomous multi-agent coding platform ever attempted at the indie level. With **150+ backend modules**, **18 completed phases**, and features rivaling enterprise products like ComposioHQ, the codebase demonstrates extraordinary technical ambition.

However, the gap between "implemented" and "production-ready" remains significant. This plan identifies the critical path to market dominance.

### The Three Pillars of Differentiation

| Pillar | Competitors | QueenBee's Advantage |
|--------|-------------|---------------------|
| **Memory** | Cursor, Claude Code reset every session | Persistent cross-session memory with semantic graph (P17-04) |
| **Parallelism** | All competitors are single-agent | True multi-agent swarms with worktree isolation |
| **Self-Evolution** | None | GEA (Group-Evolving Agents) with experience archive |

---

## Current Architecture Analysis

### Backend Stack (proxy-bridge/)

```
proxy-bridge/src/
├── lib/                           # 150+ modules
│   ├── AgentSession.ts           # Think→Act→Observe loop
│   ├── AutonomousRunner.ts       # Lifecycle state machine (CO-01)
│   ├── ToolExecutor.ts           # 20+ tools with security audit
│   ├── SessionManager.ts         # Thread lifecycle + abort signals
│   ├── HeartbeatService.ts       # 5-minute tick for recovery
│   ├── MemoryStore.ts            # Semantic graph with confidence decay
│   ├── ExperienceArchive.ts      # GEA cross-session traces
│   ├── GEAReflection.ts         # Evolutionary directive generation
│   ├── ByzantineDetector.ts      # 5 fault signals
│   ├── ContextCompressor.ts      # 2-pass compression (P18-08)
│   ├── Roundtable.ts             # Team communication channel
│   ├── ProposalService.ts        # Debate + judgment system
│   ├── SkillsManager.ts          # YAML workflow templates
│   ├── HashlineIndex.ts          # Hash-anchored edits
│   └── [140+ more modules]
├── pages/api/                    # REST endpoints
│   ├── chat.ts                  # Main agent execution
│   ├── git/                     # Worktree operations
│   ├── providers/               # Multi-LLM fallback
│   └── [30+ more endpoints]
└── server.ts                     # Next.js entry + Socket.io
```

### Frontend Stack (dashboard/)

```
dashboard/src/
├── App.tsx                      # Root with socket initialization
├── components/
│   ├── layout/
│   │   ├── CodexLayout.tsx     # Main shell
│   │   ├── Sidebar.tsx         # Thread grouping + swarm
│   │   ├── AgenticWorkbench.tsx # Message display
│   │   └── ComposerBar.tsx     # Input with @qb trigger
│   └── agents/
│       ├── AgentStepsPanel.tsx  # Plan visualization
│       └── RoundtablePanel.tsx  # Team chat UI
├── hooks/
│   ├── useSocketEvents.ts       # Real-time event handling
│   └── useVoiceRecording.ts     # Whisper transcription
├── store/
│   ├── useHiveStore.ts         # Zustand global state
│   └── useAuthStore.ts         # Authentication state
└── services/
    └── api.ts                  # Backend communication
```

---

## Critical Fixes (P0)

These bugs block production usage and must be fixed immediately.

### F1: Automations Completely Broken (FEAT-02)

**Current State:** The automation system has 6 critical bugs preventing scheduled tasks from working.

**Files Affected:**
- `proxy-bridge/src/lib/CronManager.ts`
- `proxy-bridge/src/pages/api/automations.ts`
- `proxy-bridge/src/lib/db.ts`
- `dashboard/src/components/layout/AutomationDashboard.tsx`
- `dashboard/src/store/useAppStore.ts`

**Issues Identified:**

| Bug | Location | Impact | Fix Required |
|-----|----------|--------|--------------|
| DELETE URL missing `/api` | `useAppStore.ts:132` | Delete automation fails 404 | Change to `${API_BASE_ROUTES}/automations` |
| `days` field not saved | `db.ts` Automation type | Backend ignores weekday selection | Add `days: string[]` to type + POST handler |
| Days→Cron conversion missing | `CronManager.ts` | `convertToCron` only handles time | Add weekday array → cron field logic |
| No "Run Now" feedback | `automations.ts` | Results only logged to console | Return result in response + update UI state |
| Hardcoded URL in modal | `AutomationDashboard.tsx:625` | Uses localhost instead of API_BASE | Replace with proper API_BASE_ROUTES |
| Template grid disappears | `AutomationDashboard.tsx` | After first automation, can't add more | Show "+ Create New" with template option |

**Implementation:**

```typescript
// proxy-bridge/src/lib/db.ts - Add days field
interface Automation {
  id: string;
  title: string;
  description: string;
  schedule: string;       // cron expression
  days?: string[];        // NEW: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  active: boolean;
  script?: string;
  lastRun?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// proxy-bridge/src/lib/CronManager.ts - Add weekday conversion
convertToCron(time: string, days?: string[]): string {
  const [hours, minutes] = time.split(':');
  
  if (!days || days.length === 0) {
    // Daily
    return `${minutes} ${hours} * * *`;
  }
  
  // Convert day names to cron format (0=Sun, 1=Mon, ...)
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  
  const cronDays = days.map(d => dayMap[d]).join(',');
  return `${minutes} ${hours} * * ${cronDays}`;
}

// dashboard/src/store/useAppStore.ts - Fix DELETE URL
deleteAutomation: async (id: string) => {
  const res = await fetch(`${API_BASE_ROUTES}/automations/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  // ...
}
```

---

### F2: Skills System Is Stub (FEAT-03)

**Current State:** The `SkillsManager` only stores skill names in the database with no actual functionality. The real pattern (from worktrees) uses `.gemini/skills/<slug>/SKILL.md` files.

**Files Affected:**
- `proxy-bridge/src/lib/SkillsManager.ts` (needs rewrite)
- `proxy-bridge/src/pages/api/skills.ts` (needs backend logic)
- `dashboard/src/components/layout/SkillsManager.tsx` (needs editor)
- `proxy-bridge/src/lib/AutonomousRunner.ts` (needs integration)

**The Real Skills Pattern:**

```
project/.queenbee/skills/
├── add-api-endpoint/
│   └── SKILL.md
├── write-unit-test/
│   └── SKILL.md
├── refactor-to-async/
│   └── SKILL.md
└── electron-expert/
    └── SKILL.md
```

**SKILL.md Format:**

```markdown
---
name: Add API Endpoint
description: Creates a REST API endpoint with Express/Fastify
triggers:
  - add api
  - create endpoint
  - new route
steps:
  - name: Create route file
    tool: write_file
    path: src/api/{{name}}.ts
    template: |
      import { Router } from 'express';
      const router = Router();
      
      router.get('/{{name}}', async (req, res) => {
        // TODO: Implement
      });
      
      export default router;
  - name: Register in app
    tool: search_and_replace
    pattern: app.use
success_criteria:
  - Route file created
  - Imports in main app
  - Basic test passes
```

**Implementation:**

```typescript
// proxy-bridge/src/lib/SkillsManager.ts - Complete rewrite

interface Skill {
  name: string;
  slug: string;
  description: string;
  triggers: string[];
  steps: SkillStep[];
  success_criteria: string[];
}

interface SkillStep {
  name: string;
  tool: string;
  path?: string;
  template?: string;
  pattern?: string;
  command?: string;
}

export class SkillsManager {
  private projectPath: string;
  private skillsDir: string;
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.skillsDir = path.join(projectPath, '.queenbee', 'skills');
  }
  
  async loadAll(): Promise<Skill[]> {
    // Scan .queenbee/skills/ directories
    // Parse SKILL.md YAML frontmatter + markdown body
    return skills;
  }
  
  async load(slug: string): Promise<Skill | null> {
    // Load specific skill by slug
  }
  
  async create(skill: Skill): Promise<void> {
    // Create directory + SKILL.md file
    // Support template variable substitution
  }
  
  async delete(slug: string): Promise<void> {
    // Remove skill directory
  }
  
  async match(taskDescription: string): Promise<Skill | null> {
    // BM25 or keyword match against triggers
    // Return best matching skill
  }
  
  static formatSkillContext(skill: Skill): string {
    // Format for system prompt injection
  }
}
```

---

### F3: Model Providers Incomplete (FEAT-04, FEAT-05)

**Current State:**
- Kimi/Moonshot adapter exists but not wired into UnifiedLLMService
- AnthropicProvider ignores custom apiBase (breaks local proxies)
- Qwen/Alibaba has OAuth setup but no provider registration
- chatStream auto-routing doesn't handle Kimi/Qwen

**Files Affected:**
- `proxy-bridge/src/lib/UnifiedLLMService.ts`
- `proxy-bridge/src/lib/providers/AnthropicProvider.ts`
- `proxy-bridge/src/lib/providers/OpenAIProvider.ts`
- `proxy-bridge/src/lib/KimiAdapter.ts`
- `proxy-bridge/src/lib/auth-manager.ts`

**Implementation:**

```typescript
// proxy-bridge/src/lib/UnifiedLLMService.ts - Add Kimi + Qwen support

// In registerProfile() or initFromEnv():
registerProfile({
  id: 'moonshot',
  name: 'Moonshot (Kimi)',
  provider: new OpenAICompatibleProvider({
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: process.env.MOONSHOT_API_KEY,
    modelMapping: {
      'moonshot': 'moonshot-v1-8k',
      'kimi': 'moonshot-v1-8k',
      'kimi-pro': 'moonshot-v1-128k',
    }
  }),
  supportsStreaming: true,
  supportsVision: false,
  contextWindow: 128000,
});

registerProfile({
  id: 'qwen',
  name: 'Qwen (Alibaba)',
  provider: new OpenAICompatibleProvider({
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.QWEN_API_KEY,
    modelMapping: {
      'qwen': 'qwen-turbo',
      'qwen-plus': 'qwen-plus',
      'qwen-max': 'qwen-max',
    }
  }),
  supportsStreaming: true,
  supportsVision: true,
  contextWindow: 32000,
});

// Fix AnthropicProvider to respect apiBase
export class AnthropicProvider {
  constructor(apiKey: string, apiBase?: string) {
    this.apiKey = apiKey;
    this.baseURL = apiBase || 'https://api.anthropic.com';
  }
}

// Fix chatStream routing
private routeToProvider(modelName: string): LLMProvider {
  const lower = modelName.toLowerCase();
  
  if (lower.includes('gemini')) return this.getProvider('gemini');
  if (lower.includes('gpt') || lower.includes('openai')) return this.getProvider('openai');
  if (lower.includes('claude') || lower.includes('anthropic')) return this.getProvider('anthropic');
  if (lower.includes('mistral')) return this.getProvider('mistral');
  if (lower.includes('moonshot') || lower.includes('kimi')) return this.getProvider('moonshot');
  if (lower.includes('qwen')) return this.getProvider('qwen');
  
  return this.getProvider('auto');
}
```

---

### F4: OAuth Placeholder IDs (FEAT-04)

**Current State:** Anthropic and OpenAI OAuth use placeholder client IDs that don't work.

**Files Affected:**
- `proxy-bridge/src/lib/auth-manager.ts`

**Fix:**

```typescript
// proxy-bridge/src/lib/auth-manager.ts

// REMOVE these invalid OAuth flows (Anthropic/OpenAI don't offer public OAuth):
// - anthropic OAuth at line 55
// - OpenAI Codex OAuth at line 65

// KEEP Google OAuth (properly implemented)
// COMPLETE Qwen OAuth (has real client_id but missing token exchange)

// For Qwen, add token exchange:
async exchangeQwenCode(code: string): Promise<AuthProfile> {
  const response = await fetch('https://oauth.qwen.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: 'f0304373b74a44d2b584a3fb70ca9e56',
      redirect_uri: process.env.OAUTH_REDIRECT_URI,
    })
  });
  
  const { access_token, refresh_token } = await response.json();
  // Return profile with tokens
}
```

---

## High-Impact Features (P1)

These features create significant competitive differentiation.

### P1-1: Deep Inspector (FEAT-06)

**Why It Matters:** No competitor offers real-time visibility into agent state, cost breakdown, and project health.

**Files to Create:**
- `dashboard/src/components/inspector/DeepInspector.tsx`
- `proxy-bridge/src/pages/api/inspector/index.ts`
- `proxy-bridge/src/lib/InspectorService.ts`

**Backend Implementation:**

```typescript
// proxy-bridge/src/lib/InspectorService.ts

export interface InspectorData {
  projectPath: string;
  fileTree: {
    totalFiles: number;
    totalDirs: number;
    byExtension: Record<string, number>;
    largestFiles: Array<{ path: string; size: number }>;
  };
  dependencies: {
    packageJson: any;
    count: number;
    outdated: Array<{ name: string; current: string; latest: string }>;
  };
  agentSessions: Array<{
    sessionId: string;
    agentId: string;
    status: string;
    startedAt: string;
    cost: number;
    toolsUsed: number;
  }>;
  costBreakdown: {
    total: number;
    byModel: Record<string, number>;
    byDay: Record<string, number>;
  };
  memoryUsage: {
    totalMemories: number;
    byType: Record<string, number>;
    avgConfidence: number;
  };
  worktrees: Array<{
    name: string;
    branch: string;
    status: string;
    createdAt: string;
  }>;
}

export class InspectorService {
  async getProjectInspector(projectPath: string): Promise<InspectorData> {
    return {
      fileTree: await this.analyzeFileTree(projectPath),
      dependencies: await this.analyzeDependencies(projectPath),
      agentSessions: await this.getActiveSessions(projectPath),
      costBreakdown: await this.getCostBreakdown(projectPath),
      memoryUsage: await this.getMemoryStats(projectPath),
      worktrees: await this.getWorktrees(projectPath),
    };
  }
  
  private async analyzeFileTree(projectPath: string) {
    // Recursive scan with size calculation
    // Group by extension
    // Return top 10 largest files
  }
  
  private async analyzeDependencies(projectPath: string) {
    // Read package.json
    // Check npm for outdated packages
  }
}
```

**Frontend Implementation:**

```tsx
// dashboard/src/components/inspector/DeepInspector.tsx

export const DeepInspector: React.FC<{ projectPath: string }> = ({ projectPath }) => {
  const [data, setData] = useState<InspectorData | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'deps' | 'agents' | 'costs' | 'memory'>('files');
  
  useEffect(() => {
    fetch(`/api/inspector?projectPath=${encodeURIComponent(projectPath)}`)
      .then(r => r.json())
      .then(setData);
  }, [projectPath]);
  
  if (!data) return <Spinner />;
  
  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-gray-200 p-2">
        {['files', 'deps', 'agents', 'costs', 'memory'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`w-full text-left px-3 py-2 rounded ${
              activeTab === tab ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === 'files' && <FileTreePanel data={data.fileTree} />}
        {activeTab === 'deps' && <DependencyPanel data={data.dependencies} />}
        {activeTab === 'agents' && <AgentSessionsPanel data={data.agentSessions} />}
        {activeTab === 'costs' && <CostBreakdownPanel data={data.costBreakdown} />}
        {activeTab === 'memory' && <MemoryPanel data={data.memoryUsage} />}
      </div>
    </div>
  );
};
```

---

### P1-2: Integrated Navigator (FEAT-08)

**Why It Matters:** The ability to point at a web element and have an agent work on it is game-changing. QueenBee already has `BrowserControlService.ts` - we just need to surface it.

**Files to Create:**
- `dashboard/src/components/navigator/BrowserPanel.tsx`
- `dashboard/src/components/navigator/ElementPicker.tsx`
- `proxy-bridge/src/pages/api/browser/screenshot.ts`
- `proxy-bridge/src/pages/api/browser/dom.ts`

**Implementation:**

```tsx
// dashboard/src/components/navigator/BrowserPanel.tsx

export const BrowserNavigator: React.FC = () => {
  const [url, setUrl] = useState('http://localhost:3000');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isPickerActive, setIsPickerActive] = useState(false);
  
  const handleNavigate = async () => {
    const res = await fetch(`/api/browser/navigate?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    setScreenshot(data.screenshot);
  };
  
  const handleElementPick = async (selector: string) => {
    const res = await fetch(`/api/browser/dom?selector=${encodeURIComponent(selector)}`);
    const element = await res.json();
    
    // Add to composer context
    addToContext({
      type: 'element',
      html: element.outerHTML,
      selector,
      file: element.sourceFile,
      line: element.sourceLine,
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 px-3 py-1 border rounded"
          placeholder="Enter URL..."
        />
        <button onClick={handleNavigate} className="btn-primary">
          Go
        </button>
        <button 
          onClick={() => setIsPickerActive(!isPickerActive)}
          className={isPickerActive ? 'btn-active' : 'btn-secondary'}
        >
          🎯 Pick Element
        </button>
      </div>
      
      <div className="flex-1 relative">
        {screenshot && (
          <img 
            src={`data:image/png;base64,${screenshot}`} 
            className="w-full h-full object-contain"
            alt="Browser preview"
          />
        )}
        {isPickerActive && (
          <ElementPicker onPick={handleElementPick} />
        )}
      </div>
    </div>
  );
};
```

---

### P1-3: Swarm KPI Dashboard (GEA-08)

**Why It Matters:** Visualizes the self-evolution system, demonstrating that QueenBee actually gets smarter over time.

**Files to Create:**
- `dashboard/src/components/evolution/EvolutionPanel.tsx`
- `dashboard/src/components/evolution/AgentArchiveList.tsx`

**Implementation:**

```tsx
// dashboard/src/components/evolution/EvolutionPanel.tsx

export const EvolutionPanel: React.FC<{ projectPath: string }> = ({ projectPath }) => {
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [directives, setDirectives] = useState<EvolvedConfig | null>(null);
  
  useEffect(() => {
    // Poll for new entries
    const interval = setInterval(async () => {
      const [archiveRes, directivesRes] = await Promise.all([
        fetch(`/api/experience-archive?projectPath=${encodeURIComponent(projectPath)}&limit=20`),
        fetch(`/api/gea/directives?projectPath=${encodeURIComponent(projectPath)}`)
      ]);
      setArchive(await archiveRes.json());
      setDirectives(await directivesRes.json());
    }, 10000);
    
    return () => clearInterval(interval);
  }, [projectPath]);
  
  return (
    <div className="p-4 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard 
          title="Sessions" 
          value={archive.length}
          trend={archive.length > 10 ? 'up' : 'neutral'}
        />
        <KPICard 
          title="Success Rate" 
          value={`${(archive.filter(e => e.successRate > 0.7).length / archive.length * 100).toFixed(0)}%`}
          trend="up"
        />
        <KPICard 
          title="Avg Novelty" 
          value={(archive.reduce((a, b) => a + b.noveltyScore, 0) / archive.length).toFixed(2)}
          trend="neutral"
        />
        <KPICard 
          title="Active Agents" 
          value={new Set(archive.map(e => e.agentId)).size}
          trend="up"
        />
      </div>
      
      {/* Agent Archive Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Session</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-right">Performance</th>
              <th className="px-4 py-2 text-right">Novelty</th>
              <th className="px-4 py-2 text-right">Combined</th>
              <th className="px-4 py-2 text-right">Tools</th>
            </tr>
          </thead>
          <tbody>
            {archive.map(entry => (
              <tr key={entry.sessionId} className="border-t">
                <td className="px-4 py-2 font-mono text-sm">{entry.sessionId.slice(0, 8)}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(entry.timestamp).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <ScoreBadge value={entry.performanceScore} />
                </td>
                <td className="px-4 py-2 text-right">{entry.noveltyScore.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {entry.combinedScore.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">{entry.toolHistory.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Current Directives */}
      {directives && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Active Evolution Directives</h3>
          <div className="space-y-3">
            {directives.workflowDirectives?.map((d, i) => (
              <div key={i} className="bg-blue-50 px-3 py-2 rounded text-sm">
                → {d}
              </div>
            ))}
            {directives.avoidPatterns?.map((p, i) => (
              <div key={i} className="bg-red-50 px-3 py-2 rounded text-sm">
                ✕ {p}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### P1-4: Chrome Extension (FEAT-07)

**Why It Matters:** Extends QueenBee beyond the desktop app - capture any webpage and send to agent.

**Files to Create:**
- `chrome-extension/manifest.json`
- `chrome-extension/popup.html`
- `chrome-extension/popup.ts`
- `chrome-extension/content.ts`
- `chrome-extension/background.ts`
- `proxy-bridge/src/pages/api/browser-capture.ts`

**Manifest:**

```json
{
  "manifest_version": 3,
  "name": "QueenBee Capture",
  "version": "1.0",
  "description": "Capture pages and elements for QueenBee agents",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

---

## Competitive Differentiation Strategy

> **Reality check (Feb 2026):** Live idea-reality-mcp scan returned `signal: 74/100, HIGH competition`. Top rival: `ruvnet/claude-flow` (14,886 ★, updated daily). The original three-pillar positioning below has been audited and partially retired — see updated messages.

### The Actual Moat (Lead With These)

| QueenBee Capability | Any Competitor |
|--------------------|----------------|
| GEA: agents learn from each other's session traces | ❌ None |
| Experience Archive with novelty scoring (combinedScore = perf × √novelty) | ❌ None |
| Weiszfeld geometric median consensus across agent votes | ❌ None |
| Byzantine fault detection (5-signal + CLOSED/OPEN/HALF_OPEN circuit breaker) | ❌ None |
| MetacognitivePlanner: LP-triggered self-reflection | ❌ None |
| Evolutionary directives auto-injected into next agent's context | ❌ None |

**The One Message:** *"QueenBee evolves. Every session makes every future agent smarter. Nothing else does this."*

---

### vs Cursor

| Cursor Weakness | QueenBee Advantage |
|-----------------|-------------------|
| Memory resets on project close | Cross-session semantic graph memory |
| Single agent only | True multi-agent swarms with worktree isolation |
| Credit-based billing | Flat pricing (bring your own API key) |
| No self-improvement | GEA: agents get better over time |

**Key Message:** "Cursor remembers your preferences. QueenBee learns from every mistake it ever made."

### vs Claude Code

| Claude Code Weakness | QueenBee Advantage |
|---------------------|-------------------|
| Terminal-only, no GUI | Full desktop app with visual diffs, swarm panel, evolution view |
| Memory via CLAUDE.md files only | Live semantic graph with causal/temporal/semantic links |
| No parallelism | Worktree-isolated parallel agents |
| No self-evolution | GEA directives + ExperienceArchive compound over time |

**Key Message:** "Claude Code is a brilliant assistant. QueenBee is a self-improving team."

> ⚠️ Retired claim: "Claude Code has no memory" — FALSE as of 2026. Claude Code now has cross-session memory features.

### vs Cline (new primary open-source threat)

| Cline | QueenBee Advantage |
|-------|-------------------|
| Free, open-source, 5M installs | Justified by GEA — agents improve, so value compounds |
| Subagents launched Feb 2026 | GEA + Roundtable consensus + Byzantine fault detection — not just parallel, but self-healing and self-evolving |
| No persistent learning | Experience Archive: collective wisdom from every past session |
| No evolution directives | evolved-config.json injects learned patterns into every new agent |

**Key Message:** "Cline can run agents in parallel. QueenBee's agents learn from each other and get smarter every day."

### vs Devin

| Devin Weakness | QueenBee Advantage |
|----------------|-------------------|
| Cloud-only, $20/mo (dropped from $500) | Local-first, bring your own API key, full data privacy |
| No persistent learning across sessions | GEA self-evolution compounds indefinitely |
| Black-box cloud execution | Full local observability: Deep Inspector, Evolution Panel, cost tracking |

**Key Message:** "Devin is a cloud black-box. QueenBee runs on your machine and gets smarter every time you use it."

> ⚠️ Updated: Devin is now $20/mo (not $500+). Pricing advantage is privacy + BYOK, not cost.

### vs GitHub Copilot

| Copilot Weakness | QueenBee Advantage |
|------------------|--------------------|
| IDE autocomplete assistant | Fully autonomous multi-agent system |
| No cross-session memory | Semantic graph + Experience Archive |
| No parallel execution | Swarm with Architect→Worker coordination |
| No automation | Scheduled agents + cron + slash commands |

**Key Message:** "Copilot helps you type. QueenBee builds the whole feature, remembers how it went, and does it better next time."

### vs claude-flow (ruvnet/claude-flow — 14,886 ★, direct rival)

| claude-flow | QueenBee Advantage |
|-------------|-------------------|
| Multi-agent orchestration framework (library) | Full desktop app + GUI + terminal emulation |
| No persistent learning | GEA: experience archive, evolutionary directives |
| No self-healing | Byzantine fault detection + circuit breaker + repairReflect() |
| No quality gate | CompletionGate, HealthScorer, ProposalService with 5-round refinement loop |

**Key Message:** "claude-flow orchestrates agents. QueenBee evolves them."

---

## Implementation Roadmap (Phase 19 — Updated Feb 2026)

> Phase 18 is complete. Phases 1–18 built the engine. Phase 19 ships it.
> Rule: nothing enters the queue until `electron-builder` produces a clean `.dmg`.

### Phase 19-P0: Release Unblock (Week 1)

| Task | ID | Files | Priority |
|------|----|-------|----------|
| Electron command injection + IPC handlers + DevTools guard | P19-01 | `electron/NativeFSManager.ts`, `electron/main.ts`, `electron/ElectronAdapter.ts` | 🔴 SHIP BLOCKER |
| Fix Dashboard TypeScript errors | P19-02 | `dashboard/src/components/layout/CodexLayout.tsx` + tsc output | 🔴 SHIP BLOCKER |
| Remove Anthropic/OpenAI fake OAuth flows | P19-03 | `proxy-bridge/src/lib/auth-manager.ts` | 🔴 SHIP BLOCKER |
| Fix 6 automation system bugs | P19-04 | `CronManager.ts`, `db.ts`, `automations.ts`, `useAppStore.ts`, `AutomationDashboard.tsx` | 🟠 P0 |

### Phase 19-P1: Make the Moat Visible (Week 2)

| Task | ID | Files |
|------|----|-------|
| Learning Velocity Dashboard (GEA improvement quantified) | P19-05 | `LearningVelocityPanel.tsx`, `/api/experience-archive` |
| Deep Inspector (cost + sessions + memory + health) | P19-06 | `InspectorService.ts`, `DeepInspector.tsx` |
| Browser Navigator (click-to-fix via BrowserControlService) | P19-07 | `BrowserPanel.tsx`, `ElementPicker.tsx`, `/api/browser/*` |

### Phase 19-P2: Cross-Tool + Ecosystem (Week 3)

| Task | ID | Source Inspiration |
|------|----|-------------------|
| Session Continuity Export | P19-08 | cli-continues (752 ★) |
| Overture approval gate | P19-09 | SixHq/Overture |
| Wire Kimi + Qwen | P19-10 | APAC market unlock |
| MCP Browser Bridge | P19-11 | intellegix-toolkit |
| Portfolio Governance View | P19-12 | intellegix-toolkit |

### Phase 19-P3: Ecosystem Expansion (Week 4)

| Task | ID | Why |
|------|----|-----|
| `.qbx` Experience Snapshot export/import | P19-13 | Network effects, team sharing |
| Slash Commands (`/inspect`, `/swarm`, `/evolve`) | P19-14 | SkillsManager front-door UX |
| Council Automation (auto-convene on risky diffs) | P19-15 | Uses existing Weiszfeld consensus |
| Retire stale messaging, update BUSINESS_PLAN | P19-16 | Cline/claude-flow/Antigravity added |

> **Struck from roadmap:** SkillsManager rewrite (already fully functional — BM25 scoring, 5 default skills, YAML parsing all working). Chrome Extension moved to post-v1.0.

---

## Technical Deep Dives

### TD-1: How Memory Evolution Works (P17-04 + GEA)

The semantic graph memory system is QueenBee's most sophisticated feature:

```
┌─────────────────────────────────────────────────────────────┐
│                    Session Complete                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              AgentSession.persistExperienceTrace()          │
│  - toolHistory: [{tool, outcome, durationMs}]              │
│  - taskOutcomes: [{taskId, success}]                      │
│  - successRate = completed / total                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ExperienceArchive.append()                  │
│  - toolVector: binary array over vocabulary                │
│  - noveltyScore: cosine distance from population           │
│  - combinedScore = performance × √novelty                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              HeartbeatService.tick() → GEA                 │
│  - If stagnation detected OR every 10 cycles                │
│  - Select top-K by combinedScore                          │
│  - Call GEAReflection.reflect()                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   GEAReflection.reflect()                    │
│  Input: Pool of top-K session traces                       │
│  Prompt: "Analyze these experiences, identify what         │
│           worked and what failed. Generate directives."    │
│  Output: { workflowDirectives, avoidPatterns, ... }        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              AutonomousRunner.getEnhancedContext()         │
│  - Load evolved-config.json                               │
│  - Inject: systemPromptAppend + avoidPatterns              │
│  - Next agent inherits collective wisdom                   │
└─────────────────────────────────────────────────────────────┘
```

### TD-2: How Swarm Coordination Works (HS-01 + QB-15)

```
User: "@qb build a login page"

                          ┌──────────────────────────────┐
                          │     ARCHITECT AGENT           │
                          │  (Phase 1: PLAN)            │
                          │  - Scout project             │
                          │  - Generate requirements    │
                          │  - Propose worker split     │
                          └──────────────────────────────┘
                                        │
                                        ▼ User approves
                          ┌──────────────────────────────┐
                          │  (Phase 2: PROMPTS)         │
                          │  - Generate worker .md files │
                          │  - UI_BEE, LOGIC_BEE, etc. │
                          └──────────────────────────────┘
                                        │
                                        ▼ User approves
                          ┌──────────────────────────────┐
                          │  (Phase 3: LAUNCH)          │
                          │  - spawn_worker(UI_BEE)     │
                          │  - spawn_worker(LOGIC_BEE)  │
                          │  - spawn_worker(TEST_BEE)   │
                          └──────────────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│    UI_BEE           │    │    LOGIC_BEE        │    │    TEST_BEE         │
│  (worktree: ui-)    │    │  (worktree: logic-)|    │  (worktree: test-)  │
│                     │    │                     │    │                     │
│  - write_file       │    │  - write_file      │    │  - write_file       │
│  - chat_with_team   │    │  - run_shell       │    │  - run_shell        │
│  - report_completion│    │  - chat_with_team  │    │  - chat_with_team   │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                            │                            │
           └────────────────────────────┬┴────────────────────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────────┐
                          │    ROUNDTABLE (team chat)    │
                          │  - All workers post updates  │
                          │  - Architect monitors        │
                          │  - Auto-summarizes on done   │
                          └──────────────────────────────┘
```

### TD-3: How Byzantine Detection Works (LS-08)

```
┌─────────────────────────────────────────────────────────────┐
│              ByzantineDetector.check()                       │
│                                                             │
│  5 Fault Signals:                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. OUTPUT_HASH_REPETITION                            │  │
│  │    - Hash of last N outputs                         │  │
│  │    - If same hash appears >3x → fault               │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ 2. ACTION_NGRAM_LOOP                                 │  │
│  │    - Window of last 6 tool calls                    │  │
│  │    - If same sequence repeats → fault               │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ 3. STALL_DETECTION                                  │  │
│  │    - No state change >60s                           │  │
│  │    - → fault                                        │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ 4. LOW_TOKEN_ENTROPY                                │  │
│  │    - Token probability distribution                 │  │
│  │    - If entropy <3 bits → garbage output            │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ 5. TOKEN_EXPLOSION                                  │  │
│  │    - Output tokens >3x expected                      │  │
│  │    - → potential loop                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  State Machine:                                             │
│  ┌─────────┐  3 faults   ┌──────────┐  probe ok   ┌────────┐│
│  │ CLOSED  │ ─────────▶  │   OPEN   │ ──────────▶ │HALF_   ││
│  │ (normal)│              │ (30s backoff)         │ OPEN   ││
│  └─────────┘              └──────────┘              └────────┘│
│       ▲                        │                           │    │
│       └────────────────────────┴───────────────────────────┘    │
│              Recovery success                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

Phase 18 is complete. 150+ modules. 19 phases. Byzantine fault detection, Weiszfeld consensus, GEA self-evolution, semantic graph memory. The engine is built.

Phase 19 has one job: **ship it**.

The competitive landscape shifted in 2026. Cline got subagents. Claude Code got memory. Devin dropped to $20. The three original pillars (memory, multi-agent, local-first) are now table stakes. But the GEA self-evolution stack — Experience Archive, evolutionary directives, novelty scoring, collective learning — has zero competitors. That's the story.

The critical path is four Electron security fixes and a TypeScript clean build. Everything else is iteration.

**The goal:** Make QueenBee the AI coding tool that visibly gets smarter every week you use it. No other tool can say that.

---

*Document Version: 2.0*  
*Last Updated: February 2026*  
*Authors: QueenBee Development Team*