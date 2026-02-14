import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type SubHiveType = 'ui' | 'backend' | 'data' | 'testing' | 'general';

export interface SubHiveCapability {
  type: SubHiveType;
  name: string;
  description: string;
  tools: string[]; // Available tools for this sub-hive
}

export interface SubHive {
  id: string;
  type: SubHiveType;
  name: string;
  capabilities: SubHiveCapability[];
  memoryPath: string; // Isolated memory store
  mainProjectPath: string; // Reference to main project
  workerIds: string[]; // Active workers in this sub-hive
  status: 'active' | 'idle' | 'completed';
  createdAt: string;
  parentHiveId?: string;
}

export interface Contract {
  id: string;
  name: string;
  version: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  providerHiveId: string; // Which sub-hive provides this contract
  consumerHiveIds: string[]; // Which sub-hives consume this contract
  createdAt: string;
}

export interface TaskAssignment {
  id: string;
  task: string;
  assignedHiveId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  contractId?: string; // If task requires data from another hive
}

/**
 * SubHiveRegistry - Hierarchical Hive Management
 * 
 * Supports hierarchical hives: Root Hive → Sub-Hives (UI, Backend, Data)
 * Each Sub-Hive has isolated memory and tools.
 * Communication only via typed contracts (JSON schemas).
 * Based on Contract Net Protocol - Sub-Hives propose capabilities,
 * Root assigns tasks.
 */
