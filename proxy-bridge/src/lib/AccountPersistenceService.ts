import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

/**
 * AccountPersistenceService: Handles sync between local state and server storage.
 */
export class AccountPersistenceService {
  private userStatesDir: string;

  constructor() {
    this.userStatesDir = Paths.getUserStatesDir();
    fs.ensureDirSync(this.userStatesDir);
  }

  async saveState(userId: string, state: any) {
    const filePath = path.join(this.userStatesDir, `${userId}.json`);
    await fs.writeJson(filePath, state, { spaces: 2 });
    console.log(`[Persistence] Saved state for user: ${userId}`);
  }

  async loadState(userId: string): Promise<any> {
    const filePath = path.join(this.userStatesDir, `${userId}.json`);
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return null;
  }

  async listUsers(): Promise<string[]> {
    const files = await fs.readdir(this.userStatesDir);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  }
}

export const accountPersistenceService = new AccountPersistenceService();