# Role: Lead Product Designer (Apple/OpenAI Design Team)
# Task: Refine the Codex Hive UI to match "macOS Native" and "OpenAI Minimalist" aesthetics.
# Current State: Functional dark mode IDE.
# Target State: Premium, glassmorphic, typographical, fluid.

## DESIGN SYSTEM UPDATE: "CUPERTINO FLUX"

### 1. The "Native" Shell (Window & Layout)
- **Materials, Not Colors:** Instead of solid `bg-slate-900`, use `bg-zinc-950/90` with `backdrop-blur-xl` for the main window.
- **Sidebar:** Must resemble the macOS Finder or Arc Browser sidebar.
  - Background: `bg-zinc-900/50` (highly translucent).
  - Border: A subtle separator `border-r border-white/5`.
  - Selection State: Instead of a full block color, use a rounded ghost rounded-md with `bg-white/10` and `text-white`.
- **Window Controls:** Leave space in the top-left sidebar for the native macOS "Traffic Lights" (Red/Yellow/Green window dots).

### 2. Typography & Hierarchy (The OpenAI Touch)
- **Font Stack:** Use `Inter` (or `SF Pro Display` stack).
- **Headings:** deeply muted white (`text-zinc-100`) but heavy weight (`font-medium`).
- **Body:** `text-zinc-400`. Never use pure white (`#fff`) for body text, it's too harsh. Use `zinc-300`.
- **Monospace:** For code blocks, use `JetBrains Mono` or `Fira Code`.

### 3. "Invisible" UI Elements
- **Borders:** Ultra-thin and subtle. `border border-white/10`.
- **Inputs & Search:**
  - Background: `bg-zinc-800/50`.
  - Focus Ring: `ring-1 ring-white/20` (No heavy blue outline unless active action).
- **Modals (Command Bar):**
  - Heavy blur (`backdrop-blur-2xl`).
  - Deep shadow (`shadow-2xl`).
  - Thin glow border (`border border-white/10`).

### 4. Component Specific Refinements

#### A. The Sidebar (Navigation)
- Section Headers (e.g., "WORKSPACES"): Uppercase, tracking-widest (`tracking-[0.2em]`), tiny font size (`text-[10px]`), color `text-zinc-500`.
- Project List: Add generous vertical padding. It shouldn't look cramped.

#### B. The Agentic Workbench (Chat)
- **User Message:** Minimalist. No background bubble. Just text right-aligned.
- **Agent Message:** Left aligned. Avatar is minimal (small icon).
- **Thinking Process:** Don't use a solid box. Use a collapsible text block with a left border line (`border-l-2 border-zinc-700 pl-4`).
- **Code Blocks:** Darker background than the chat (`bg-black/40`), rounded corners (`rounded-lg`), subtle border.

#### C. The Automation Dashboard (Cards)
- **Glass Cards:** `bg-white/5` (5% opacity white), `hover:bg-white/10`, `border border-white/5`.
- **Transitions:** `transition-all duration-300 ease-out`.

## IMPLEMENTATION DIRECTIVE
Re-generate the `AppShell`, `Sidebar`, and `GlobalCommandBar` components using these new aesthetic rules.
- **Strict Constraint:** Do not use `slate` or `gray` colors. Use `zinc` or `neutral` for that warmer, premium Apple gray.
- **Icons:** Use `lucide-react` with `stroke-width={1.5}` (thinner, more elegant).