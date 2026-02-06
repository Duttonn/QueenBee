# Codex Hive: Visual Annotation & Feedback Protocol

## 1. Concept: Semantic Pinning
The user can drop a **Comment Pin** directly onto the Live View of the application. Each pin is "Semantic": it isn't just stored at (X,Y) coordinates but is bound to a specific **Component ID** or **RealityKit Entity**.

## 2. The Feedback Loop
1. **User Action:** Clicks an element in the Hive Live View and types: "Make this label bold and blue."
2. **Context Binding:** The `DeepInspector` captures the component metadata (file, line, current props).
3. **Task Generation:** The Queen Bee creates an autonomous task:
   - *Target:* `src/components/StatusLabel.tsx:12`
   - *Instruction:* "Apply bold and blue styles."
   - *Context:* User annotation screenshot + current code snippet.
4. **Execution:** An agent spawns in a WorkTree, applies the change, and uses the `RuntimeBridge` to verify the new styles.

## 3. Visual Markups
- **Highlighting:** The Orchestrator can "draw" on the Live View to show the user what it's about to change.
- **Diff Preview:** Before merging, the agent can show a "Visual Diff": a ghost overlay of the new UI on top of the old one.

## 4. UI Implementation: `AnnotationLayer.tsx`
A transparent SVG/Canvas layer over the Live View that handles:
- Click-to-pin interactions.
- Rendering of active agent "thoughts" (e.g., "I am looking at this button...").
- Tooltips for existing annotations.
