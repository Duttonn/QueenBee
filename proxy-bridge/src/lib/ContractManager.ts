import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ContractSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
}

export interface WorkerContract {
  id: string;
  name: string;
  version: string;
  providerWorkerId: string; // Worker providing data
  consumerWorkerId: string; // Worker consuming data
  inputSchema: ContractSchema;
  outputSchema: ContractSchema;
  contractFilePath: string; // Path to interface file
  status: 'pending' | 'active' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface DataExchange {
  id: string;
  contractId: string;
  fromWorkerId: string;
  toWorkerId: string;
  data: unknown;
  timestamp: string;
  verified: boolean;
}

/**
 * ContractManager - Formal API Contracts Between Workers
 * 
 * Workers communicate via formal API contracts instead of natural language.
 * When Worker A needs data from Worker B, it reads from contract-defined
 * interface file. Prevents hallucinations from miscommunications.
 * 
 * Schema stored in `.queenbee/contracts/`
 */
export class ContractManager {
  private projectPath: string;
  private contractsDir: string;
  private contractsFile: string;
  private exchangesFile: string;
  private contracts: Map<string, WorkerContract> = new Map();
  private exchanges: Map<string, DataExchange> = new Map();

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.contractsDir = path.join(projectPath, '.queenbee', 'contracts');
    this.contractsFile = path.join(projectPath, '.queenbee', 'worker-contracts.json');
    this.exchangesFile = path.join(projectPath, '.queenbee', 'data-exchanges.json');
  }

