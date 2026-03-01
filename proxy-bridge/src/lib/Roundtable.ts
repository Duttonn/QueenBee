import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { broadcast } from './socket-instance';
import { aggregateScores } from './consensus';
import { TopologyManager } from './TopologyManager';

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
 * Enhanced with topology-aware message routing.
 */
export class Roundtable {
  private projectPath: string;
  private chatPath: string;
  /** Optional topology manager for structured communication */
  private topology: TopologyManager | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    const configDir = Paths.getProjectConfigDir(projectPath);
    this.chatPath = path.join(configDir, 'team_chat.jsonl');
    fs.ensureDirSync(configDir);
  }

  /**
   * Attach a topology manager to enable structured communication routing.
   * When set, messages are filtered to only reach topologically-connected agents.
   */
  setTopology(topology: TopologyManager): void {
    this.topology = topology;
  }

  getTopology(): TopologyManager | null {
    return this.topology;
  }

  /**
   * Post a message to the shared team channel.
   * If topology is set and type != flat, the broadcast event includes
   * reachability info so the frontend can render routing.
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

    // Build reachability info for topology-aware routing
    let reachableAgents: string[] | undefined;
    if (this.topology && this.topology.getType() !== 'flat') {
      reachableAgents = this.topology.getReachableAgents(agentId);
    }

    // Notify UI and other active listeners
    broadcast('TEAM_CHAT_MESSAGE', {
      ...message,
      ...(reachableAgents ? { reachableAgents } : {}),
    });

    return message;
  }

  /**
   * Get recent messages from the channel for context injection.
   * If topology is set, filters to only messages from topologically-reachable agents.
   */
  async getRecentMessages(limit = 10, swarmId?: string, forAgentId?: string): Promise<TeamMessage[]> {
    if (!(await fs.pathExists(this.chatPath))) return [];

    const content = await fs.readFile(this.chatPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let messages = lines.map(line => JSON.parse(line) as TeamMessage);

    if (swarmId) {
      // Include messages for this swarm OR messages with no swarmId (global broadcasts)
      messages = messages.filter(m => m.swarmId === swarmId || !m.swarmId);
    }

    // Topology-aware filtering: only show messages from reachable agents
    if (forAgentId && this.topology && this.topology.getType() !== 'flat') {
      const reachable = new Set(this.topology.getReachableAgents(forAgentId));
      reachable.add(forAgentId); // Agent can see its own messages
      // Always allow SYSTEM messages through
      messages = messages.filter(m => reachable.has(m.agentId) || m.agentId === 'SYSTEM');
    }

    return messages.slice(-limit);
  }

  /**
   * Format messages for inclusion in an agent's system prompt.
   * Topology-aware: only shows messages from connected agents.
   */
  async getFormattedContext(limit = 5, swarmId?: string, forAgentId?: string): Promise<string> {
    const messages = await this.getRecentMessages(limit, swarmId, forAgentId);
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

  /**
   * P17-02: Extract numeric scores from roundtable messages and aggregate them
   * using geometric median (Byzantine-robust) instead of a plain mean.
   *
   * Messages that contain a numeric score are expected to embed it as
   * "confidence: <number>" (e.g. from ProposalService.judge broadcast) or as
   * a bare number anywhere in the message content.  Both patterns are extracted
   * and fed into aggregateScores() which runs Weiszfeld's algorithm (consensus.ts).
   *
   * @param threadId - optional thread to narrow the message search
   * @param taskId   - optional task to narrow the message search
   * @param limit    - how many recent messages to scan (default 50)
   * @returns aggregated score via geometric median, or null if no scores found
   */
  async getConsensusScore(threadId?: string, taskId?: string, limit = 50): Promise<number | null> {
    const messages = await this.getRecentMessages(limit);

    // Narrow to thread/task if provided
    const candidates = messages.filter(m => {
      if (threadId && m.threadId !== threadId) return false;
      if (taskId && m.taskId !== taskId) return false;
      return true;
    });

    const scores: number[] = [];

    for (const m of candidates) {
      // Pattern 1: "confidence: <number>/100" or "confidence: <number>"
      const confidenceMatch = m.content.match(/confidence[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i);
      if (confidenceMatch) {
        const val = parseFloat(confidenceMatch[1]);
        if (isFinite(val) && val >= 0 && val <= 100) {
          scores.push(val);
          continue;
        }
      }

      // Pattern 2: "score: <number>" or "score=<number>"
      const scoreMatch = m.content.match(/score[=:\s]+(\d+(?:\.\d+)?)/i);
      if (scoreMatch) {
        const val = parseFloat(scoreMatch[1]);
        if (isFinite(val) && val >= 0 && val <= 100) {
          scores.push(val);
          continue;
        }
      }
    }

    if (scores.length === 0) return null;

    // Use geometric median (Weiszfeld) — Byzantine-robust aggregation (P17-02).
    return aggregateScores(scores);
  }
}
