# Secure IPC Bridge Guide

## Patterns

### Invoke/Handle (Asynchronous)
Preferred for most operations. Returns a Promise.

**Main:**
```javascript
ipcMain.handle('get-data', async (event, id) => {
  return await db.find(id);
});
```

**Preload:**
```javascript
getData: (id) => ipcRenderer.invoke('get-data', id)
```

### Send/On (One-way or Event-based)
Used for notifications or data streaming.

**Main:**
```javascript
win.webContents.send('status-update', 'Busy');
```

**Preload:**
```javascript
onStatusUpdate: (callback) => ipcRenderer.on('status-update', (event, ...args) => callback(...args))
```

## Security Best Practices

1. **Context Isolation**: Always keep `contextIsolation: true`.
2. **No Node in Renderer**: Set `nodeIntegration: false`.
3. **Whitelist Channels**: Don't relay `ipcRenderer.send` directly. Wrap it in specific functions.
4. **Validate Arguments**: Always validate data received from the renderer in the main process.
