import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * RepoContextAggregator: Packs entire repositories into a structured text context.
 * This is used to feed a model the full history/structure of a project.
 */
export class RepoContextAggregator {
  private ignoreList = ['node_modules', '.git', 'dist', 'build', '.next', 'package-lock.json', '.DS_Store'];

  async aggregate(repoPath: string, maxFiles: number = 100): Promise<string> {
    console.log(`[Context] Aggregating repository at ${repoPath}`);
    let packedContext = `REPOSITORY_CONTEXT: ${path.basename(repoPath)}\n\n`;
    
    // 1. Map the structure
    try {
      const tree = execSync(`tree -L 2 -I "${this.ignoreList.join('|')}"`, { cwd: repoPath }).toString();
      packedContext += `STRUCTURE:\n${tree}\n\n`;
    } catch (e) {
      packedContext += "Structure mapping failed.\n\n";
    }

    // 2. Read essential files (limited to keep token count sane but useful)
    const files = await this.walk(repoPath);
    let processed = 0;

    for (const file of files) {
      if (processed >= maxFiles) break;
      const relativePath = path.relative(repoPath, file);
      
      const content = await fs.readFile(file, 'utf-8');
      packedContext += `--- FILE: ${relativePath} ---\n${content}\n\n`;
      processed++;
    }

    return packedContext;
  }

  private async walk(dir: string): Promise<string[]> {
    let files: string[] = [];
    const list = await fs.readdir(dir);
    for (const item of list) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory() && !this.ignoreList.includes(item)) {
        files = files.concat(await this.walk(fullPath));
      } else if (stat.isFile() && this.isTextFile(item)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  private isTextFile(filename: string): boolean {
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.swift', '.py', '.md', '.json', '.yaml', '.h', '.m', '.cpp'];
    return exts.some(ext => filename.endsWith(ext));
  }
}
