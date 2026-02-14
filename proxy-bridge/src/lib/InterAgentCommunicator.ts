import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Roundtable, TeamMessage } from './Roundtable';
import { MemoryStore, MemoryEntry } from './MemoryStore';
import { broadcast } from './socket-instance';

export type DialogueAct = 
  | 'REQUEST'      // Asking for information/action
  | 'PROVIDE'      // Providing information
  | 'QUESTION'     // Asking clarification
  | 'AGREE'        // Agreeing with proposal
  | 'DISAGREE'     // Disagreeing with proposal
  | 'ACKNOWLEDGE'  // Acknowledging receipt
  | 'SUMMARIZE'    // Summarizing for another agent
  | 'COORDINATE';  // Coordinating action

export interface InterAgentPrompt {
  id: string;
  fromAgentId: string;
  toAgentId: string; // Can be 'all' for broadcast
  act: DialogueAct;
  content: string;
  context?: string; // Relevant file/memory context
  requiresResponse: boolean;
  responseTo?: string; // ID of prompt being responded to
  timestamp: string;
  status: 'pending' | 'responded' | 'acknowledged';
  response?: string;
}

export interface AgentMemoryShare {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  memories: MemoryEntry[]; // Shared memories
  reason: string; // Why these memories are relevant
  timestamp: string;
}

/**
 * InterAgentCommunicator - Real Bidirectional Dialogue Between Agents
 * 
 * Enables agents to:
 * - Explicitly prompt each other with specific questions
 * - Share relevant memories contextually
 * - Wait for and track responses
 * - Coordinate through structured dialogue acts
 */
