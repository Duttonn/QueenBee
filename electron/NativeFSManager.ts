import type { IpcMainInvokeEvent } from 'electron';
const { ipcMain, shell } = require('electron');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * NativeFSManager: The IPC bridge for system-level operations.
 * This runs in the Electron Main process (Native side).
 */
class NativeFSManager {
  setupHandlers() {
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
        exec('git status', { cwd: projectPath }, (err: any, out: string) => { // Removed --json as it's not standard git status
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
  }
}

module.exports = { NativeFSManager };
