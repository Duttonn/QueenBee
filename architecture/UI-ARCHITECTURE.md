# UI-ARCHITECTURE.md
## OpenAI Codex App — Complete Visual & Structural Specification

> **Design System Codename:** "Codex Light"  
> **Target Platform:** macOS Desktop (Electron)  
> **Aesthetic:** Clean, Apple-native, Light Mode, SF Pro typography

---

## 1. DESIGN PHILOSOPHY

### 1.1 Core Principles
- **Spatial Persistence:** Sidebar and Input Shell remain constant; Main Canvas mutates based on context
- **Material Lightness:** Pure white surfaces (#FFFFFF), translucent sidebars, soft shadows
- **Apple DNA:** SF Pro typography, native macOS window controls (traffic lights), subtle blur effects
- **Zero Hacker Aesthetic:** No dark themes, no neon, no cyberpunk — clean professional IDE feel

### 1.2 Color Palette (Strict)
```
PRIMARY SURFACES:
- Main Canvas:     #FFFFFF (pure white)
- Sidebar:         rgba(245, 245, 247, 0.8) with backdrop-blur-xl
- Cards:           #FFFFFF with border #E5E5E5

TEXT HIERARCHY:
- Primary:         #1A1A1A (text-gray-900)
- Secondary:       #6B7280 (text-gray-500)
- Tertiary:        #9CA3AF (text-gray-400)
- Placeholder:     #D1D5DB (text-gray-300)

SEMANTIC COLORS:
- Addition/Success: bg-green-50 (#F0FDF4) / text-green-700
- Deletion/Error:   bg-red-50 (#FEF2F2) / text-red-700
- Active/Selected:  bg-gray-100 with shadow-inner
- Accent Blue:      #3B82F6 (for primary actions)
```

---

## 2. GLOBAL APP SHELL

### 2.1 Window Frame
**Reference:** `frontpage.png`

```
┌─────────────────────────────────────────────────────────────────┐
│ ● ● ●                    New thread                             │  <- macOS traffic lights + title
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│   SIDEBAR    │              MAIN CANVAS                         │
│   (260px)    │              (flex-grow)                         │
│              │                                                  │
│              │                                                  │
│              │                                                  │
├──────────────┴──────────────────────────────────────────────────┤
│                        COMPOSER BAR                             │  <- Fixed bottom
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Z-Index Layering
```
Layer 0 (Base):     Main Canvas (bg-white)
Layer 1 (Nav):      Sidebar (translucent, blur)
Layer 2 (Floating): Header toolbar, Diff stats pill
Layer 3 (Overlay):  Modals, Dropdowns, Toasts
Layer 4 (Top):      User camera bubble (if present)
```

---

## 3. SIDEBAR COMPONENT

### 3.1 Structure (from `frontpage.png`)
```
┌─────────────────┐
│ ✏️ New thread   │  <- Primary action
│ ⏰ Automations  │  <- Navigation item
│ 🔌 Skills       │  <- Navigation item
├─────────────────┤
│ Threads    🗂️ ≡ │  <- Section header + icons
├─────────────────┤
│ 📁 AstroScope   │  <- Project folder (expanded)
│   ├─ Update design for Liquid Glass  +47 -20  3h
│   └─ Investigate build errors              10h
│ 📁 Wanderlust   │  <- Project folder
│   ├─ ○ Migrate Realtime speech...     3m
│   ├─ ○ Upgrade Next.js and Conv...    8m
│   └─ Add Travel Log screen      +427 -0  4h
│ 📁 FitnessTracker
│   └─ Implement Figma home screen +302 -3  3h
│ 📁 ChatGPT      │  <- Collapsed folder
│ 📁 Codex        │
└─────────────────┘
```

### 3.2 Sidebar Specifications
| Property | Value |
|----------|-------|
| Width | 260px (fixed) |
| Background | `rgba(245, 245, 247, 0.8)` |
| Blur | `backdrop-filter: blur(20px)` |
| Border Right | `1px solid rgba(0, 0, 0, 0.05)` |
| Padding | 16px |

### 3.3 Thread Item Component
```tsx
interface ThreadItem {
  title: string;           // "Update design for Liquid Glass"
  diffStats?: {
    additions: number;     // +47
    deletions: number;     // -20
  };
  timestamp: string;       // "3h"
  status?: 'running' | 'complete' | 'idle';
  hasUnstaged?: boolean;   // Blue dot indicator
}
```

**Visual States:**
- Default: `text-gray-600`
- Hover: `bg-black/5 rounded-md`
- Selected: `bg-black/10 text-black font-medium`
- Running: Animated spinner icon (○)

### 3.4 Diff Stats Pill
- Format: `+{additions}` (green) `-{deletions}` (red)
- Font: `text-xs font-mono`
- No background, inline text

---

## 4. MAIN CANVAS CONTEXTS

The Main Canvas swaps entirely based on the active route/context.

### 4.1 Context A: Empty State / Home
**Reference:** `frontpage.png`

```
┌─────────────────────────────────────────┐
│                              [👤 Video] │  <- Floating user bubble (top-right)
│                                         │
│                                         │
│            ☁️_                          │  <- Codex icon (cloud with terminal)
│         Let's build                     │  <- Large title (32px, font-semibold)
│         AstroScope ˅                    │  <- Project dropdown
│                                         │
│    ┌─────────────────────────────┐      │
│    │ Ask Codex anything...      │      │  <- Composer (centered)
│    └─────────────────────────────┘      │
└─────────────────────────────────────────┘
```

**Specifications:**
- Hero text: `text-4xl font-semibold text-gray-900`
- Project dropdown: `text-4xl text-gray-400` with chevron
- User video bubble: `w-48 h-36 rounded-xl shadow-lg` (top-right absolute)

---

### 4.2 Context B: Automation Dashboard
**Reference:** `automate.png`, `create-automate.png`

```
┌─────────────────────────────────────────────────────────────┐
│                         ☁️_                                 │
│                    Let's automate                           │  <- Hero title
│          Automate work by setting up scheduled tasks        │  <- Subtitle
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 🚀          │  │ 🌈          │  │ 🧪          │         │
│  │ Find and    │  │ Every       │  │ Add tests   │         │
│  │ fix a bug   │  │ evening...  │  │ every       │         │
│  │ every...    │  │             │  │ evening...  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 💬          │  │ ✏️          │  │ 📖          │         │
│  │ Review PR   │  │ Draft       │  │ Summarize   │         │
│  │ comments    │  │ release...  │  │ my team's   │         │
│  │ every hour  │  │             │  │ PRs...      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│                    Explore more                             │
└─────────────────────────────────────────────────────────────┘
```

**Recipe Card Component:**
```tsx
interface RecipeCard {
  icon: string;          // Emoji or icon
  title: string;         // "Find and fix a bug every morning"
  description?: string;  // "with a short summary"
}
```

**Card Styling:**
```css
.recipe-card {
  background: #FFFFFF;
  border-radius: 16px;          /* rounded-2xl */
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.2s;
}
.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

**Grid Layout:**
```css
grid-template-columns: repeat(3, 1fr);
gap: 24px;
max-width: 1000px;
margin: 0 auto;
```

---

### 4.3 Create Automation Modal
**Reference:** `create-automate.png`

```
┌────────────────────────────────────────────┐
│ Create automation                          │  <- Modal title
│                                            │
│ Name                                       │
│ ┌────────────────────────────────────────┐ │
│ │ Issue triage                           │ │  <- Text input
│ └────────────────────────────────────────┘ │
│                                            │
│ Workspaces                                 │
│ ┌────────────────────────────────────────┐ │
│ │ Choose a folder                      ˅ │ │  <- Dropdown
│ ├────────────────────────────────────────┤ │
│ │ AstroScope                             │ │  <- Dropdown items
│ │ Wanderlust                         👆  │ │
│ │ FitnessTracker                         │ │
│ │ ChatGPT                                │ │
│ │ Codex                                  │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌──────────────────┐  (Mo)(Tu)(We)(Th)(Fr) Sa  Su │
│ │ 09:30 AM      ⏰ │                       │  <- Time + Day selector
│ └──────────────────┘                       │
│                                            │
│                      [Cancel]  [Create]    │  <- Actions
└────────────────────────────────────────────┘
```

**Day Selector Pills:**
- Active: `bg-black text-white rounded-full`
- Inactive: `bg-transparent text-gray-400`

---

### 4.4 Context C: Skills Manager
**Reference:** `skills.png`

```
┌─────────────────────────────────────────────────────────────┐
│ Skills                                                      │  <- Page title (xl)
│ Give Codex super powers                                     │  <- Subtitle (gray)
│                                                             │
│ Installed                                                   │  <- Section header
│ ┌─────────────────────────────────┬─────────────────────────┤
│ │ [Figma]  Figma MCP -> Figma     │ [💬] Skill Creator      │
│ │          Use Figma MCP for      │      Create or update   │
│ │          design-to-code   [Team]│      a skill        [✏️]│
│ ├─────────────────────────────────┼─────────────────────────┤
│ │ [GitHub] Skill Installer        │                         │
│ │          Install curated skills │                         │
│ │          from openai/skills  [✏️]│                        │
│ └─────────────────────────────────┴─────────────────────────┘
│                                                             │
│ Recommended                                                 │
│ ┌─────────────────────────────────┬─────────────────────────┤
│ │ [💬] Doc                        │ [GitHub] GH Address     │
│ │      Edit and review docx       │          Comments       │
│ ├─────────────────────────────────┼─────────────────────────┤
│ │ [GitHub] GH Fix CI              │ [💬] Imagegen           │
│ │          Fix failing GitHub CI  │      Generate and edit  │
│ └─────────────────────────────────┴─────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

**Skill Card Layout:**
```
┌──────────────────────────────────────────────────────┐
│ [48px Icon]  Title                          [Badge]  │
│              Description text...            [Action] │
└──────────────────────────────────────────────────────┘
```

**Styling:**
- Cards: `bg-white border border-gray-100 rounded-xl p-4`
- Grid: `grid-cols-2 gap-4`
- Icon: 48x48, rounded-lg
- Badge: `bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded`

---

## 5. WORKBENCH / THREAD VIEW

### 5.1 Header Toolbar
**Reference:** `diff-commit-run-open-opencommandline-popwindow-toprightoftheapp.png`, `commit.png`

```
┌─────────────────────────────────────────────────────────────────┐
│                    ▷ ˅   [🔨 Open ˅]   [-○- Commit ˅]   [>_]   [📥 +28 -5]   [⎘] │
└─────────────────────────────────────────────────────────────────┘
    │         │           │              │         │        │
    │         │           │              │         │        └─ Copy/Duplicate
    │         │           │              │         └─ Diff Stats Pill (green/red)
    │         │           │              └─ Terminal toggle
    │         │           └─ Commit dropdown
    │         └─ Open in IDE (blue hammer icon)
    └─ Run/Play button
```

**Button Styles:**
| Button | Style |
|--------|-------|
| Play | Icon only, `text-gray-600 hover:bg-gray-100 rounded-lg p-2` |
| Open | `bg-blue-500 text-white rounded-lg px-3 py-1` with dropdown chevron |
| Commit | `border border-gray-200 rounded-lg px-3 py-1` with merge icon |
| Diff Stats | `text-green-600` (+N) `text-red-600` (-N) with upload icon |

---

### 5.2 Diff View
**Reference:** `diff.png`, `diff-request-chage-on-line.png`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Uncommitted changes ˅                          Unstaged · 6    Staged    [⎘]   │
├───────────────────────────────┬─────────────────────────────────────────────────┤
│ AGENTS.md        +0 -5  ●     │ Filter files...                                 │
│ AstroScope.xcodeproj...  +0-0 │                                                 │
│                               │ ⬇ AGENTS.md                                     │
│ APODResponse.swift +28 -0 ● > │   📁 AstroScope.xcodeproj                       │
├───────────────────────────────┤      📁 project.xcworkspace                     │
│  1  │ //                      │         📁 xcuserdata                           │
│  2  │ // APODResponse.swift   │            📁 openai.xcuserdatad                │
│  3  │ // AstroScope           │               📄 UserInterfaceSt...             │
│  4  │ //                      │   📁 AstroScope                                 │
│  5  │ // Created by Codex on  │      </> APODResponse.swift                     │
│  6  │ //                      │      </> APODScreen.swift                       │
│  7  │                         │      </> APODViewModel.swift                    │
│  8  │ import Foundation       │      </> ContentView.swift                      │
│  9  │                         │                                                 │
│ 10  │ struct APODResponse:... │                                                 │
└───────────────────────────────┴─────────────────────────────────────────────────┘
```

**Diff Color Scheme (Light Mode):**
```css
.diff-addition {
  background-color: #F0FDF4;  /* green-50 */
  border-left: 3px solid #22C55E;
}
.diff-deletion {
  background-color: #FEF2F2;  /* red-50 */
  border-left: 3px solid #EF4444;
}
.diff-line-number {
  color: #9CA3AF;
  font-family: 'SF Mono', monospace;
  user-select: none;
}
```

**File Status Indicators:**
- `●` Blue dot = Unstaged changes
- `+N -N` = Diff stats (green/red)
- `>` = Expandable/collapsible

---

### 5.3 Inline Request Change Popover
**Reference:** `diff-request-chage-on-line.png`

```
┌────────────────────────────────────────┐
│ Request change                         │  <- Placeholder text
│                                        │
│                    [Cancel] [Comment]  │  <- Actions
└────────────────────────────────────────┘
```

**Trigger:** Hover on line number → shows "+" button → click opens popover
**Styling:**
```css
.request-change-popover {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  padding: 16px;
  min-width: 300px;
}
```

---

## 6. COMPOSER / INPUT BAR

### 6.1 Full Composer Layout
**Reference:** `task-control-and-chat.png`, `worktree-local-cloud-env-branch.png`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Ask Codex anything, @ to add files, / for commands                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [+]  [</> Code ˅]  [GPT-5.2-Codex ˅]  [Medium ˅]              [🔒] [🎤] [⬆️]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [📁 Local]  [Worktree]  [Cloud]       [⚙️ No environment ˅] [🔀 From main ˅]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Composer Layers

**Layer 1: Text Input**
```tsx
<textarea 
  placeholder="Ask Codex anything, @ to add files, / for commands"
  className="w-full bg-gray-50 rounded-xl p-4 text-gray-900 
             placeholder-gray-400 resize-none border-0 
             focus:ring-2 focus:ring-gray-200"
/>
```

**Layer 2: Controls Row**
| Control | Description |
|---------|-------------|
| `+` | Add file/attachment |
| `</> Code` | Mode selector dropdown |
| `GPT-5.2-Codex` | Model selector |
| `Medium` | Reasoning effort (Low/Medium/High/XHigh) |
| `🔒` | Lock/Security settings |
| `🎤` | Voice dictation (Ctrl+M) |
| `⬆️` | Send button (circular, gray when disabled) |

**Layer 3: Environment Row**
```
┌─────────────────────────────────────────────────────────────┐
│ [Local] [Worktree] [Cloud]     [⚙️ No env ˅] [🔀 main ˅]   │
└─────────────────────────────────────────────────────────────┘
```

**Mode Selector (Segmented Control):**
```css
.mode-selector {
  background: #F3F4F6;
  border-radius: 8px;
  padding: 4px;
  display: inline-flex;
}
.mode-option {
  padding: 6px 12px;
  border-radius: 6px;
  color: #6B7280;
  transition: all 0.2s;
}
.mode-option.active {
  background: white;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

---

### 6.3 Task Progress Card
**Reference:** `task-control-and-chat.png`

```
┌─────────────────────────────────────────────────────────────────┐
│ :: 2 out of 4 tasks completed                              ⤢   │
├─────────────────────────────────────────────────────────────────┤
│ ✓ 1. Review current Assistants/threads usage and map to...     │  <- Strikethrough
│ ✓ 2. Update client logic for Conversations + Responses...      │  <- Strikethrough
│ ○ 3. Update dependencies and Next.js versions, then...         │  <- Pending
│ ○ 4. Summarize changes and note any follow-ups/tests           │  <- Pending
├─────────────────────────────────────────────────────────────────┤
│ 4 files changed +4 -18                    Review changes ↗      │
└─────────────────────────────────────────────────────────────────┘
```

**Task Item States:**
- Complete: `line-through text-gray-400` with filled circle ✓
- Pending: `text-gray-900` with empty circle ○
- Running: Animated spinner

---

## 7. MCP TOOL STREAM
**Reference:** `mcp-usage.png`

```
┌─────────────────────────────────────────────────────────────────┐
│ Use the [🎨 Figma MCP -> Figma] skill and implement the home   │
│ screen to look exactly like this Figma file, using our design  │
│ system: https://www.figma.com/design/d828gm6soTTmT8bP1mT2Nz... │
│                                                            [⎘] │
├─────────────────────────────────────────────────────────────────┤
│ Called figma MCP get_design_context tool                    >   │  <- Collapsed
│ Called figma MCP get_screenshot tool                        >   │
│ Explored 11 files, 8 searches, 9 lists                      >   │
│ Called figma MCP get_metadata tool                          >   │
│ Called figma MCP get_design_context tool                    >   │
│ Called figma MCP get_screenshot tool                        >   │
│ Explored 20 files, 11 searches, 10 lists                    >   │
│ Edited progress.css +2 -2                                   >   │
│ Edited Homepage.tsx +157 -1                                 >   │
│ Created homepage.css +143 -0 ●                              >   │  <- Blue dot = new
│ Explored 3 files, 1 search                                  >   │
└─────────────────────────────────────────────────────────────────┘
```

**Log Line Styling:**
```css
.mcp-log-line {
  color: #6B7280;
  font-size: 14px;
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
}
.mcp-log-line:hover {
  color: #374151;
}
.mcp-log-line .action {
  color: #3B82F6;  /* Blue for links like file names */
}
.mcp-log-line .stats {
  color: #22C55E;  /* Green for additions */
}
```

---

## 8. CHATGPT ATLAS INTEGRATION
**Reference:** `gptATLAS-web-page-testing-integrateddebugger.png`

This screenshot shows the **ChatGPT Atlas** browser with:
- Figma design preview (left panel)
- Mobile responsive preview (center)
- Figma inspector panel (right)
- Code Connect integration
- Development annotations overlay

**Key Insight:** The Codex App can integrate with external tools like Figma via MCP, displaying live previews and enabling design-to-code workflows.

---

## 9. MODAL SYSTEM

### 9.1 Modal Container
```css
.modal-backdrop {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}
.modal-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 100%;
}
```

### 9.2 Modal Anatomy
```
┌─────────────────────────────────────────┐
│ Modal Title                             │  <- 20px font-semibold
├─────────────────────────────────────────┤
│                                         │
│ [Form Fields / Content]                 │
│                                         │
├─────────────────────────────────────────┤
│                      [Secondary] [Primary] │  <- Button row (right-aligned)
└─────────────────────────────────────────┘
```

---

## 10. COMPONENT LIBRARY CHECKLIST

### Core Layout Components
- [ ] `AppShell.tsx` — Window frame with traffic lights
- [ ] `Sidebar.tsx` — Navigation + Project tree
- [ ] `MainCanvas.tsx` — Context-switching content area
- [ ] `Composer.tsx` — Bottom input bar with all controls

### View Components
- [ ] `EmptyState.tsx` — "Let's build" hero
- [ ] `AutomationDashboard.tsx` — Recipe card grid
- [ ] `SkillsManager.tsx` — Installed/Recommended lists
- [ ] `ThreadView.tsx` — Active thread with diff/chat

### Diff Components
- [ ] `DiffPane.tsx` — Full diff viewer
- [ ] `DiffHeader.tsx` — Toolbar with actions
- [ ] `DiffLine.tsx` — Individual line with gutter
- [ ] `FileTree.tsx` — Right-side file browser
- [ ] `RequestChangePopover.tsx` — Inline comment bubble

### Input Components
- [ ] `ModeSelector.tsx` — Local/Worktree/Cloud segmented control
- [ ] `ModelSelector.tsx` — GPT-5.2-Codex dropdown
- [ ] `EnvironmentSelector.tsx` — Environment + Branch dropdowns
- [ ] `TaskProgressCard.tsx` — Checklist overlay

### Card Components
- [ ] `RecipeCard.tsx` — Automation recipe
- [ ] `SkillCard.tsx` — Skill item (horizontal)
- [ ] `ThreadItem.tsx` — Sidebar thread row
- [ ] `ProjectFolder.tsx` — Collapsible folder

### Modal Components
- [ ] `CreateAutomationModal.tsx`
- [ ] `ApprovalModal.tsx`
- [ ] `SettingsModal.tsx`

---

## 11. INTERACTION STATES

### 11.1 Button States
```css
/* Default */
.btn { background: transparent; color: #374151; }

/* Hover */
.btn:hover { background: #F3F4F6; }

/* Active/Pressed */
.btn:active { background: #E5E7EB; }

/* Primary */
.btn-primary { background: #111827; color: white; }
.btn-primary:hover { background: #1F2937; }
```

### 11.2 Focus States
```css
*:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

### 11.3 Loading States
- Buttons: Replace text with spinner
- Cards: Skeleton pulse animation
- Thread: "Thinking" text with animated dots

---

## 12. KEYBOARD SHORTCUTS

| Shortcut | Action |
|----------|--------|
| `Cmd+J` | Toggle terminal drawer |
| `Cmd+K` | Command palette |
| `Ctrl+L` | Clear terminal |
| `Ctrl+M` (hold) | Voice dictation |
| `Cmd+N` | New thread |
| `Cmd+,` | Settings |
| `↑` (in composer) | Previous prompt |
| `Cmd+Enter` | Send message |

---

## 13. RESPONSIVE BREAKPOINTS

This is a **desktop-first** application. Minimum supported width: 1024px.

```css
/* Sidebar collapse for narrow windows */
@media (max-width: 1200px) {
  .sidebar { width: 200px; }
}

/* Hide sidebar below 1024px */
@media (max-width: 1024px) {
  .sidebar { display: none; }
}
```

---

## 14. TECHNICAL CONSTRAINTS

### Must Follow
1. **NO DARK MODE** — This spec is Light Mode only
2. Use `SF Pro` / `Inter` for body, `SF Mono` / `JetBrains Mono` for code
3. Borders: `1px solid #E5E5E5` max (no thick outlines)
4. Shadows: `shadow-sm` for cards, `shadow-lg` for dropdowns, `shadow-2xl` for modals
5. Border radius: `rounded-lg` (8px) default, `rounded-xl` (12px) for cards, `rounded-2xl` (16px) for recipe cards
6. All icons: Lucide or Heroicons, stroke width 1.5-2px

### Avoid
- Dark backgrounds anywhere except text
- Neon or high-contrast accent colors
- Heavy borders or outlines
- Flat design without shadows
- Harsh color transitions

---

## 15. IMPLEMENTATION PRIORITY

### Phase 1: Shell
1. `AppShell` with traffic lights
2. `Sidebar` with navigation + project tree
3. `EmptyState` ("Let's build")
4. Basic `Composer`

### Phase 2: Views
5. `AutomationDashboard` with recipe cards
6. `CreateAutomationModal`
7. `SkillsManager`

### Phase 3: Workbench
8. `DiffPane` with full diff viewer
9. `HeaderToolbar`
10. `FileTree`
11. `RequestChangePopover`

### Phase 4: Polish
12. `TaskProgressCard`
13. MCP log stream
14. Keyboard shortcuts
15. Voice dictation integration

---

*Document Version: 1.0*  
*Based on OpenAI Codex App screenshots (February 2026)*  
*For use with Claude/Antigravity code generation*
