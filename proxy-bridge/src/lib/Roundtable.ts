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
  async postMessage(agentId: string, role: string, content: string, metadata: { threadId?: string; taskId?: string } = {}) {
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
  async getRecentMessages(limit = 10): Promise<TeamMessage[]> {
    if (!(await fs.pathExists(this.chatPath))) return [];
    
    const content = await fs.readFile(this.chatPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    return lines
      .slice(-limit)
      .map(line => JSON.parse(line) as TeamMessage);
  }

  /**
   * Format messages for inclusion in an agent's system prompt
   */
  async getFormattedContext(limit = 5): Promise<string> {
    const messages = await this.getRecentMessages(limit);
    if (messages.length === 0) return "No team coordination messages yet.";

    return messages
      .map(m => `[${m.timestamp}] ${m.agentId} (${m.role}): ${m.content}`)
      .join('\n');
  }
}
