import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

/**
 * TerminalSessionManager: Ensures terminal panes persist their state and history.
 */
export class TerminalSessionManager {
  private historyDir = path.join(Paths.getDataDir(), 'terminal_history');

  constructor() {
    fs.ensureDirSync(this.historyDir);
  }

  async saveSession(threadId: string, history: string) {
    const filePath = path.join(this.historyDir, `${threadId}.log`);
    await fs.writeFile(filePath, history);
  }

  async loadSession(threadId: string) {
    const filePath = path.join(this.historyDir, `${threadId}.log`);
    if (await fs.pathExists(filePath)) {
      return await fs.readFile(filePath, 'utf-8');
    }
    return '';
  }
}
