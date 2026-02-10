import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { v4 as uuidv4 } from 'uuid';

export interface AgentEvent {
  id: string;
  timestamp: string;
  type: string;
  agentId: string;
  data: any;
}

export interface EventFilters {
  type?: string;
  agentId?: string;
  startTime?: string;
  endTime?: string;
}

export class EventLog {
  private configDir: string;
  private filePath: string;

  constructor(projectPath: string) {
    this.configDir = Paths.getProjectConfigDir(projectPath);
    this.filePath = path.join(this.configDir, 'events.jsonl');
  }

  private async ensureInitialized(): Promise<void> {
    await fs.ensureDir(this.configDir);
    if (!(await fs.pathExists(this.filePath))) {
      await fs.ensureFile(this.filePath);
    }
  }

  async emit(type: string, agentId: string, data: any): Promise<AgentEvent> {
    await this.ensureInitialized();
    const event: AgentEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      agentId,
      data,
    };

    await fs.appendFile(this.filePath, JSON.stringify(event) + '\n', 'utf-8');
    return event;
  }

  async query(filters: EventFilters = {}): Promise<AgentEvent[]> {
    await this.ensureInitialized();
    const content = await fs.readFile(this.filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    let events = lines.map(line => JSON.parse(line) as AgentEvent);

    if (filters.type) {
      events = events.filter(e => e.type === filters.type);
    }
    if (filters.agentId) {
      events = events.filter(e => e.agentId === filters.agentId);
    }
    if (filters.startTime) {
      const start = new Date(filters.startTime).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() >= start);
    }
    if (filters.endTime) {
      const end = new Date(filters.endTime).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() <= end);
    }

    return events;
  }
}