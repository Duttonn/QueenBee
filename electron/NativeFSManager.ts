import { ipcMain } from 'electron';
import { exec } from 'child_process';
import fs from 'fs-extra';

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
  }
}
