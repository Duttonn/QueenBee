export interface ISystemService {
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<boolean>;
    readDir: (path: string) => Promise<string[]>;
    clone: (repoUrl: string, targetDir: string) => Promise<any>;
  };
  shell: {
    openExternal: (url: string) => Promise<boolean>;
    showItemInFolder: (path: string) => Promise<boolean>;
  };
  git: {
    status: (path: string) => Promise<string>;
    diff: (path: string, filePath?: string) => Promise<string>;
  };
  dialog: {
    showOpen: (options: any) => Promise<any>;
    showMessage: (options: any) => Promise<any>;
  };
  storage: {
    encrypt: (plainText: string) => Promise<string>;
    decrypt: (encryptedBase64: string) => Promise<string>;
    getCachedAuth: () => Promise<any>;
  };
  auth: {
    onAuthSuccess: (callback: (data: any) => void) => () => void;
  };
  logs: {
    log: (level: 'info' | 'warn' | 'error' | 'debug', message: string) => void;
  };
  notify: (title: string, body: string) => void;
}
