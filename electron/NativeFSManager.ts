import type { IpcMainInvokeEvent } from 'electron';
const { ipcMain, shell, dialog, BrowserWindow, safeStorage } = require('electron');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * NativeFSManager: The IPC bridge for system-level operations.
 * This runs in the Electron Main process (Native side).
 * IMPORTANT: This module should ONLY be used by the Electron main process.
 * It should NOT import or directly interact with backend logic (e.g., ToolExecutor)
 * that is meant for the Node.js proxy-bridge server.
 */
export class NativeFSManager {
  setupHandlers() {
    // Secure Storage Operations
    ipcMain.handle('storage:encrypt', async (event: IpcMainInvokeEvent, plainText: string) => {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this system');
      }
      return safeStorage.encryptString(plainText).toString('base64');
    });

    ipcMain.handle('storage:decrypt', async (event: IpcMainInvokeEvent, encryptedBase64: string) => {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this system');
      }
      const buffer = Buffer.from(encryptedBase64, 'base64');
      return safeStorage.decryptString(buffer);
    });

    // Handler for cloning repos to the local machine
    ipcMain.handle('fs:clone', async (event: IpcMainInvokeEvent, { repoUrl, targetDir }: { repoUrl: string, targetDir: string }) => {
      console.log(`[NativeFS] Cloning ${repoUrl} into ${targetDir}`);
      return new Promise((resolve, reject) => {
        exec(`git clone ${repoUrl} ${targetDir}`, (error: any, stdout: string, stderr: string) => {
          if (error) reject(stderr);
          else resolve(stdout);
        });
      });
    });

    // Handler for reading local system files
    ipcMain.handle('fs:read', async (event: IpcMainInvokeEvent, filePath: string) => {
      return await fs.readFile(filePath, 'utf-8');
    });

    // Handler for writing local system files
    ipcMain.handle('fs:write', async (event: IpcMainInvokeEvent, { filePath, content }: { filePath: string, content: string }) => {
      await fs.writeFile(filePath, content);
      return true;
    });

    // Handler for listing directory content
    ipcMain.handle('fs:readDir', async (event: IpcMainInvokeEvent, dirPath: string) => {
      return await fs.readdir(dirPath);
    });

    // Shell Operations
    ipcMain.handle('shell:openExternal', async (event: IpcMainInvokeEvent, url: string) => {
      await shell.openExternal(url);
      return true;
    });

    ipcMain.handle('shell:showItemInFolder', async (event: IpcMainInvokeEvent, filePath: string) => {
      shell.showItemInFolder(filePath);
      return true;
    });

    // Git Operations (Basic wrappers around CLI)
    ipcMain.handle('git:status', async (event: IpcMainInvokeEvent, projectPath: string) => {
      return new Promise((resolve, reject) => {
        exec('git status', { cwd: projectPath }, (err: any, out: string) => {
            if (err) reject(err);
            else resolve(out);
          });
      });
    });

    ipcMain.handle('git:diff', async (event: IpcMainInvokeEvent, { projectPath, filePath }: { projectPath: string, filePath?: string }) => {
      return new Promise((resolve, reject) => {
        const cmd = filePath ? `git diff ${filePath}` : 'git diff';
        exec(cmd, { cwd: projectPath }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
    });

    // Native Dialogs
    ipcMain.handle('dialog:showOpen', async (event: IpcMainInvokeEvent, options: any) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      return await dialog.showOpenDialog(win, options);
    });

    ipcMain.handle('dialog:showMessage', async (event: IpcMainInvokeEvent, options: any) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      return await dialog.showMessageBox(win, options);
    });
  }
}