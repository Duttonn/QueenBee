import type { IpcRendererEvent } from 'electron';
const { contextBridge, ipcRenderer } = require('electron');

export {}; // Treat as module


contextBridge.exposeInMainWorld('electron', {
  clone: (repoUrl: string, targetDir: string) => ipcRenderer.invoke('fs:clone', { repoUrl, targetDir }),
  read: (filePath: string) => ipcRenderer.invoke('fs:read', filePath),
  write: (filePath: string, content: string) => ipcRenderer.invoke('fs:write', { filePath, content }),
  
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:write', { filePath, content }),
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  },

  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  },

  git: {
    status: (projectPath: string) => ipcRenderer.invoke('git:status', projectPath),
    diff: (projectPath: string, filePath?: string) => ipcRenderer.invoke('git:diff', { projectPath, filePath }),
  },

  getNativeContext: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('native-context-reply', (event: IpcRendererEvent, data: any) => resolve(data));
      ipcRenderer.send('get-native-context');
    });
  },
  notify: (title: string, body: string) => ipcRenderer.send('notification:show', { title, body })
});
