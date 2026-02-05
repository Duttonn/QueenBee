/**
 * NativeService: A bridge between the React frontend and Electron native features.
 * Provides fallbacks for web mode to ensure the app doesn't crash outside of Electron.
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
    status: (path: string) => Promise<string>;
    diff: (path: string, filePath?: string) => Promise<string>;
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
      console.warn('[NativeService] readFile: Web Mode - Feature Unavailable');
      throw new Error('Native filesystem access only available in Desktop App');
    },
    writeFile: async (path: string, content: string) => {
      if (isElectron()) return getElectron().fs.writeFile(path, content);
      console.warn('[NativeService] writeFile: Web Mode - Feature Unavailable');
      throw new Error('Native filesystem access only available in Desktop App');
    },
    readDir: async (path: string) => {
      if (isElectron()) return getElectron().fs.readDir(path);
      console.warn('[NativeService] readDir: Web Mode - Feature Unavailable');
      return [];
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
      return 'Web Mode - Git Unavailable';
    },
    diff: async (path: string, filePath?: string) => {
      if (isElectron()) return getElectron().git.diff(path, filePath);
      return 'Web Mode - Diff Unavailable';
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
