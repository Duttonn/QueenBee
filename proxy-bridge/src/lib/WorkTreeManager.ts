import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * WorkTreeManager (Industrial Edition)
 * Manages the lifecycle of ephemeral git checkouts for agentic work.
 */
export class WorkTreeManager {
  private baseDir = '/home/fish/clawd/projects/codex-clone/worktrees';

  constructor(baseDir?: string) {
    if (baseDir) this.baseDir = baseDir;
  }

  /**
   * Creates a new isolated worktree for a specific task
   */
  async create(projectId: string, branchName: string, sourcePath: string) {
    const treePath = path.join(this.baseDir, projectId, branchName);
    await fs.ensureDir(path.dirname(treePath));
    
    console.log(`[WorkTree] Initializing ${branchName} for ${projectId} at ${treePath}`);
    
    try {
      // Use native git worktree for maximum performance and correct HEAD tracking
      execSync(`git worktree add -b ${branchName} ${treePath}`, { cwd: sourcePath, stdio: 'pipe' });
    } catch (e: any) {
      console.warn(`[WorkTree] Native worktree failed, falling back to rsync: ${e.message}`);
      await fs.ensureDir(treePath);
      execSync(`rsync -av --exclude 'node_modules' --exclude '.git' ${sourcePath}/ ${treePath}/`);
    }

    // Phase 2 logic: Automatic environment setup (PRD requirement)
    const setupScript = path.join(treePath, '.codex', 'setup.sh');
    if (fs.existsSync(setupScript)) {
      console.log(`[WorkTree] Running project-specific setup for ${projectId}`);
      try {
        execSync(`bash ${setupScript}`, { cwd: treePath, stdio: 'inherit' });
      } catch (err) {
        console.error(`[WorkTree] Setup script failed: ${err}`);
      }
    }
    
    return treePath;
  }

  /**
   * Removes a worktree and cleans up git state
   */
  async cleanup(treePath: string) {
    console.log(`[WorkTree] Cleaning up ${treePath}`);
    try {
      execSync(`git worktree remove ${treePath}`, { stdio: 'pipe' });
    } catch (e) {
      await fs.remove(treePath);
    }
  }
}
