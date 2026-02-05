import fs from 'fs-extra';
import path from 'path';

/**
 * CloudFSManager: Jailed filesystem for Cloud Workspaces.
 * Prevents directory traversal and ensures agents only touch their workspace.
 */
export class CloudFSManager {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = path.resolve(workspacePath);
  }

  private resolvePath(relativePath: string): string {
    const absolutePath = path.resolve(this.workspacePath, relativePath);
    if (!absolutePath.startsWith(this.workspacePath)) {
      throw new Error(`Security Violation: Path ${relativePath} is outside of workspace.`);
    }
    return absolutePath;
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
  }

  async listDir(dirPath: string): Promise<string[]> {
    const fullPath = this.resolvePath(dirPath);
    return fs.readdir(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);
    return fs.pathExists(fullPath);
  }
}
