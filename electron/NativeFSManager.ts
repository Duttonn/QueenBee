import type { IpcMainInvokeEvent } from 'electron';
const { ipcMain, shell, dialog, BrowserWindow, safeStorage } = require('electron');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * NativeFSManager: The IPC bridge for system-level operations.
 * This runs in the Electron Main process (Native side).
 */
export class NativeFSManager {
  setupHandlers() {
    // Secure Storage Operations
    ipcMain.handle('storage:encrypt', async (event: IpcMainInvokeEvent, plainText: string) => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          throw new Error('Encryption is not available on this system');
        }
        return safeStorage.encryptString(plainText).toString('base64');
      } catch (error: any) {
        console.error('[NativeFS] Encryption failed:', error);
        throw error;
      }
    });

    ipcMain.handle('storage:decrypt', async (event: IpcMainInvokeEvent, encryptedBase64: string) => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          throw new Error('Encryption is not available on this system');
        }
        const buffer = Buffer.from(encryptedBase64, 'base64');
        return safeStorage.decryptString(buffer);
      } catch (error: any) {
        console.error('[NativeFS] Decryption failed:', error);
        throw error;
      }
    });

    // FS Operations
    ipcMain.handle('fs:read', async (event: IpcMainInvokeEvent, filePath: string) => {
      try {
        console.log(`[NativeFS] Reading file: ${filePath}`);
        return await fs.readFile(filePath, 'utf-8');
      } catch (error: any) {
        console.error(`[NativeFS] Read failed for ${filePath}:`, error);
        throw error;
      }
    });

    ipcMain.handle('fs:write', async (event: IpcMainInvokeEvent, { filePath, content }: { filePath: string, content: string }) => {
      try {
        console.log(`[NativeFS] Writing file: ${filePath}`);
        await fs.outputFile(filePath, content);
        return true;
      } catch (error: any) {
        console.error(`[NativeFS] Write failed for ${filePath}:`, error);
        throw error;
      }
    });

    ipcMain.handle('fs:readDir', async (event: IpcMainInvokeEvent, dirPath: string) => {
      try {
        console.log(`[NativeFS] Reading directory: ${dirPath}`);
        return await fs.readdir(dirPath);
      } catch (error: any) {
        console.error(`[NativeFS] ReadDir failed for ${dirPath}:`, error);
        throw error;
      }
    });

    // Handler for cloning repos to the local machine
    ipcMain.handle('fs:clone', async (event: IpcMainInvokeEvent, { repoUrl, targetDir }: { repoUrl: string, targetDir: string }) => {
      try {
        console.log(`[NativeFS] Cloning ${repoUrl} into ${targetDir}`);
        const git = require('simple-git')();
        await git.clone(repoUrl, targetDir);
        return true;
      } catch (error: any) {
        console.error(`[NativeFS] Clone failed for ${repoUrl}:`, error);
        throw error;
      }
    });

    // Git Operations
    ipcMain.handle('git:status', async (event: IpcMainInvokeEvent, projectPath: string) => {
      try {
        console.log(`[NativeFS] Git status for: ${projectPath}`);
        const git = require('simple-git')(projectPath);
        return await git.status();
      } catch (error: any) {
        console.error(`[NativeFS] Git status failed for ${projectPath}:`, error);
        throw error;
      }
    });

    ipcMain.handle('git:diff', async (event: IpcMainInvokeEvent, { projectPath, filePath }: { projectPath: string, filePath?: string }) => {
      try {
        console.log(`[NativeFS] Git diff for: ${projectPath} (file: ${filePath || 'all'})`);
        const git = require('simple-git')(projectPath);
        if (filePath) {
          return await git.diff([filePath]);
        }
        return await git.diff();
      } catch (error: any) {
        console.error(`[NativeFS] Git diff failed for ${projectPath}:`, error);
        throw error;
      }
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