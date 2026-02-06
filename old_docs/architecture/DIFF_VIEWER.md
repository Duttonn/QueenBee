# Codex Hive: VSCode-Style Diff Visualization

## 1. Split-Pane Side-by-Side Diff
The UI will implement a standard side-by-side diff view.
- **Left Pane:** Original (Base) code with red highlighting for removals.
- **Right Pane:** Modified (Current) code with green highlighting for additions.
- **Synchronized Scrolling:** Scrolling in one pane automatically moves the other.

## 2. Integrated Syntax Highlighting
Using `Prism.js` or `Monaco Editor` to maintain developer-grade readability.
- Support for Swift, JS/TS, Python, C++, and Markdown.

## 3. Inline "Jump to Change"
A mini-map or vertical gutter showing where changes occur in the file, allowing for quick navigation through long diffs.

## 4. AI Summary Overlay
The Queen Bee provides a high-level summary of *why* these lines changed, pinned to the top of the diff view.
- *Example:* "Replaced hardcoded API endpoint with env variable for security."

## 5. UI Implementation
New component: `DiffViewer.tsx`.
- Triggered by clicking the "diff" button in the Source Control panel.
