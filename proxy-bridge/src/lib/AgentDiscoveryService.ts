/**
 * P20-03: Agent Discovery Service (Runtime Capability Registry)
 *
 * Agents self-register capabilities at runtime and others query the registry
 * before delegating tasks. Enables dynamic swarms where agents discover
 * each other on-the-fly.
 *
 * Inspired by:
 *   - fcn06/swarm: Agent Discovery Service with runtime self-registration
 *   - AgentScope: A2A protocol for agent-to-agent discovery
 *
 * Integration points:
 *   - SubHiveRegistry.ts: enriches static contracts with runtime capabilities
 *   - ToolExecutor.ts: agents call `register_capabilities` on spawn
 *   - TopologyManager.ts: discovery uses topology for routing
 */

import { broadcast } from './socket-instance';
import { WorkerCapabilities, getWorkerCapabilities } from './prompts/workers';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface AgentRegistration {
  agentId: string;
  /** Worker type (UI_BEE, LOGIC_BEE, TEST_BEE, or custom) */
  workerType: string;
  /** Declared capabilities */
  capabilities: WorkerCapabilities;
  /** Tools this agent has available */
  tools: string[];
  /** Current status */
  status: 'idle' | 'busy' | 'completed' | 'failed';
  /** Task currently assigned (if busy) */
  currentTask?: string;
  /** Swarm this agent belongs to */
  swarmId?: string;
  /** Registration timestamp */
  registeredAt: string;
  /** Last heartbeat */
  lastSeen: string;
  /** Custom metadata from the agent */
  metadata?: Record<string, unknown>;
}

export interface DiscoveryQuery {
  /** Required capabilities (matched via AND logic) */
  requiredCapabilities?: Partial<WorkerCapabilities>;
  /** Required languages */
  languages?: string[];
  /** Required frameworks */
  frameworks?: string[];
  /** Filter by status */
  status?: AgentRegistration['status'];
  /** Filter by swarm */
  swarmId?: string;
  /** Minimum reliability score */
  minReliability?: number;
  /** Minimum quality score */
  minQuality?: number;
}

export interface DiscoveryResult {
  agents: AgentRegistration[];
  /** How results were sorted */
  sortedBy: 'reliability' | 'quality' | 'recency';
  /** Total registered agents (before filtering) */
  totalRegistered: number;
}

/* ─── AgentDiscoveryService ─────────────────────────────────────────── */

/**
 * In-memory runtime registry for agent capabilities.
 * Agents self-register on spawn, update on status change, and deregister on completion.
 * Other agents (or the architect) query to find the best agent for a task.
 */
export class AgentDiscoveryService {
  private registry = new Map<string, AgentRegistration>();
  /** Stale threshold: agents not seen for 5 minutes are considered dead */
  private staleThresholdMs = 5 * 60 * 1000;

