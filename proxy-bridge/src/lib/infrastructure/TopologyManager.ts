/**
 * TopologyManager — Swarm communication topology management
 *
 * Defines and enforces structured communication patterns between agents.
 * Instead of flat broadcast (all talk to all), supports:
 *   - flat: all-to-all (default, current behavior)
 *   - star: hub-and-spoke (architect at center)
 *   - hierarchical: tree-based (architect → leads → workers)
 *   - ring: circular (each agent talks to neighbors)
 *   - mesh: fully connected subgroups
 *
 * Used by Roundtable to filter message delivery and by ToolExecutor
 * to auto-select topology based on swarm size.
 */

/* ─── Types ─────────────────────────────────────────────────────────── */

export type TopologyType = 'flat' | 'star' | 'hierarchical' | 'ring' | 'mesh';

export interface TopologyConfig {
  type: TopologyType;
  /** The hub agent for star topology, or root for hierarchical */
  hubAgentId?: string;
  /** Connection graph: agentId → set of connected agentIds */
  connections: Map<string, Set<string>>;
}

export interface TopologyAgent {
  id: string;
  role: 'architect' | 'worker' | 'lead';
  /** Optional group for mesh topology */
  group?: string;
}

/* ─── TopologyManager ───────────────────────────────────────────────── */

export class TopologyManager {
  private topology: TopologyConfig;
  private agents: Map<string, TopologyAgent> = new Map();

  constructor(type: TopologyType = 'flat') {
    this.topology = {
      type,
      connections: new Map(),
    };
  }

  /* ─── Configuration ────────────────────────────────────────────── */

  /**
   * Auto-select topology based on swarm size.
   *  <4 agents = star (simple hub-and-spoke)
   *  4-8 agents = hierarchical (tree)
   *  >8 agents = mesh (subgroups)
   */
  static autoSelect(agentCount: number): TopologyType {
    if (agentCount < 4) return 'star';
    if (agentCount <= 8) return 'hierarchical';
    return 'mesh';
  }

  getType(): TopologyType {
    return this.topology.type;
  }

  getConnections(): Map<string, Set<string>> {
    return this.topology.connections;
  }

  /**
   * Register an agent in the topology.
   */
  addAgent(agent: TopologyAgent): void {
    this.agents.set(agent.id, agent);
    if (!this.topology.connections.has(agent.id)) {
      this.topology.connections.set(agent.id, new Set());
    }
    this.rebuild();
  }

