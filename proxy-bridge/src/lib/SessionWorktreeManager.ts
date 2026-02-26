import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

/**
 * Worktree configuration
 */
export interface WorktreeConfig {
  sessionId: string;
  projectPath: string;
  branchName: string;
  worktreePath: string;
  mainBranch: string;
  createdAt: string;
}

/**
 * Session Worktree Manager - Hash-based worktree isolation
 * Based on Composio's pattern for session isolation
 */
export class SessionWorktreeManager {
  private baseDir: string;
  private projectId: string;

  constructor(baseDir: string, projectPath: string) {
    this.baseDir = baseDir;
    // Generate a hash from the project path to prevent collisions
    this.projectId = this.hashProjectPath(projectPath);
  }

  /**
   * Generate hash from project path
   */
  private hashProjectPath(projectPath: string): string {
    const hash = crypto.createHash('md5').update(projectPath).digest('hex');
    return hash.substring(0, 8);
  }

  /**
   * Get the worktree root directory
   */
  getWorktreeRoot(): string {
    return path.join(this.baseDir, `${this.projectId}-worktrees`);
  }

  /**
   * Get session worktree directory
   */
  getSessionDir(sessionId: string): string {
    return path.join(this.getWorktreeRoot(), sessionId);
  }

  /**
   * Create a new worktree for a session
   */
  async createWorktree(
    sessionId: string,
    branchName: string,
    mainBranch: string = 'main'
  ): Promise<WorktreeConfig> {
    const worktreePath = this.getSessionDir(sessionId);
    
    console.log(`[SessionWorktreeManager] Creating worktree at ${worktreePath} for branch ${branchName}`);

    // Ensure worktree root exists
    await fs.ensureDir(this.getWorktreeRoot());

    // Check if branch already exists (might be from previous session)
    try {
      execSync(`git branch ${branchName}`, { 
        cwd: this.baseDir, 
        stdio: 'ignore' 
      });
    } catch {
      // Branch might already exist, that's ok
    }

    // Create worktree
    try {
      execSync(`git worktree add ${worktreePath} ${branchName}`, {
        cwd: this.baseDir,
        stdio: 'pipe',
      });
    } catch (error: any) {
      // If worktree already exists, just use it
      if (error.message?.includes('already exists')) {
        console.log(`[SessionWorktreeManager] Worktree already exists at ${worktreePath}`);
      } else {
        throw error;
      }
    }

    const config: WorktreeConfig = {
      sessionId,
      projectPath: this.baseDir,
      branchName,
      worktreePath,
      mainBranch,
      createdAt: new Date().toISOString(),
    };

    // Save worktree config
    await this.saveConfig(sessionId, config);

    return config;
  }

  /**
   * Remove a worktree for a session
   */
  async removeWorktree(sessionId: string, branchName?: string): Promise<void> {
    const worktreePath = this.getSessionDir(sessionId);
    
    console.log(`[SessionWorktreeManager] Removing worktree at ${worktreePath}`);

    // Remove worktree from git
    try {
      execSync(`git worktree remove ${worktreePath} --force`, {
        cwd: this.baseDir,
        stdio: 'pipe',
      });
    } catch {
      // Might already be removed
    }

    // Remove config file
    const configPath = this.getConfigPath(sessionId);
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
  }

  /**
   * Archive a completed session's worktree
   */
  async archiveWorktree(sessionId: string): Promise<void> {
    const worktreePath = this.getSessionDir(sessionId);
    const archivePath = path.join(this.getWorktreeRoot(), 'archive', sessionId);
    
    console.log(`[SessionWorktreeManager] Archiving worktree from ${worktreePath} to ${archivePath}`);

    if (await fs.pathExists(worktreePath)) {
      await fs.ensureDir(path.dirname(archivePath));
      await fs.move(worktreePath, archivePath);
    }

    // Move config to archive
    const configPath = this.getConfigPath(sessionId);
    const archiveConfigPath = path.join(
      this.getWorktreeRoot(), 
      'archive', 
      `${sessionId}.json`
    );
    
    if (await fs.pathExists(configPath)) {
      await fs.ensureDir(path.join(this.getWorktreeRoot(), 'archive'));
      await fs.move(configPath, archiveConfigPath);
    }
  }

  /**
   * Get worktree config for a session
   */
  async getConfig(sessionId: string): Promise<WorktreeConfig | null> {
    const configPath = this.getConfigPath(sessionId);
    
    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    return await fs.readJson(configPath);
  }

  /**
   * Save worktree config
   */
  private async saveConfig(sessionId: string, config: WorktreeConfig): Promise<void> {
    const configPath = this.getConfigPath(sessionId);
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  /**
   * Get config file path
   */
  private getConfigPath(sessionId: string): string {
    return path.join(this.getWorktreeRoot(), `${sessionId}.json`);
  }

  /**
   * List all active worktrees
   */
  async listWorktrees(): Promise<WorktreeConfig[]> {
    const worktreeRoot = this.getWorktreeRoot();
    
    if (!(await fs.pathExists(worktreeRoot))) {
      return [];
    }

    const entries = await fs.readdir(worktreeRoot, { withFileTypes: true });
    const worktrees: WorktreeConfig[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const config = await fs.readJson(path.join(worktreeRoot, entry.name));
          worktrees.push(config);
        } catch {
          // Skip invalid configs
        }
      }
    }

    return worktrees;
  }

  /**
   * Check if a worktree exists for a session
   */
  async worktreeExists(sessionId: string): Promise<boolean> {
    const worktreePath = this.getSessionDir(sessionId);
    return await fs.pathExists(worktreePath);
  }

  /**
   * Clean up stale worktrees (not used in X days)
   */
  async cleanupStaleWorktrees(maxAgeDays: number = 7): Promise<number> {
    const worktrees = await this.listWorktrees();
    let cleaned = 0;
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const worktree of worktrees) {
      const createdAt = new Date(worktree.createdAt).getTime();
      if (now - createdAt > maxAgeMs) {
        await this.archiveWorktree(worktree.sessionId);
        cleaned++;
      }
    }

    console.log(`[SessionWorktreeManager] Cleaned up ${cleaned} stale worktrees`);
    return cleaned;
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(prefix: string = 'session'): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate a branch name from session ID
   */
  static generateBranchName(sessionId: string): string {
    return `feature/${sessionId}`;
  }
}
