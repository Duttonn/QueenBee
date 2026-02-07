import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

/**
 * InboxManager: Triage system for autonomous agent findings.
 */
export class InboxManager {
  private inboxPath: string;

  constructor() {
    this.inboxPath = path.join(Paths.getDataDir(), 'inbox.json');
  }

  async addFinding(agentId: string, title: string, content: string) {
    const findings = await this.getFindings();
    findings.push({
      id: Date.now().toString(),
      agentId,
      title,
      content,
      status: 'unread',
      timestamp: new Date().toISOString()
    });
    await fs.ensureDir(path.dirname(this.inboxPath));
    await fs.writeJson(this.inboxPath, findings, { spaces: 2 });
  }

  async getFindings() {
    if (!await fs.pathExists(this.inboxPath)) return [];
    return await fs.readJson(this.inboxPath);
  }

  async updateStatus(id: string, status: 'unread' | 'archived') {
    const findings = await this.getFindings();
    const finding = findings.find((f: any) => f.id === id);
    if (finding) {
      finding.status = status;
      await fs.writeJson(this.inboxPath, findings, { spaces: 2 });
    }
  }
}

export const inboxManager = new InboxManager();