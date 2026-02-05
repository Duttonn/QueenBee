# Codex Hive: Visual UI Diff Protocol

## 1. Concept: Ghost Overlays
To verify UI changes between the "Base" version and the "WorkTree" version, the Hive provides a **Visual UI Diff**. Instead of just comparing code, it compares the rendered output.

## 2. Modes of Comparison
- **Ghosting:** The new UI is overlaid on the old one with 50% opacity.
- **Side-by-Side:** Traditional left/right comparison of screenshots.
- **Slider (Swipe):** A vertical handle allows the user to swipe between "Before" and "After."

## 3. Automation Bridge
When an agent finishes a UI task:
1. **Snap Base:** The `MCPBridge` takes a reference screenshot of the current `main` branch.
2. **Apply & Build:** The agent applies changes in the WorkTree and rebuilds.
3. **Snap Delta:** A second screenshot is taken from the exact same viewport/entity.
4. **Analysis:** The `ScreenshotAnalyzer` calculates the visual delta (pixel-diff) and highlights modified areas in the UI.

## 4. UI Implementation: `VisualUIDiff.tsx`
A component that wraps the `LiveView` and enables the overlay modes during the "Review & Ship" phase.
