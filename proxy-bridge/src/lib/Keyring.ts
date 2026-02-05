import fs from 'fs-extra';
import path from 'path';

export class MultiAccountKeyring {
  private storagePath = '/home/fish/.codex/auth.json';

  async getCredentials(provider: string, accountId: string) {
    if (!fs.existsSync(this.storagePath)) return null;
    const data = await fs.readJson(this.storagePath);
    return data.profiles?.find((p: any) => p.provider === provider && p.id === accountId);
  }

  async saveCredentials(profile: any) {
    await fs.ensureDir(path.dirname(this.storagePath));
    let data = { profiles: [] };
    if (fs.existsSync(this.storagePath)) {
      data = await fs.readJson(this.storagePath);
    }
    (data.profiles as any[]).push(profile);
    await fs.writeJson(this.storagePath, data, { spaces: 2 });
  }
}
