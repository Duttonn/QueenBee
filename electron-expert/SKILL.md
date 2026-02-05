---
name: electron-expert
description: Specialized knowledge for developing, building, and packaging Electron applications. Use when troubleshooting main process errors, configuring build tools like vite-plugin-electron, or implementing secure IPC bridges.
---

# Electron Expert

Specialized guidance for creating high-performance, secure, and properly packaged Electron applications.

## Core Workflows

### 1. Process Management & Module Formats
Electron's main process runs in Node.js, while the renderer process runs in a browser-like environment. 

- **Main Process**: Prefer **CommonJS (`require`)** for the main process files (`main.ts`, `NativeFSManager.ts`) if build tools struggle with ESM transpilation. This avoids `SyntaxError: Cannot use import statement outside a module`.
- **Renderer Process**: Usually React/Vue/Vite (ESM).
- **Preload Scripts**: The bridge between Main and Renderer. Must use `contextBridge` for security.

### 2. Secure IPC Bridge Pattern
Always use `contextBridge.exposeInMainWorld` in `preload.ts` to expose a limited, secure API to the renderer.

- **Preload (`preload.ts`)**:
  ```typescript
  import { contextBridge, ipcRenderer } from 'electron';
  contextBridge.exposeInMainWorld('electron', {
    doSomething: (args) => ipcRenderer.invoke('channel', args)
  });
  ```
- **Main (`main.ts`)**:
  ```typescript
  ipcMain.handle('channel', async (event, args) => {
    // Perform native operation
  });
  ```

### 3. Build & Packaging (Vite + Electron Builder)
When using `vite-plugin-electron`:
- **Relative Paths**: Set `base: './'` in `vite.config.ts` to ensure assets load correctly via `file://`.
- **Package Config**: Ensure `files` in `package.json` includes both `dist-electron` (main) and `dist` (renderer).
- **Path Resolution**: In the main process, resolve paths to `index.html` relative to `__dirname`.

## Troubleshooting

- **Blank Screen**: Check if `base: './'` is set in `vite.config.ts`. Check `package.json` `files` array. Check paths in `win.loadURL`.
- **SyntaxError (import)**: Convert main process files to use `require`. Use `export {};` at the end of `.ts` files to satisfy the compiler while using `require`.
- **TypeScript Errors**: Use `import type` for Electron types in files using `require` to keep the output clean but the developer experience typed.

## Specialized References

- **Build Fixes**: See [build-fixes.md](references/build-fixes.md) for ESM vs CJS and pathing details.
- **IPC Guide**: See [ipc-guide.md](references/ipc-guide.md) for advanced communication patterns.