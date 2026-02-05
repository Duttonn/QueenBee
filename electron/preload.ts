const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  clone: (repoUrl, targetDir) => ipcRenderer.invoke('fs:clone', { repoUrl, targetDir }),
  read: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  write: (filePath, content) => ipcRenderer.invoke('fs:write', { filePath, content }),
  
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs:read', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:write', { filePath, content }),
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  },

  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  },

  git: {
    status: (projectPath) => ipcRenderer.invoke('git:status', projectPath),
    diff: (projectPath, filePath) => ipcRenderer.invoke('git:diff', { projectPath, filePath }),
  },

  getNativeContext: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('native-context-reply', (event, data) => resolve(data));
      ipcRenderer.send('get-native-context');
    });
  },
  notify: (title, body) => ipcRenderer.send('notification:show', { title, body })
});
