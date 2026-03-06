import fs from 'fs-extra';
import path from 'path';

export class VirtualMemoryFileSystem {
  private baseDir: string;

  constructor(projectPath: string) {
    this.baseDir = path.join(projectPath, '.queenbee', 'skills');
  }

  async saveSkill(name: string, content: string): Promise<void> {
    await fs.ensureDir(this.baseDir);
    await fs.writeFile(path.join(this.baseDir, `${name}.skill`), content);
  }

  async loadSkill(name: string): Promise<string | null> {
    const filePath = path.join(this.baseDir, `${name}.skill`);
    if (await fs.pathExists(filePath)) {
      return await fs.readFile(filePath, 'utf-8');
    }
    return null;
  }
}
