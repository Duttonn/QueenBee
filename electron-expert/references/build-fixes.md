# Electron Build Fixes

## ESM vs CommonJS (CJS)

If you see `SyntaxError: Cannot use import statement outside a module` in the main process:

1. **Convert to `require`**: Change `import` to `const { ... } = require('electron')`.
2. **TypeScript Module Hack**: Add `export {};` at the bottom of the file.
3. **Type Imports**: Use `import type { ... } from 'electron'` for type definitions.

Example:
```typescript
import type { IpcMainEvent } from 'electron';
const { ipcMain } = require('electron');

ipcMain.on('channel', (event: IpcMainEvent) => { ... });

export {};
```

## Packaging & Paths

### `package.json`
Must include all built directories:
```json
"build": {
  "files": [
    "dashboard/dist-electron/**",
    "dashboard/dist/**"
  ]
}
```

### `vite.config.ts`
Must use relative paths:
```typescript
export default defineConfig({
  base: './',
  // ...
})
```

### Path Resolution in `main.ts`
```javascript
const startUrl = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5173' 
  : `file://${path.join(__dirname, '../dist/index.html')}`;
```
Note: Path relative to the compiled `main.js` location.
