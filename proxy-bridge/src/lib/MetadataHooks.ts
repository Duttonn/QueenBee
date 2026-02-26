import fs from 'fs-extra';
import path from 'path';

/**
 * Session metadata stored in flat key=value format
 */
export interface SessionMetadata {
  project?: string;
  issue?: string;
  branch?: string;
  status?: string;
  tmuxName?: string;
  worktree?: string;
  createdAt?: string;
  pr?: string;
  [key: string]: string | undefined;
}

/**
 * Metadata Hooks - Auto-update session metadata when agents run git/gh commands
 * Based on Composio's PostToolUse hooks pattern
 */
export class MetadataHooks {
  private sessionDir: string;

  constructor(sessionDir: string) {
    this.sessionDir = sessionDir;
  }

  /**
   * Get the metadata file path
   */
  private getMetadataPath(): string {
    return path.join(this.sessionDir, 'session');
  }

  /**
   * Read current metadata
   */
  async readMetadata(): Promise<SessionMetadata> {
    const metadataPath = this.getMetadataPath();
    
    if (!(await fs.pathExists(metadataPath))) {
      return {};
    }

    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata: SessionMetadata = {};
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        metadata[key] = value;
      }
    }

    return metadata;
  }

  /**
   * Write metadata to file
   */
  async writeMetadata(metadata: SessionMetadata): Promise<void> {
    await fs.ensureDir(this.sessionDir);
    
    const lines: string[] = [];
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        lines.push(`${key}=${value}`);
      }
    }

    await fs.writeFile(this.getMetadataPath(), lines.join('\n') + '\n', 'utf-8');
  }

  /**
   * Update a single metadata key
   */
  async set(key: string, value: string): Promise<void> {
    const metadata = await this.readMetadata();
    metadata[key] = value;
    await this.writeMetadata(metadata);
  }

  /**
   * Get a metadata value
   */
  async get(key: string): Promise<string | undefined> {
    const metadata = await this.readMetadata();
    return metadata[key];
  }

  /**
   * Handle gh pr create command - update pr and status
   */
  async onPRCreated(prUrl: string): Promise<void> {
    await this.set('pr', prUrl);
    await this.set('status', 'pr_open');
    console.log(`[MetadataHooks] Updated metadata: pr=${prUrl}, status=pr_open`);
  }

  /**
   * Handle git checkout/switch -b command - update branch
   */
  async onBranchCreated(branchName: string): Promise<void> {
    await this.set('branch', branchName);
    console.log(`[MetadataHooks] Updated metadata: branch=${branchName}`);
  }

  /**
   * Handle gh pr merge command - update status to merged
   */
  async onPRMerged(): Promise<void> {
    await this.set('status', 'merged');
    console.log(`[MetadataHooks] Updated metadata: status=merged`);
  }

  /**
   * Handle gh pr close command - update status
   */
  async onPRClosed(): Promise<void> {
    await this.set('status', 'closed');
    console.log(`[MetadataHooks] Updated metadata: status=closed`);
  }

  /**
   * Parse command output to detect relevant events
   * This is called after tool execution to check if we need to update metadata
   */
  async parseCommandOutput(command: string, output: string): Promise<void> {
    const lowerCommand = command.toLowerCase();
    const lowerOutput = output.toLowerCase();

    // Detect gh pr create
    if (lowerCommand.includes('gh pr create') || lowerCommand.includes('git push')) {
      // Try to extract PR URL from output
      const prUrlMatch = output.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/);
      if (prUrlMatch) {
        await this.onPRCreated(prUrlMatch[0]);
      }
    }

    // Detect git checkout/switch -b
    if ((lowerCommand.includes('checkout -b') || lowerCommand.includes('switch -c')) && lowerOutput.includes('branch')) {
      const branchMatch = output.match(/(?:Switched|Created)\s+(?:branch|new branch)\s+['"]?([^'"\s]+)['"]?/i);
      if (branchMatch) {
        await this.onBranchCreated(branchMatch[1]);
      }
    }

    // Detect gh pr merge
    if (lowerCommand.includes('gh pr merge')) {
      if (lowerOutput.includes('merged')) {
        await this.onPRMerged();
      } else if (lowerOutput.includes('closed')) {
        await this.onPRClosed();
      }
    }
  }

  /**
   * Create initial metadata for a new session
   */
  async initializeSession(project: string, worktreePath: string, tmuxName?: string): Promise<void> {
    const metadata: SessionMetadata = {
      project,
      status: 'spawning',
      createdAt: new Date().toISOString(),
    };

    if (worktreePath) {
      metadata.worktree = worktreePath;
    }

    if (tmuxName) {
      metadata.tmuxName = tmuxName;
    }

    await this.writeMetadata(metadata);
    console.log(`[MetadataHooks] Initialized session metadata:`, metadata);
  }

  /**
   * Archive session metadata (for completed sessions)
   */
  async archive(): Promise<void> {
    const metadataPath = this.getMetadataPath();
    const archivePath = metadataPath.replace('/sessions/', '/archive/');
    
    if (await fs.pathExists(metadataPath)) {
      await fs.ensureDir(path.dirname(archivePath));
      await fs.move(metadataPath, archivePath);
      console.log(`[MetadataHooks] Archived session metadata to ${archivePath}`);
    }
  }
}

/**
 * Create MetadataHooks for a session
 */
export function createMetadataHooks(sessionDir: string): MetadataHooks {
  return new MetadataHooks(sessionDir);
}
