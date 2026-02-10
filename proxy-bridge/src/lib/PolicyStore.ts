import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

export interface Policies {
  heartbeat_interval: number;
  max_parallel_agents: number;
  [key: string]: any;
}

const DEFAULT_POLICIES: Policies = {
  heartbeat_interval: 300000,
  max_parallel_agents: 4,
  stale_task_timeout_minutes: 30,
};

export class PolicyStore {
  private configDir: string;
  private filePath: string;

  constructor(projectPath: string) {
    this.configDir = Paths.getProjectConfigDir(projectPath);
    this.filePath = path.join(this.configDir, 'policies.json');
  }

  private async ensureInitialized(): Promise<void> {
    await fs.ensureDir(this.configDir);
    if (!(await fs.pathExists(this.filePath))) {
      await fs.writeJson(this.filePath, DEFAULT_POLICIES, { spaces: 2 });
    }
  }

  async getAll(): Promise<Policies> {
    await this.ensureInitialized();
    return await fs.readJson(this.filePath);
  }

  async get(key: keyof Policies): Promise<any> {
    const policies = await this.getAll();
    return policies[key];
  }

  async set(key: string, value: any): Promise<void> {
    const policies = await this.getAll();
    policies[key] = value;
    await fs.writeJson(this.filePath, policies, { spaces: 2 });
  }
}
