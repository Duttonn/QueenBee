import fs from 'fs-extra';

/**
 * InboxManager: Triage system for autonomous agent findings.
 */
export class InboxManager {
      import path from 'path';
    private inboxPath = path.join(process.cwd(), '../data/inbox.json');

  async addFinding(agentId: string, title: string, content: string) {
    const findings = await this.getFindings();
    findings.push({
      id: Date.now(),
      agentId,
      title,
      content,
      status: 'unread',
      timestamp: new Date().toISOString()
    });
    await fs.writeJson(this.inboxPath, findings, { spaces: 2 });
  }

  async getFindings() {
    if (!fs.existsSync(this.inboxPath)) return [];
    return await fs.readJson(this.inboxPath);
  }
}
