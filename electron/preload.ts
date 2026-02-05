const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  clone: (repoUrl, targetDir) => ipcRenderer.invoke('fs:clone', { repoUrl, targetDir }),
  read: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  write: (filePath, content) => ipcRenderer.invoke('fs:write', { filePath, content }),
  getNativeContext: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('native-context-reply', (event, data) => resolve(data));
      ipcRenderer.send('get-native-context');
    });
  },
  notify: (title, body) => ipcRenderer.send('notification:show', { title, body })
});
