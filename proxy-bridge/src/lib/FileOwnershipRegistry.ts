import { EventEmitter } from 'events';
import { broadcast } from './socket-instance';
import path from 'path';

export interface FileOwnership {
  lastWriter: string;
  timestamp: number;
}

export class FileOwnershipRegistry extends EventEmitter {
  private ownershipMap: Map<string, FileOwnership> = new Map();

  constructor() {
    super();
  }

  /**
   * Tracks that an agent has written to a file.
   * Returns the previous owner if a conflict is detected.
   */
  recordWrite(filePath: string, agentId: string): string | null {
    const normalizedPath = path.normalize(filePath);
    const existing = this.ownershipMap.get(normalizedPath);
    
    const previousOwner = (existing && existing.lastWriter !== agentId) ? existing.lastWriter : null;
    
    this.ownershipMap.set(normalizedPath, {
      lastWriter: agentId,
      timestamp: Date.now()
    });

    if (previousOwner) {
      console.warn(`[FileOwnership] Conflict detected on ${normalizedPath}: ${agentId} is overwriting ${previousOwner}'s changes.`);
    }

    return previousOwner;
  }

  getOwnership(filePath: string): FileOwnership | undefined {
    return this.ownershipMap.get(path.normalize(filePath));
  }

  getAllOwnerships(): Record<string, FileOwnership> {
    return Object.fromEntries(this.ownershipMap);
  }
}

// Export a singleton for use across the bridge
export const fileOwnershipRegistry = new FileOwnershipRegistry();