  /**
   * Remove an agent from the topology.
   */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.topology.connections.delete(agentId);
    // Remove from all other connection sets
    for (const [, peers] of this.topology.connections) {
      peers.delete(agentId);
    }
  }

  /**
   * Check if agentA can send a message to agentB.
   * In flat topology, always returns true.
   */
  canCommunicate(fromAgentId: string, toAgentId: string): boolean {
    if (this.topology.type === 'flat') return true;
    const peers = this.topology.connections.get(fromAgentId);
    return peers ? peers.has(toAgentId) : false;
  }

  /**
   * Get all agents that a given agent can communicate with.
   */
  getReachableAgents(agentId: string): string[] {
    if (this.topology.type === 'flat') {
      return Array.from(this.agents.keys()).filter(id => id !== agentId);
    }
    const peers = this.topology.connections.get(agentId);
    return peers ? Array.from(peers) : [];
  }

  /**
   * Filter a set of target agentIds to only those reachable from sender.
   */
  filterReachable(fromAgentId: string, targetAgentIds: string[]): string[] {
    if (this.topology.type === 'flat') return targetAgentIds;
    const reachable = new Set(this.getReachableAgents(fromAgentId));
    return targetAgentIds.filter(id => reachable.has(id));
  }

  /* ─── Topology Builders ────────────────────────────────────────── */

  /**
   * Rebuild the connection graph based on current agents and topology type.
   */
  private rebuild(): void {
    const agentList = Array.from(this.agents.values());
    if (agentList.length === 0) return;

    // Clear existing connections
    for (const [id] of this.topology.connections) {
      this.topology.connections.set(id, new Set());
    }

    switch (this.topology.type) {
      case 'flat':
        this.buildFlat(agentList);
        break;
      case 'star':
        this.buildStar(agentList);
        break;
      case 'hierarchical':
        this.buildHierarchical(agentList);
        break;
      case 'ring':
        this.buildRing(agentList);
        break;
      case 'mesh':
        this.buildMesh(agentList);
        break;
    }
  }

  /** Flat: everyone connects to everyone */
  private buildFlat(agents: TopologyAgent[]): void {
    for (const a of agents) {
      const peers = this.topology.connections.get(a.id)!;
      for (const b of agents) {
        if (a.id !== b.id) peers.add(b.id);
      }
    }
  }

  /** Star: hub (architect or first agent) connects to all, workers only connect to hub */
  private buildStar(agents: TopologyAgent[]): void {
    const hub = agents.find(a => a.role === 'architect') || agents[0];
    this.topology.hubAgentId = hub.id;

    const hubPeers = this.topology.connections.get(hub.id)!;
    for (const a of agents) {
      if (a.id !== hub.id) {
        hubPeers.add(a.id);
        this.topology.connections.get(a.id)!.add(hub.id);
      }
    }
  }

  /** Hierarchical: architect → leads → workers. Leads see each other. */
  private buildHierarchical(agents: TopologyAgent[]): void {
    const architect = agents.find(a => a.role === 'architect');
    const leads = agents.filter(a => a.role === 'lead');
    const workers = agents.filter(a => a.role === 'worker');

    // If no explicit leads, promote first half of workers to leads
    if (leads.length === 0 && workers.length > 2) {
      const halfPoint = Math.ceil(workers.length / 2);
      for (let i = 0; i < Math.min(2, halfPoint); i++) {
        workers[i].role = 'lead';
        leads.push(workers[i]);
      }
    }

    // Architect ↔ all leads
    if (architect) {
      const archPeers = this.topology.connections.get(architect.id)!;
      for (const lead of leads) {
        archPeers.add(lead.id);
        this.topology.connections.get(lead.id)!.add(architect.id);
      }
      // Architect also sees all workers directly (read-only observation)
      for (const w of workers) {
        archPeers.add(w.id);
      }
    }

    // Leads ↔ each other
    for (const a of leads) {
      const aPeers = this.topology.connections.get(a.id)!;
      for (const b of leads) {
        if (a.id !== b.id) aPeers.add(b.id);
      }
    }

    // Distribute workers round-robin among leads
    if (leads.length > 0) {
      const actualWorkers = agents.filter(a => a.role === 'worker');
      for (let i = 0; i < actualWorkers.length; i++) {
        const lead = leads[i % leads.length];
        const leadPeers = this.topology.connections.get(lead.id)!;
        leadPeers.add(actualWorkers[i].id);
        this.topology.connections.get(actualWorkers[i].id)!.add(lead.id);
      }
    } else {
      // No leads — flat fallback among workers + architect
      this.buildFlat(agents);
    }
  }

  /** Ring: each agent connects to its neighbors in a circle */
  private buildRing(agents: TopologyAgent[]): void {
    for (let i = 0; i < agents.length; i++) {
      const prev = agents[(i - 1 + agents.length) % agents.length];
      const next = agents[(i + 1) % agents.length];
      const peers = this.topology.connections.get(agents[i].id)!;
      peers.add(prev.id);
      peers.add(next.id);
    }
  }

  /** Mesh: agents in the same group are fully connected, cross-group via representatives */
  private buildMesh(agents: TopologyAgent[]): void {
    // Group agents. Default group assignment: by index / 3
    const groups = new Map<string, TopologyAgent[]>();
    for (let i = 0; i < agents.length; i++) {
      const groupName = agents[i].group || `g${Math.floor(i / 3)}`;
      agents[i].group = groupName;
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName)!.push(agents[i]);
    }

    // Intra-group: fully connected
    for (const [, members] of groups) {
      for (const a of members) {
        const aPeers = this.topology.connections.get(a.id)!;
        for (const b of members) {
          if (a.id !== b.id) aPeers.add(b.id);
        }
      }
    }

    // Cross-group: first member of each group connects to first member of every other group
    const representatives = Array.from(groups.values()).map(g => g[0]);
    for (const a of representatives) {
      const aPeers = this.topology.connections.get(a.id)!;
      for (const b of representatives) {
        if (a.id !== b.id) aPeers.add(b.id);
      }
    }

    // Architect (if any) connects to all representatives
    const architect = agents.find(a => a.role === 'architect');
    if (architect) {
      const archPeers = this.topology.connections.get(architect.id)!;
      for (const rep of representatives) {
        if (rep.id !== architect.id) {
          archPeers.add(rep.id);
          this.topology.connections.get(rep.id)!.add(architect.id);
        }
      }
    }
  }

  /* ─── Serialization ────────────────────────────────────────────── */

  toJSON(): { type: TopologyType; hubAgentId?: string; agents: TopologyAgent[]; connections: Record<string, string[]> } {
    const connections: Record<string, string[]> = {};
    for (const [id, peers] of this.topology.connections) {
      connections[id] = Array.from(peers);
    }
    return {
      type: this.topology.type,
      hubAgentId: this.topology.hubAgentId,
      agents: Array.from(this.agents.values()),
      connections,
    };
  }
}
