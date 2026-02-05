import { ipcMain, shell } from 'electron';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * NativeFSManager: The IPC bridge for system-level operations.
 * This runs in the Electron Main process (Native side).
 */
export class NativeFSManager {
  setupHandlers() {
    // Handler for cloning repos to the local machine
    ipcMain.handle('fs:clone', async (event, { repoUrl, targetDir }) => {
      console.log(`[NativeFS] Cloning ${repoUrl} into ${targetDir}`);
      return new Promise((resolve, reject) => {
        exec(`git clone ${repoUrl} ${targetDir}`, (error, stdout, stderr) => {
          if (error) reject(stderr);
          else resolve(stdout);
        });
      });
    });

    // Handler for reading local system files
    ipcMain.handle('fs:read', async (event, filePath) => {
      return await fs.readFile(filePath, 'utf-8');
    });

    // Handler for writing local system files
    ipcMain.handle('fs:write', async (event, { filePath, content }) => {
      await fs.writeFile(filePath, content);
      return true;
    });

    // Handler for listing directory content
    ipcMain.handle('fs:readDir', async (event, dirPath) => {
      return await fs.readdir(dirPath);
    });

    // Shell Operations
    ipcMain.handle('shell:openExternal', async (event, url) => {
      await shell.openExternal(url);
      return true;
    });

    ipcMain.handle('shell:showItemInFolder', async (event, filePath) => {
      shell.showItemInFolder(filePath);
      return true;
    });

    // Git Operations (Basic wrappers around CLI)
    ipcMain.handle('git:status', async (event, projectPath) => {
      return new Promise((resolve, reject) => {
        exec('git status --json', { cwd: projectPath }, (error, stdout) => {
          // Note: git status doesn't have a --json flag by default, 
          // this is just a placeholder for the intent. 
          // For now we return raw output or use a library if available.
          exec('git status', { cwd: projectPath }, (err, out) => {
            if (err) reject(err);
            else resolve(out);
          });
        });
      });
    });

    ipcMain.handle('git:diff', async (event, { projectPath, filePath }) => {
      return new Promise((resolve, reject) => {
        const cmd = filePath ? `git diff ${filePath}` : 'git diff';
        exec(cmd, { cwd: projectPath }, (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
    });
  }
}
