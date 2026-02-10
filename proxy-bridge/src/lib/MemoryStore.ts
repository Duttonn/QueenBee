import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { v4 as uuidv4 } from 'uuid';

export type MemoryType = 'insight' | 'pattern' | 'lesson' | 'preference' | 'style';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  confidence: number;
  created_at: string;
}

export class MemoryStore {
  private configDir: string;
  private filePath: string;

  constructor(projectPath: string) {
    this.configDir = Paths.getProjectConfigDir(projectPath);
    this.filePath = path.join(this.configDir, 'memory.json');
  }

  private async ensureInitialized(): Promise<void> {
    await fs.ensureDir(this.configDir);
    if (!(await fs.pathExists(this.filePath))) {
      await fs.writeJson(this.filePath, [], { spaces: 2 });
    }
  }

  async getAll(): Promise<MemoryEntry[]> {
    await this.ensureInitialized();
    return await fs.readJson(this.filePath);
  }

  async add(type: MemoryType, content: string, confidence: number = 1.0): Promise<MemoryEntry> {
    const memories = await this.getAll();
    const entry: MemoryEntry = {
      id: uuidv4(),
      type,
      content,
      confidence,
      created_at: new Date().toISOString(),
    };
    memories.push(entry);
    await fs.writeJson(this.filePath, memories, { spaces: 2 });
    return entry;
  }

  async search(query: string): Promise<MemoryEntry[]> {
    const memories = await this.getAll();
    const lowQuery = query.toLowerCase();
    return memories.filter(m => 
      m.content.toLowerCase().includes(lowQuery) || 
      m.type.toLowerCase().includes(lowQuery)
    );
  }

  async prune(minConfidence: number = 0.5): Promise<void> {
    const memories = await this.getAll();
    const filtered = memories.filter(m => m.confidence >= minConfidence);
    await fs.writeJson(this.filePath, filtered, { spaces: 2 });
  }
}
