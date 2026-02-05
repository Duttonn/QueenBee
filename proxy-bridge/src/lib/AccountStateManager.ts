import fs from 'fs-extra';
import path from 'path';

/**
 * AccountStateManager: Handles saving and loading Hive states per user.
 */
export class AccountStateManager {
  private baseDir = '/home/fish/.codex/user_states';

  constructor() {
    fs.ensureDirSync(this.baseDir);
  }

  async saveState(userId: string, state: any) {
    const filePath = path.join(this.baseDir, `${userId}.json`);
    console.log(`[Persistence] Saving cloud state for user: ${userId}`);
    await fs.writeJson(filePath, state, { spaces: 2 });
  }

  async loadState(userId: string) {
    const filePath = path.join(this.baseDir, `${userId}.json`);
    if (await fs.pathExists(filePath)) {
      console.log(`[Persistence] Hydrating cloud state for user: ${userId}`);
      return await fs.readJson(filePath);
    }
    return null; // New user, empty state
  }
}
