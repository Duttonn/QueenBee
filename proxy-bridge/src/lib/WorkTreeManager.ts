import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

export class WorkTreeManager {
  private baseDir = '/home/fish/clawd/projects/codex-clone/worktrees';

  async create(projectId: string, branchName: string, sourcePath: string) {
    const treePath = path.join(this.baseDir, projectId, branchName);
    await fs.ensureDir(treePath);
    
    console.log(`[WorkTree] Initializing ${branchName} for ${projectId}`);
    
    // Industrial approach: git worktree add
    try {
      execSync(`git worktree add -b ${branchName} ${treePath}`, { cwd: sourcePath });
    } catch (e) {
      // Fallback to rsync if not a git repo
      execSync(`rsync -av --exclude 'node_modules' ${sourcePath}/ ${treePath}/`);
    }

    // Auto-setup environment
    const setupScript = path.join(treePath, '.codex', 'setup.sh');
    if (fs.existsSync(setupScript)) {
      execSync(`bash ${setupScript}`, { cwd: treePath });
    }
    
    return treePath;
  }
}
