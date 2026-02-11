import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { broadcast } from './socket-instance';

export interface TeamMessage {
  id: string;
  agentId: string;
  role: string;
  content: string;
  timestamp: string;
  threadId?: string;
  taskId?: string;
  targetAgentId?: string;
  swarmId?: string;
}

/**
 * Roundtable: The shared communication channel for the agent swarm.
 * Enables cross-agent interaction and guidance.
 */
export class Roundtable {
  private projectPath: string;
  private chatPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    const configDir = Paths.getProjectConfigDir(projectPath);
    this.chatPath = path.join(configDir, 'team_chat.jsonl');
    fs.ensureDirSync(configDir);
  }

  /**
   * Post a message to the shared team channel
   */
  async postMessage(agentId: string, role: string, content: string, metadata: { threadId?: string; taskId?: string; targetAgentId?: string; swarmId?: string } = {}) {
    const message: TeamMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      agentId,
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    await fs.appendFile(this.chatPath, JSON.stringify(message) + '\n');
    
    // Notify UI and other active listeners
    broadcast('TEAM_CHAT_MESSAGE', message);
    
    return message;
  }

  /**
   * Get recent messages from the channel for context injection
   */
  async getRecentMessages(limit = 10, swarmId?: string): Promise<TeamMessage[]> {
    if (!(await fs.pathExists(this.chatPath))) return [];
    
    const content = await fs.readFile(this.chatPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    let messages = lines.map(line => JSON.parse(line) as TeamMessage);
    
    if (swarmId) {
      messages = messages.filter(m => m.swarmId === swarmId);
    }
    
    return messages.slice(-limit);
  }

  /**
   * Format messages for inclusion in an agent's system prompt
   */
  async getFormattedContext(limit = 5, swarmId?: string): Promise<string> {
    const messages = await this.getRecentMessages(limit, swarmId);
    if (messages.length === 0) return "No team coordination messages yet.";

    return messages
      .map(m => `[${m.timestamp}] ${m.agentId} (${m.role}): ${m.content}`)
      .join('\n');
  }

  /**
   * Clear all messages for a specific swarm
   */
  async clearBySwarmId(swarmId: string): Promise<number> {
    if (!(await fs.pathExists(this.chatPath))) return 0;

    const content = await fs.readFile(this.chatPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const messages = lines.map(line => JSON.parse(line) as TeamMessage);
    const remaining = messages.filter(m => m.swarmId !== swarmId);
    const removed = messages.length - remaining.length;

    await fs.writeFile(
      this.chatPath,
      remaining.map(m => JSON.stringify(m)).join('\n') + (remaining.length ? '\n' : '')
    );

    return removed;
  }
}
