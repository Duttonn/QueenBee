import { ISystemService } from '../interfaces/ISystemService';
import { API_BASE } from '../api';

export class ElectronAdapter implements ISystemService {
  private get electron() {
    return (window as any).electron;
  }

  fs = {
    readFile: async (path: string) => {
      return await this.electron.fs.readFile(path);
    },
    writeFile: async (path: string, content: string) => {
      return await this.electron.fs.writeFile(path, content);
    },
    readDir: async (path: string) => {
      return await this.electron.fs.readDir(path);
    },
    clone: (repoUrl: string, targetDir: string) => this.electron.clone(repoUrl, targetDir),
  };

  shell = {
    openExternal: (url: string) => this.electron.shell.openExternal(url),
    showItemInFolder: (path: string) => this.electron.shell.showItemInFolder(path),
  };

  git = {
    status: async (path: string) => {
      const status = await this.electron.git.status(path);
      return typeof status === 'string' ? status : JSON.stringify(status, null, 2);
    },
    diff: async (path: string, filePath?: string) => {
      return await this.electron.git.diff(path, filePath);
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