  /**
   * Initialize and load existing contracts
   */
  async initialize(): Promise<void> {
    try {
      await fs.ensureDir(this.contractsDir);
      
      if (await fs.pathExists(this.contractsFile)) {
        const data = await fs.readJson(this.contractsFile);
        for (const contract of data) {
          this.contracts.set(contract.id, contract);
        }
      }
      if (await fs.pathExists(this.exchangesFile)) {
        const data = await fs.readJson(this.exchangesFile);
        for (const exchange of data) {
          this.exchanges.set(exchange.id, exchange);
        }
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  }

  /**
   * Create a new contract between workers
   */
  async createContract(
    name: string,
    providerWorkerId: string,
    consumerWorkerId: string,
    inputSchema: ContractSchema,
    outputSchema: ContractSchema
  ): Promise<WorkerContract> {
    const contract: WorkerContract = {
      id: `contract-${uuidv4().slice(0, 8)}`,
      name,
      version: '1.0.0',
      providerWorkerId,
      consumerWorkerId,
      inputSchema,
      outputSchema,
      contractFilePath: path.join(this.contractsDir, `${name}-v1.0.0.json`),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Write contract interface file
    const contractInterface = {
      contract: {
        name: contract.name,
        version: contract.version,
        provider: contract.providerWorkerId,
        consumer: contract.consumerWorkerId,
      },
      input: contract.inputSchema,
      output: contract.outputSchema,
    };
    
    await fs.writeJson(contract.contractFilePath, contractInterface, { spaces: 2 });

    this.contracts.set(contract.id, contract);
    await this.saveContracts();

    console.log(`[Contract] Created: ${name} between ${providerWorkerId} and ${consumerWorkerId}`);
    return contract;
  }

  /**
   * Read data from a contract (for consumer worker)
   */
  async readFromContract(
    contractName: string,
    consumerWorkerId: string
  ): Promise<{ data: unknown; exchangeId: string } | null> {
    // Find active contract
    const contract = Array.from(this.contracts.values()).find(
      c => c.name === contractName && 
           c.consumerWorkerId === consumerWorkerId &&
           c.status === 'active'
    );

    if (!contract) {
      console.warn(`[Contract] No active contract found: ${contractName} for ${consumerWorkerId}`);
      return null;
    }

    // Read from provider's data file
    const providerDataFile = path.join(
      this.contractsDir, 
      `${contract.providerWorkerId}-output.json`
    );

    if (!await fs.pathExists(providerDataFile)) {
      console.warn(`[Contract] Provider data file not found: ${providerDataFile}`);
      return null;
    }

    const data = await fs.readJson(providerDataFile);
    
    // Record exchange
    const exchange: DataExchange = {
      id: `exchange-${uuidv4().slice(0, 8)}`,
      contractId: contract.id,
      fromWorkerId: contract.providerWorkerId,
      toWorkerId: consumerWorkerId,
      data,
      timestamp: new Date().toISOString(),
      verified: false,
    };

    this.exchanges.set(exchange.id, exchange);
    await this.saveExchanges();

    console.log(`[Contract] ${consumerWorkerId} read from ${contract.name}`);
    return { data, exchangeId: exchange.id };
  }

  /**
   * Write data to a contract (for provider worker)
   */
  async writeToContract(
    contractName: string,
    providerWorkerId: string,
    data: unknown
  ): Promise<boolean> {
    // Find active contract
    const contract = Array.from(this.contracts.values()).find(
      c => c.name === contractName && 
           c.providerWorkerId === providerWorkerId &&
           c.status === 'active'
    );

    if (!contract) {
      console.warn(`[Contract] No active contract found: ${contractName} for ${providerWorkerId}`);
      return false;
    }

    // Validate data against output schema
    const isValid = this.validateAgainstSchema(data, contract.outputSchema);
    if (!isValid) {
      console.error(`[Contract] Data validation failed for ${contractName}`);
      return false;
    }

    // Write provider data file
    const providerDataFile = path.join(
      this.contractsDir, 
      `${providerWorkerId}-output.json`
    );

    await fs.writeJson(providerDataFile, data, { spaces: 2 });

    // Update contract status
    contract.status = 'active';
    contract.updatedAt = new Date().toISOString();
    await this.saveContracts();

    console.log(`[Contract] ${providerWorkerId} wrote to ${contract.name}`);
    return true;
  }

  /**
   * Validate data against a JSON schema
   */
  private validateAgainstSchema(data: unknown, schema: ContractSchema): boolean {
    if (!schema || !schema.type) return true;

    // Basic type validation
    const dataType = Array.isArray(data) ? 'array' : typeof data;
    if (dataType !== schema.type) {
      return false;
    }

    // For objects, validate required properties
    if (schema.type === 'object' && schema.required && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      for (const required of schema.required) {
        if (!(required in obj)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Activate a contract
   */
  async activateContract(contractId: string): Promise<boolean> {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    contract.status = 'active';
    contract.updatedAt = new Date().toISOString();
    await this.saveContracts();

    console.log(`[Contract] Activated: ${contract.name}`);
    return true;
  }

  /**
   * Complete a contract
   */
  async completeContract(contractId: string): Promise<boolean> {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    contract.status = 'completed';
    contract.updatedAt = new Date().toISOString();
    await this.saveContracts();

    console.log(`[Contract] Completed: ${contract.name}`);
    return true;
  }

  /**
   * Get contract by ID
   */
  async getContract(id: string): Promise<WorkerContract | undefined> {
    await this.initialize();
    return this.contracts.get(id);
  }

  /**
   * Get contracts for a worker (as provider or consumer)
   */
  async getContractsForWorker(workerId: string): Promise<WorkerContract[]> {
    await this.initialize();
    return Array.from(this.contracts.values()).filter(
      c => c.providerWorkerId === workerId || c.consumerWorkerId === workerId
    );
  }

  /**
   * Get all contracts
   */
  async getAllContracts(): Promise<WorkerContract[]> {
    await this.initialize();
    return Array.from(this.contracts.values());
  }

  /**
   * Get exchange history for a contract
   */
  async getExchangeHistory(contractId: string): Promise<DataExchange[]> {
    await this.initialize();
    return Array.from(this.exchanges.values()).filter(
      e => e.contractId === contractId
    );
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
   * Save exchanges to file
   */
  private async saveExchanges(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.exchangesFile));
      await fs.writeJson(this.exchangesFile, Array.from(this.exchanges.values()), { spaces: 2 });
    } catch (error) {
      console.error('Error saving exchanges:', error);
    }
  }
}
