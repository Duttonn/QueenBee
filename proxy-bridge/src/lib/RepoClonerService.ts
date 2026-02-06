import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Paths } from './Paths';

export class RepoClonerService {
  private baseDir: string;

  constructor() {
    // Jail workspaces in ~/.codex/workspaces
    this.baseDir = Paths.getCloudWorkspacesDir();
    fs.ensureDirSync(this.baseDir);
  }

  /**
   * Clones a repository to a temporary server directory.
   * @param repoUrl The GitHub URL (https://github.com/user/repo)
   * @param accessToken Optional OAuth token for private repos
   */
  async clone(repoUrl: string, accessToken?: string): Promise<{ path: string; id: string }> {
    const sessionId = uuidv4();
    const targetPath = path.join(this.baseDir, `cloud-${sessionId}`);
    
    // Inject token if provided: https://<token>@github.com/user/repo
    let authenticatedUrl = repoUrl;
    if (accessToken) {
      authenticatedUrl = repoUrl.replace('https://', `https://${accessToken}@`);
    }

    console.log(`[CloudClone] Cloning ${repoUrl} to ${targetPath}`);
    
    const git: SimpleGit = simpleGit();
    await git.clone(authenticatedUrl, targetPath);

    return { path: targetPath, id: sessionId };
  }

  async cleanup(sessionId: string) {
    const targetPath = path.join(this.baseDir, `cloud-${sessionId}`);
    if (await fs.pathExists(targetPath)) {
      await fs.remove(targetPath);
    }
  }
}
