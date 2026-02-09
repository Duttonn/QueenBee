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
    if (!await fs.pathExists(this.inboxPath)) {
      // Seed with mock data if empty
      const mockData = [
        {
          id: 'mock-1',
          agentId: 'SecurityBee',
          title: 'Potential Secrets Detected',
          content: 'Found exposed .env patterns in /dashboard/src/hooks. Recommend rotating keys.',
          status: 'unread',
          timestamp: new Date().toISOString()
        },
        {
          id: 'mock-2',
          agentId: 'PerformanceAgent',
          title: 'Redundant Re-renders',
          content: 'CodexLayout is re-rendering 12 times on mount. memo() recommended for Sidebar components.',
          status: 'unread',
          timestamp: new Date().toISOString()
        },
        {
          id: 'mock-3',
          agentId: 'ArchitectBee',
          title: 'Circular Dependency Found',
          content: 'Circular import detected between useHiveStore.ts and api.ts. Refactor suggested.',
          status: 'unread',
          timestamp: new Date().toISOString()
        }
      ];
      return mockData;
    }
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