export class InterAgentCommunicator {
  private projectPath: string;
  private promptsDir: string;
  private memorySharesDir: string;
  private roundtable: Roundtable;
  private memoryStore: MemoryStore;
  private activePrompts: Map<string, InterAgentPrompt> = new Map();
  private pendingResponses: Map<string, string[]> = new Map(); // promptId -> agentIds waiting

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.promptsDir = path.join(projectPath, '.queenbee', 'agent-prompts');
    this.memorySharesDir = path.join(projectPath, '.queenbee', 'memory-shares');
    this.roundtable = new Roundtable(projectPath);
    this.memoryStore = new MemoryStore(projectPath);
  }

  /**
   * Send a directed prompt to another agent (or broadcast to all)
   * This creates a structured dialogue turn
   */
  async prompt(
    fromAgentId: string,
    toAgentId: string,
    act: DialogueAct,
    content: string,
    options: {
      context?: string;
      requiresResponse?: boolean;
      responseTo?: string;
    } = {}
  ): Promise<InterAgentPrompt> {
    const prompt: InterAgentPrompt = {
      id: `prompt-${uuidv4().slice(0, 8)}`,
      fromAgentId,
      toAgentId,
      act,
      content,
      context: options.context,
      requiresResponse: options.requiresResponse ?? (act !== 'PROVIDE' && act !== 'ACKNOWLEDGE'),
      responseTo: options.responseTo,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    // Save prompt to file
    await this.savePrompt(prompt);

    // Track pending responses if required
    if (prompt.requiresResponse) {
      const pending = this.pendingResponses.get(prompt.id) || [];
      pending.push(toAgentId);
      this.pendingResponses.set(prompt.id, pending);
    }

    // Post to roundtable for visibility
    const tag = this.getActTag(act);
    await this.roundtable.postMessage(
      fromAgentId,
      act,
      `${tag} ${toAgentId === 'all' ? 'to ALL' : 'to ' + toAgentId}: ${content}`,
      { targetAgentId: toAgentId }
    );

    // Broadcast prompt event for real-time UI
    broadcast('AGENT_PROMPT', prompt);

    console.log(`[InterAgent] ${fromAgentId} ${act.toLowerCase()}s ${toAgentId}: ${content.substring(0, 50)}...`);

    return prompt;
  }

  /**
   * Respond to a prompt from another agent
   */
  async respond(
    agentId: string,
    promptId: string,
    response: string
  ): Promise<InterAgentPrompt | null> {
    const prompt = await this.getPrompt(promptId);
    if (!prompt) {
      console.warn(`[InterAgent] Prompt not found: ${promptId}`);
      return null;
    }

    // Update prompt with response
    prompt.status = 'responded';
    prompt.response = response;
    await this.savePrompt(prompt);

    // Post response to roundtable
    await this.roundtable.postMessage(
      agentId,
      'RESPONSE',
      `📝 Responded to ${prompt.fromAgentId}: ${response}`,
      { targetAgentId: prompt.fromAgentId }
    );

    // Broadcast response event
    broadcast('AGENT_PROMPT_RESPONSE', { promptId, response, agentId });

    console.log(`[InterAgent] ${agentId} responded to ${prompt.fromAgentId}'s prompt`);

    return prompt;
  }

  /**
   * Share relevant memories with another agent
   */
  async shareMemories(
    fromAgentId: string,
    toAgentId: string,
    query: string, // What context is needed
    reason: string // Why this is relevant
  ): Promise<AgentMemoryShare> {
    // Search memories relevant to the query
    const relevantMemories = await this.findRelevantMemories(query);

    const share: AgentMemoryShare = {
      id: `share-${uuidv4().slice(0, 8)}`,
      fromAgentId,
      toAgentId,
      memories: relevantMemories,
      reason,
      timestamp: new Date().toISOString(),
    };

    // Save share
    await this.saveMemoryShare(share);

    // Post to roundtable
    const memoryCount = relevantMemories.length;
    await this.roundtable.postMessage(
      fromAgentId,
      'MEMORY_SHARE',
      `🧠 Shared ${memoryCount} relevant memory(ies) with ${toAgentId}: ${reason}`,
      { targetAgentId: toAgentId }
    );

    // Broadcast share event
    broadcast('AGENT_MEMORY_SHARE', share);

    console.log(`[InterAgent] ${fromAgentId} shared ${memoryCount} memories with ${toAgentId}`);

    return share;
  }

  /**
   * Find memories relevant to a query
   */
  private async findRelevantMemories(query: string): Promise<MemoryEntry[]> {
    try {
      const allMemories = await this.memoryStore.getAll();
      
      // Simple keyword matching (could be enhanced with embeddings)
      const queryTerms = query.toLowerCase().split(/\s+/);
      
      return allMemories.filter(memory => {
        const content = (memory.content || '').toLowerCase();
        const type = (memory.type || '').toLowerCase();
        return queryTerms.some(term => 
          content.includes(term) || type.includes(term) || term.includes(type)
        );
      }).slice(0, 5); // Limit to 5 most relevant
    } catch (error) {
      console.error('[InterAgent] Error finding memories:', error);
      return [];
    }
  }

  /**
   * Get pending prompts for an agent
   */
  async getPendingPrompts(agentId: string): Promise<InterAgentPrompt[]> {
    const prompts = await this.loadAllPrompts();
    return prompts.filter(p => 
      (p.toAgentId === agentId || p.toAgentId === 'all') && 
      p.status === 'pending'
    );
  }

  /**
   * Get prompts that an agent sent and is waiting for responses
   */
  async getWaitingFor(agentId: string): Promise<InterAgentPrompt[]> {
    const prompts = await this.loadAllPrompts();
    return prompts.filter(p => 
      p.fromAgentId === agentId && 
      p.requiresResponse && 
      p.status === 'pending'
    );
  }

  /**
   * Generate a dialogue prompt for an agent based on context
   */
  generateDialoguePrompt(
    prompt: InterAgentPrompt,
    sharedMemories?: MemoryEntry[]
  ): string {
    let contextSection = '';
    
    if (prompt.context) {
      contextSection = `\n### Relevant Context:\n${prompt.context}`;
    }
    
    if (sharedMemories && sharedMemories.length > 0) {
      const memorySummary = sharedMemories.map(m => 
        `- [${m.type}] ${m.content.substring(0, 200)}...`
      ).join('\n');
      contextSection += `\n### Shared Team Memory:\n${memorySummary}`;
    }

    return `### 📬 Incoming ${prompt.act} from ${prompt.fromAgentId}

${prompt.content}${contextSection}

${
  prompt.requiresResponse 
    ? `⚠️ This message REQUIRES your response. Please reply via the communication system.`
    : `💡 No response required, but acknowledgment is appreciated.`
}

Respond appropriately:
- If ${prompt.act === 'QUESTION' || prompt.act === 'REQUEST'}: Answer or fulfill the request
- If ${prompt.act === 'DISAGREE'}: Explain your reasoning
- If ${prompt.act === 'COORDINATE'}: Acknowledge and coordinate`;
  }

  /**
   * Create a structured dialogue chain between agents
   */
  async createDialogueChain(
    initiatorId: string,
    participants: string[],
    topic: string,
    initialPrompt: string
  ): Promise<InterAgentPrompt> {
    // Start with the first prompt to the first participant
    const firstPrompt = await this.prompt(
      initiatorId,
      participants[0],
      'REQUEST',
      initialPrompt,
      { requiresResponse: true }
    );

    // Notify other participants about the dialogue chain
    for (let i = 1; i < participants.length; i++) {
      await this.prompt(
        initiatorId,
        participants[i],
        'COORDINATE',
        `A dialogue chain has been started about: "${topic}". You may be asked to contribute.`,
        { requiresResponse: false }
      );
    }

    return firstPrompt;
  }

  /**
   * Check if agent has unanswered prompts (for coordination)
   */
  async hasUnansweredPrompts(agentId: string): Promise<boolean> {
    const pending = await this.getPendingPrompts(agentId);
    return pending.length > 0;
  }

  // Helper methods

  private getActTag(act: DialogueAct): string {
    const tags: Record<DialogueAct, string> = {
      'REQUEST': '🔔',
      'PROVIDE': '📤',
      'QUESTION': '❓',
      'AGREE': '✅',
      'DISAGREE': '❌',
      'ACKNOWLEDGE': '👋',
      'SUMMARIZE': '📝',
      'COORDINATE': '🎯',
    };
    return tags[act];
  }

  private async savePrompt(prompt: InterAgentPrompt): Promise<void> {
    await fs.ensureDir(this.promptsDir);
    const filepath = path.join(this.promptsDir, `${prompt.id}.json`);
    await fs.writeJson(filepath, prompt, { spaces: 2 });
  }

  private async getPrompt(id: string): Promise<InterAgentPrompt | null> {
    const filepath = path.join(this.promptsDir, `${id}.json`);
    if (!(await fs.pathExists(filepath))) return null;
    return await fs.readJson(filepath);
  }

  private async loadAllPrompts(): Promise<InterAgentPrompt[]> {
    if (!(await fs.pathExists(this.promptsDir))) return [];
    
    const files = await fs.readdir(this.promptsDir);
    const prompts: InterAgentPrompt[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const prompt = await fs.readJson(path.join(this.promptsDir, file));
          prompts.push(prompt);
        } catch (e) {
          // Skip invalid files
        }
      }
    }
    
    return prompts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private async saveMemoryShare(share: AgentMemoryShare): Promise<void> {
    await fs.ensureDir(this.memorySharesDir);
    const filepath = path.join(this.memorySharesDir, `${share.id}.json`);
    await fs.writeJson(filepath, share, { spaces: 2 });
  }
}
