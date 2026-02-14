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

  /**
   * SI-05: Confidence-Based Memory Decay
   * Reduce confidence when a memory leads to task failure
   * @param memoryIds - IDs of memories involved in the failed task
   * @param decayRate - Percentage to decay (default 0.2 = 20%)
   */
  async decayConfidence(memoryIds: string[], decayRate: number = 0.2): Promise<void> {
    const memories = await this.getAll();
    let pruned = false;
    
    for (const mem of memories) {
      if (memoryIds.includes(mem.id)) {
        mem.confidence *= (1 - decayRate);
        console.log(`[MemoryStore] Decayed memory ${mem.id} to ${mem.confidence.toFixed(2)}`);
        
        // Auto-prune if below threshold
        if (mem.confidence < 0.3) {
          console.log(`[MemoryStore] Pruning memory ${mem.id} - confidence below threshold`);
          pruned = true;
        }
      }
    }
    
    if (pruned) {
      const filtered = memories.filter(m => m.confidence >= 0.3);
      await fs.writeJson(this.filePath, filtered, { spaces: 2 });
    } else {
      await fs.writeJson(this.filePath, memories, { spaces: 2 });
    }
  }

  /**
   * SI-05: Reinforce confidence when memory leads to success
   * @param memoryIds - IDs of memories involved in the successful task
   * @param boostRate - Percentage to boost (default 0.1 = 10%)
   */
  async reinforceConfidence(memoryIds: string[], boostRate: number = 0.1): Promise<void> {
    const memories = await this.getAll();
    
    for (const mem of memories) {
      if (memoryIds.includes(mem.id)) {
        mem.confidence = Math.min(1.0, mem.confidence * (1 + boostRate));
        console.log(`[MemoryStore] Reinforced memory ${mem.id} to ${mem.confidence.toFixed(2)}`);
      }
    }
    
    await fs.writeJson(this.filePath, memories, { spaces: 2 });
  }

  /**
   * SI-05: Auto-prune memories below confidence threshold
   */
  async autoPruneLowConfidence(threshold: number = 0.3): Promise<number> {
    const memories = await this.getAll();
    const before = memories.length;
    const filtered = memories.filter(m => m.confidence >= threshold);
    const removed = before - filtered.length;
    
    if (removed > 0) {
      console.log(`[MemoryStore] Auto-pruned ${removed} low-confidence memories`);
      await fs.writeJson(this.filePath, filtered, { spaces: 2 });
    }
    
    return removed;
  }
}