  /**
   * Register an agent's capabilities. Called on spawn.
   */
  register(
    agentId: string,
    workerType: string,
    options: {
      tools?: string[];
      swarmId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): AgentRegistration {
    const capabilities = getWorkerCapabilities(workerType);
    const now = new Date().toISOString();

    const registration: AgentRegistration = {
      agentId,
      workerType,
      capabilities,
      tools: options.tools || capabilities.allowedTools,
      status: 'idle',
      swarmId: options.swarmId,
      registeredAt: now,
      lastSeen: now,
      metadata: options.metadata,
    };

    this.registry.set(agentId, registration);

    broadcast('AGENT_DISCOVERED', {
      agentId,
      workerType,
      capabilities: {
        languages: capabilities.languages,
        frameworks: capabilities.frameworks,
        reliability: capabilities.reliability,
      },
    });

    return registration;
  }

  /**
   * Update an agent's status (called on task assignment, completion, etc.)
   */
  updateStatus(agentId: string, status: AgentRegistration['status'], currentTask?: string): void {
    const reg = this.registry.get(agentId);
    if (!reg) return;

    reg.status = status;
    reg.currentTask = currentTask;
    reg.lastSeen = new Date().toISOString();
  }

  /**
   * Record a heartbeat for an agent (keeps it from being marked stale).
   */
  heartbeat(agentId: string): void {
    const reg = this.registry.get(agentId);
    if (reg) {
      reg.lastSeen = new Date().toISOString();
    }
  }

  /**
   * Deregister an agent (called on completion or failure).
   */
  deregister(agentId: string): void {
    this.registry.delete(agentId);
    broadcast('AGENT_DEREGISTERED', { agentId });
  }

  /**
   * Discover agents matching a query. Results sorted by reliability (descending).
   */
  discover(query: DiscoveryQuery = {}): DiscoveryResult {
    this.pruneStaleAgents();

    let agents = Array.from(this.registry.values());

    // Filter by status
    if (query.status) {
      agents = agents.filter(a => a.status === query.status);
    }

    // Filter by swarm
    if (query.swarmId) {
      agents = agents.filter(a => a.swarmId === query.swarmId);
    }

    // Filter by languages
    if (query.languages && query.languages.length > 0) {
      agents = agents.filter(a =>
        query.languages!.every(lang => a.capabilities.languages.includes(lang))
      );
    }

    // Filter by frameworks
    if (query.frameworks && query.frameworks.length > 0) {
      agents = agents.filter(a =>
        query.frameworks!.every(fw => a.capabilities.frameworks.includes(fw))
      );
    }

    // Filter by minimum reliability
    if (query.minReliability !== undefined) {
      agents = agents.filter(a => a.capabilities.reliability >= query.minReliability!);
    }

    // Filter by minimum quality
    if (query.minQuality !== undefined) {
      agents = agents.filter(a => a.capabilities.quality >= query.minQuality!);
    }

    // Filter by capability flags
    if (query.requiredCapabilities) {
      const req = query.requiredCapabilities;
      agents = agents.filter(a => {
        if (req.canWriteFiles !== undefined && a.capabilities.canWriteFiles !== req.canWriteFiles) return false;
        if (req.canRunShell !== undefined && a.capabilities.canRunShell !== req.canRunShell) return false;
        if (req.canModifyTests !== undefined && a.capabilities.canModifyTests !== req.canModifyTests) return false;
        if (req.canSpawnWorkers !== undefined && a.capabilities.canSpawnWorkers !== req.canSpawnWorkers) return false;
        return true;
      });
    }

    // Sort by reliability (descending), then quality
    agents.sort((a, b) => {
      const relDiff = b.capabilities.reliability - a.capabilities.reliability;
      if (relDiff !== 0) return relDiff;
      return b.capabilities.quality - a.capabilities.quality;
    });

    return {
      agents,
      sortedBy: 'reliability',
      totalRegistered: this.registry.size,
    };
  }

  /**
   * Find the single best agent for a task based on required capabilities.
   * Returns null if no suitable agent is available.
   */
  findBestAgent(query: DiscoveryQuery): AgentRegistration | null {
    const result = this.discover({ ...query, status: 'idle' });
    return result.agents[0] || null;
  }

  /**
   * Get all registered agents (unfiltered).
   */
  getAll(): AgentRegistration[] {
    this.pruneStaleAgents();
    return Array.from(this.registry.values());
  }

  /**
   * Get a specific agent's registration.
   */
  get(agentId: string): AgentRegistration | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Remove agents that haven't sent a heartbeat recently.
   */
  private pruneStaleAgents(): void {
    const cutoff = Date.now() - this.staleThresholdMs;
    for (const [id, reg] of this.registry) {
      if (new Date(reg.lastSeen).getTime() < cutoff) {
        this.registry.delete(id);
        broadcast('AGENT_STALE_REMOVED', { agentId: id });
      }
    }
  }

  /**
   * Clear all registrations (for testing or swarm reset).
   */
  clear(): void {
    this.registry.clear();
  }
}

/** Singleton discovery service instance */
export const agentDiscovery = new AgentDiscoveryService();
