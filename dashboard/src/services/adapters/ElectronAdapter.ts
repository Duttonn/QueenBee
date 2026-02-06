import { ISystemService } from '../interfaces/ISystemService';

const API_BASE = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://127.0.0.1:3000';

export class ElectronAdapter implements ISystemService {
  private get electron() {
    return (window as any).electron;
  }

  fs = {
    readFile: async (path: string) => {
      const res = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error('Read failed');
      const data = await res.json();
      return data.content;
    },
    writeFile: async (path: string, content: string) => {
      const res = await fetch(`${API_BASE}/api/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
      return res.ok;
    },
    readDir: async (path: string) => {
      const res = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.isDirectory ? data.files : [];
    },
    clone: (repoUrl: string, targetDir: string) => this.electron.clone(repoUrl, targetDir),
  };

  shell = {
    openExternal: (url: string) => this.electron.shell.openExternal(url),
    showItemInFolder: (path: string) => this.electron.shell.showItemInFolder(path),
  };

  git = {
    status: async (path: string) => {
      const res = await fetch(`${API_BASE}/api/git/status?path=${encodeURIComponent(path)}`);
      if (!res.ok) return 'Git status unavailable';
      const data = await res.json();
      // Adjust according to backend response structure
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    },
    diff: async (path: string, filePath?: string) => {
      const params = new URLSearchParams({ projectPath: path });
      if (filePath) params.append('filePath', filePath);
      const res = await fetch(`${API_BASE}/api/git/diff?${params.toString()}`);
      if (!res.ok) return 'Diff unavailable';
      const data = await res.json();
      return data.raw || '';
    },
  };

  dialog = {
    showOpen: (options: any) => this.electron.dialog.showOpen(options),
    showMessage: (options: any) => this.electron.dialog.showMessage(options),
  };

  storage = {
    encrypt: (plainText: string) => this.electron.storage.encrypt(plainText),
    decrypt: (encryptedBase64: string) => this.electron.storage.decrypt(encryptedBase64),
    getCachedAuth: () => this.electron.getCachedAuth(),
  };

  auth = {
    onAuthSuccess: (callback: (data: any) => void) => this.electron.onAuthSuccess(callback),
  };

  logs = {
    log: (level: any, message: string) => this.electron.log(level, message),
  };

  notify = (title: string, body: string) => this.electron.notify(title, body);
}
