import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Paths } from './Paths';
import { broadcast } from './socket-instance';

export class RepoClonerService {
  private baseDir: string;

  constructor() {
    // Jail workspaces in ~/.codex/workspaces
    this.baseDir = path.join(Paths.getCodexHome(), 'workspaces');
    fs.ensureDirSync(this.baseDir);
  }

  /**
   * Clones a repository to a temporary server directory.
   * @param repoUrl The GitHub URL (https://github.com/user/repo)
   * @param accessToken Optional OAuth token for private repos
   * @param branch Optional branch to clone
   */
  async clone(repoUrl: string, accessToken?: string, branch?: string): Promise<{ path: string; id: string }> {
    const sessionId = uuidv4();
    const targetPath = path.join(this.baseDir, `cloud-${sessionId}`);
    
    // Inject token if provided: https://<token>@github.com/user/repo
    let authenticatedUrl = repoUrl;
    if (accessToken) {
      authenticatedUrl = repoUrl.replace('https://', `https://${accessToken}@`);
    }

    console.log(`[CloudClone] Cloning ${repoUrl} to ${targetPath} (branch: ${branch || 'default'})`);
    
    const git: SimpleGit = simpleGit();
    
    try {
      await git.clone(authenticatedUrl, targetPath, {
        '--progress': null,
        ...(branch ? { '--branch': branch } : {})
      }, (err, data) => {
        if (err) {
          console.error(`[CloudClone] Progress error:`, err);
        }
      });

      broadcast('UI_UPDATE', {
        action: 'NOTIFY',
        payload: {
          title: 'Cloud Clone Success',
          message: `Repository cloned to ${targetPath}`,
          type: 'success'
        }
      });

      return { path: targetPath, id: sessionId };
    } catch (error: any) {
      console.error(`[CloudClone] Failed to clone ${repoUrl}:`, error);
      
      // Cleanup partially created directory
      if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
      }
      
      throw new Error(`Git clone failed: ${error.message}`);
    }
  }

  async cleanup(sessionId: string) {
    const targetPath = path.join(this.baseDir, `cloud-${sessionId}`);
    if (await fs.pathExists(targetPath)) {
      await fs.remove(targetPath);
    }
  }
}
