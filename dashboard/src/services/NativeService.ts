import * as api from './api';

/**
 * NativeService: A bridge between the React frontend and Electron native features.
 * Provides fallbacks for web mode using the proxy-bridge API to ensure functionality.
 */

export interface NativeBridge {
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<boolean>;
    readDir: (path: string) => Promise<string[]>;
  };
  shell: {
    openExternal: (url: string) => Promise<boolean>;
    showItemInFolder: (path: string) => Promise<boolean>;
  };
  git: {
    status: (path: string) => Promise<any>;
    diff: (path: string, filePath?: string) => Promise<any>;
  };
  dialog: {
    showOpen: (options: any) => Promise<any>;
    showMessage: (options: any) => Promise<any>;
  };
  storage: {
    encrypt: (plainText: string) => Promise<string>;
    decrypt: (encryptedBase64: string) => Promise<string>;
  };
  notify: (title: string, body: string) => void;
}

const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electron !== undefined;
};

const getElectron = () => (window as any).electron;

export const NativeService: NativeBridge = {
  fs: {
    readFile: async (path: string) => {
      if (isElectron()) return getElectron().fs.readFile(path);
      console.log(`[NativeService] readFile (Web Mode): ${path}`);
      const res = await api.readFile(path);
      return res.content;
    },
    writeFile: async (path: string, content: string) => {
      if (isElectron()) return getElectron().fs.writeFile(path, content);
      console.log(`[NativeService] writeFile (Web Mode): ${path}`);
      await api.writeFile(path, content);
      return true;
    },
    readDir: async (path: string) => {
      if (isElectron()) return getElectron().fs.readDir(path);
      console.warn('[NativeService] readDir: Web Mode - Feature Unavailable (Limited API)');
      return []; // We might need a GET /api/files/list if needed
    }
  },
  shell: {
    openExternal: async (url: string) => {
      if (isElectron()) return getElectron().shell.openExternal(url);
      window.open(url, '_blank');
      return true;
    },
    showItemInFolder: async (path: string) => {
      if (isElectron()) return getElectron().shell.showItemInFolder(path);
      console.warn('[NativeService] showItemInFolder: Web Mode - Feature Unavailable');
      return false;
    }
  },
  git: {
    status: async (path: string) => {
      if (isElectron()) return getElectron().git.status(path);
      console.log(`[NativeService] gitStatus (Web Mode): ${path}`);
      const status = await api.getGitStatus(path);
      return JSON.stringify(status, null, 2);
    },
    diff: async (path: string, filePath?: string) => {
      if (isElectron()) return getElectron().git.diff(path, filePath);
      console.log(`[NativeService] gitDiff (Web Mode): ${path}`);
      const diff = await api.getGitDiff(path, filePath);
      // NativeBridge expects a string for diff usually, or we might need to adjust based on consumer.
      return JSON.stringify(diff, null, 2);
    }
  },
  dialog: {
    showOpen: async (options: any) => {
      if (isElectron()) return getElectron().dialog.showOpen(options);
      console.warn('[NativeService] showOpen: Web Mode - Using prompt fallback');
      const path = prompt('Enter folder path:', '');
      if (path) return { canceled: false, filePaths: [path] };
      return { canceled: true };
    },
    showMessage: async (options: any) => {
      if (isElectron()) return getElectron().dialog.showMessage(options);
      alert(options.message);
      return { response: 0 };
    }
  },
  storage: {
    encrypt: async (plainText: string) => {
      if (isElectron()) return getElectron().storage.encrypt(plainText);
      console.warn('[NativeService] storage.encrypt: Web Mode - Fallback to plain text');
      return btoa(plainText); // Simple base64 fallback for web (not secure!)
    },
    decrypt: async (encryptedBase64: string) => {
      if (isElectron()) return getElectron().storage.decrypt(encryptedBase64);
      console.warn('[NativeService] storage.decrypt: Web Mode - Fallback to plain text');
      return atob(encryptedBase64);
    }
  },
  notify: (title: string, body: string) => {
    if (isElectron()) {
      getElectron().notify(title, body);
    } else {
      console.log(`[Notification] ${title}: ${body}`);
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
};