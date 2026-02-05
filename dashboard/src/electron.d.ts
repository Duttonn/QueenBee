export interface IElectronAPI {
  clone: (repoUrl: string, targetDir: string) => Promise<string>;
  read: (filePath: string) => Promise<string>;
  write: (filePath: string, content: string) => Promise<boolean>;
  getNativeContext: () => Promise<{ focusedApp: string }>;
  notify: (title: string, body: string) => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