export class SubHiveRegistry {
  private projectPath: string;
  private subHivesFile: string;
  private contractsFile: string;
  private assignmentsFile: string;
  private subHives: Map<string, SubHive> = new Map();
  private contracts: Map<string, Contract> = new Map();
  private assignments: Map<string, TaskAssignment> = new Map();

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.subHivesFile = path.join(projectPath, '.queenbee', 'subhives.json');
    this.contractsFile = path.join(projectPath, '.queenbee', 'contracts.json');
    this.assignmentsFile = path.join(projectPath, '.queenbee', 'task-assignments.json');
  }

  /**
   * Initialize and load existing sub-hives
   */
  async initialize(): Promise<void> {
    try {
      if (await fs.pathExists(this.subHivesFile)) {
        const data = await fs.readJson(this.subHivesFile);
        for (const hive of data) {
          this.subHives.set(hive.id, hive);
        }
      }
      if (await fs.pathExists(this.contractsFile)) {
        const data = await fs.readJson(this.contractsFile);
        for (const contract of data) {
          this.contracts.set(contract.id, contract);
        }
      }
      if (await fs.pathExists(this.assignmentsFile)) {
        const data = await fs.readJson(this.assignmentsFile);
        for (const assignment of data) {
          this.assignments.set(assignment.id, assignment);
        }
      }
    } catch (error) {
      console.error('Error loading sub-hives:', error);
    }
  }

  /**
   * Create a new sub-hive
   */
  async createSubHive(
    type: SubHiveType,
    name: string,
    parentHiveId?: string
  ): Promise<SubHive> {
    const hive: SubHive = {
      id: `subhive-${uuidv4().slice(0, 8)}`,
      type,
      name,
      capabilities: this.getCapabilitiesForType(type),
      memoryPath: path.join(this.projectPath, '.queenbee', 'subhives', name, 'memory.json'),
      mainProjectPath: this.projectPath,
      workerIds: [],
      status: 'idle',
      createdAt: new Date().toISOString(),
      parentHiveId,
    };

    // Create isolated memory directory
    await fs.ensureDir(path.dirname(hive.memoryPath));

    this.subHives.set(hive.id, hive);
    await this.saveSubHives();

    console.log(`[SubHive] Created: ${name} (${type})`);
    return hive;
  }

  /**
   * Get capabilities for a sub-hive type
   */
  private getCapabilitiesForType(type: SubHiveType): SubHiveCapability[] {
    switch (type) {
      case 'ui':
        return [
          { type: 'ui', name: 'UI Implementation', description: 'Build user interfaces', tools: ['write_file', 'read_file', 'search'] },
          { type: 'ui', name: 'Styling', description: 'Apply styles and themes', tools: ['write_file', 'read_file'] },
        ];
      case 'backend':
        return [
          { type: 'backend', name: 'API Development', description: 'Build APIs and services', tools: ['write_file', 'read_file', 'run_shell', 'search'] },
          { type: 'backend', name: 'Business Logic', description: 'Implement business rules', tools: ['write_file', 'read_file', 'search'] },
        ];
      case 'data':
        return [
          { type: 'data', name: 'Data Processing', description: 'Process and transform data', tools: ['read_file', 'run_shell', 'search'] },
          { type: 'data', name: 'Database', description: 'Database operations', tools: ['read_file', 'write_file', 'run_shell'] },
        ];
      case 'testing':
        return [
          { type: 'testing', name: 'Test Writing', description: 'Write unit and integration tests', tools: ['write_file', 'read_file', 'run_shell'] },
        ];
      default:
        return [
          { type: 'general', name: 'General', description: 'General purpose tasks', tools: ['write_file', 'read_file', 'run_shell', 'search'] },
        ];
    }
  }

  /**
   * Register a contract between sub-hives
   */
  async registerContract(
    name: string,
    version: string,
    inputSchema: Record<string, unknown>,
    outputSchema: Record<string, unknown>,
    providerHiveId: string,
    consumerHiveIds: string[]
  ): Promise<Contract> {
    const contract: Contract = {
      id: `contract-${uuidv4().slice(0, 8)}`,
      name,
      version,
      inputSchema,
      outputSchema,
      providerHiveId,
      consumerHiveIds,
      createdAt: new Date().toISOString(),
    };

    this.contracts.set(contract.id, contract);
    await this.saveContracts();

    console.log(`[SubHive] Contract registered: ${name} v${version}`);
    return contract;
  }

  /**
   * Assign a task to a sub-hive (Contract Net Protocol)
   */
  async assignTask(
    task: string,
    requiredCapability: SubHiveType,
    contractId?: string
  ): Promise<TaskAssignment> {
    // Find best sub-hive for the task
    const availableHives = Array.from(this.subHives.values())
      .filter(h => h.status === 'idle' || h.status === 'active')
      .filter(h => h.capabilities.some(c => c.type === requiredCapability));

    if (availableHives.length === 0) {
      // Create new sub-hive if none available
      const newHive = await this.createSubHive(requiredCapability, `${requiredCapability}-hive`);
      availableHives.push(newHive);
    }

    // Select hive with fewest workers (load balancing)
    const selectedHive = availableHives.sort((a, b) => a.workerIds.length - b.workerIds.length)[0];

    const assignment: TaskAssignment = {
      id: `task-${uuidv4().slice(0, 8)}`,
      task,
      assignedHiveId: selectedHive.id,
      status: 'pending',
      contractId,
    };

    // Update hive status
    selectedHive.status = 'active';
    this.assignments.set(assignment.id, assignment);
    
    await this.saveSubHives();
    await this.saveAssignments();

    console.log(`[SubHive] Task assigned to: ${selectedHive.name}`);
    return assignment;
  }

  /**
   * Mark task as completed
   */
  async completeTask(assignmentId: string, result: string): Promise<void> {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) return;

    assignment.status = 'completed';
    assignment.result = result;

    // Update hive status
    const hive = this.subHives.get(assignment.assignedHiveId);
    if (hive) {
      hive.status = 'idle';
    }

    await this.saveAssignments();
    await this.saveSubHives();
  }

  /**
   * Get all sub-hives
   */
  async getSubHives(): Promise<SubHive[]> {
    await this.initialize();
    return Array.from(this.subHives.values());
  }

  /**
   * Get sub-hive by ID
   */
  async getSubHive(id: string): Promise<SubHive | undefined> {
    await this.initialize();
    return this.subHives.get(id);
  }

  /**
   * Get contracts for a sub-hive (as provider or consumer)
   */
  async getContractsForHive(hiveId: string): Promise<Contract[]> {
    await this.initialize();
    return Array.from(this.contracts.values()).filter(
      c => c.providerHiveId === hiveId || c.consumerHiveIds.includes(hiveId)
    );
  }

  /**
   * Get tasks for a sub-hive
   */
  async getTasksForHive(hiveId: string): Promise<TaskAssignment[]> {
    await this.initialize();
    return Array.from(this.assignments.values()).filter(
      a => a.assignedHiveId === hiveId
    );
  }

  /**
   * Register a worker in a sub-hive
   */
  async registerWorker(hiveId: string, workerId: string): Promise<void> {
    const hive = this.subHives.get(hiveId);
    if (!hive) return;

    if (!hive.workerIds.includes(workerId)) {
      hive.workerIds.push(workerId);
      await this.saveSubHives();
    }
  }

  /**
   * Unregister a worker from a sub-hive
   */
  async unregisterWorker(hiveId: string, workerId: string): Promise<void> {
    const hive = this.subHives.get(hiveId);
    if (!hive) return;

    hive.workerIds = hive.workerIds.filter(id => id !== workerId);
    if (hive.workerIds.length === 0) {
      hive.status = 'idle';
    }
    await this.saveSubHives();
  }

  /**
   * Save sub-hives to file
   */
  private async saveSubHives(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.subHivesFile));
      await fs.writeJson(this.subHivesFile, Array.from(this.subHives.values()), { spaces: 2 });
    } catch (error) {
      console.error('Error saving sub-hives:', error);
    }
  }

  /**
   * Save contracts to file
   */
  private async saveContracts(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.contractsFile));
      await fs.writeJson(this.contractsFile, Array.from(this.contracts.values()), { spaces: 2 });
    } catch (error) {
      console.error('Error saving contracts:', error);
    }
  }

  /**
   * Save assignments to file
   */
  private async saveAssignments(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.assignmentsFile));
      await fs.writeJson(this.assignmentsFile, Array.from(this.assignments.values()), { spaces: 2 });
    } catch (error) {
      console.error('Error saving assignments:', error);
    }
  }
}
