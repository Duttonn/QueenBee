import { ISystemService } from '../interfaces/ISystemService';
import { API_BASE } from '../api';

export class WebAdapter implements ISystemService {
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
    clone: async (repoUrl: string, targetDir: string) => {
      // Web mode might not support local clone easily, 
      // but we could trigger a server-side clone if needed
      console.warn('Clone not supported in Web Mode');
      return null;
    },
  };

  shell = {
    openExternal: async (url: string) => {
      window.open(url, '_blank');
      return true;
    },
    showItemInFolder: async (path: string) => {
      console.warn('Show in folder not supported in Web Mode');
      return false;
    },
  };

  git = {
    status: async (path: string) => {
      const res = await fetch(`${API_BASE}/api/git/status?projectPath=${encodeURIComponent(path)}`);
      if (!res.ok) return 'Git status unavailable';
      const data = await res.json();
      return data.status || '';
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
    showOpen: async (options: any) => {
      console.warn('File dialogs not supported in Web Mode');
      return { canceled: true };
    },
    showMessage: async (options: any) => {
      alert(options.message);
      return { response: 0 };
    },
  };

  storage = {
    encrypt: async (plainText: string) => btoa(plainText), // Mock fallback
    decrypt: async (encryptedBase64: string) => atob(encryptedBase64), // Mock fallback
    getCachedAuth: async () => null,
  };

  auth = {
    onAuthSuccess: (callback: (data: any) => void) => {
      // In web mode, auth success is usually handled via URL params or cookies
      return () => {};
    },
  };

  logs = {
    log: (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
      const logger = console[level] || console.log;
      logger(`[Remote-Log] ${message}`);
    },
  };

  notify = (title: string, body: string) => {
    console.log(`[Notification] ${title}: ${body}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };
}
