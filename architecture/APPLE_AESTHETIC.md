# Queen Bee: Atlas-Style UI Design System

Inspired by the 'ChatGPT Atlas' / 'Codex App' visual patterns.

## 1. Top-Right Global Trigger ("Ask Queen Bee")
- **Visual:** A circular floating button in the top-right corner.
- **Behavior:** Persistent across all views. Triggering it (Cmd+K) slides out the Queen Bee Command Bar.
- **Aesthetic:** Translucent blur background (`backdrop-blur-md`) with a subtle blue outer glow.

## 2. Contextual Annotations (The Left Sidebar)
Instead of just a file tree, the sidebar will support **Semantic Annotations**:
- **Accessibility Checks:** Automatic contrast and ARIA labels warnings.
- **Dev Constraints:** Max-width, responsive breakpoints, and performance notes.
- **Badges:** Colored labels (Purple for Dev, Teal for A11y, Blue for Logic).

## 3. Side-by-Side Previews (Responsive Testing)
The main workbench will support a **Split Canvas** mode:
- **Left Pane:** Desktop view.
- **Right Pane:** Mobile view.
- **Sync:** Scrolling or clicking in one view mirrors the action in the other.

## 4. Floating 'Agentic' Toolbelt (Bottom Center)
A floating pill-shaped bar at the bottom center:
- **Tools:** Screenshot, Record, Run Tests, Terminal Toggle.
- **Interaction:** Glassmorphism style, expanding only when needed.

## 5. Live Code Bridge (Right Pane)
A persistent inspection panel on the right:
- **Code Connect:** Shows the React/Swift code currently related to the selected UI element.
- **Layer Properties:** Flexbox/Layout details in real-time.
