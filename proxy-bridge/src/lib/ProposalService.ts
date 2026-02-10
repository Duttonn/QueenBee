import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Proposal {
  id: string;
  agentId: string;
  action: string; // Description of the proposed action
  status: 'pending' | 'approved' | 'rejected';
  reason?: string; // Reason for proposal or rejection
  timestamp: string;
}

export class ProposalService {
  private projectPath: string;
  private proposalsFile: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.proposalsFile = path.join(projectPath, '.queenbee', 'proposals.json');
  }

  private async loadProposals(): Promise<Proposal[]> {
    try {
      if (await fs.pathExists(this.proposalsFile)) {
        return await fs.readJson(this.proposalsFile);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
    return [];
  }

  private async saveProposals(proposals: Proposal[]): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.proposalsFile));
      await fs.writeJson(this.proposalsFile, proposals, { spaces: 2 });
    } catch (error) {
      console.error('Error saving proposals:', error);
      throw new Error(`Failed to save proposals: ${error.message}`);
    }
  }

  async submit(agentId: string, action: string, reason?: string): Promise<Proposal> {
    const proposals = await this.loadProposals();
    const newProposal: Proposal = {
      id: uuidv4(),
      agentId,
      action,
      status: 'pending',
      reason,
      timestamp: new Date().toISOString(),
    };
    proposals.push(newProposal);
    await this.saveProposals(proposals);
    return newProposal;
  }

  async approve(id: string): Promise<Proposal | null> {
    const proposals = await this.loadProposals();
    const proposalIndex = proposals.findIndex(p => p.id === id);
    if (proposalIndex === -1) return null;

    proposals[proposalIndex].status = 'approved';
    await this.saveProposals(proposals);
    return proposals[proposalIndex];
  }

  async reject(id: string, reason?: string): Promise<Proposal | null> {
    const proposals = await this.loadProposals();
    const proposalIndex = proposals.findIndex(p => p.id === id);
    if (proposalIndex === -1) return null;

    proposals[proposalIndex].status = 'rejected';
    if (reason) {
        proposals[proposalIndex].reason = reason; // Update reason with rejection reason if provided
    }
    await this.saveProposals(proposals);
    return proposals[proposalIndex];
  }

  async getPendingProposals(): Promise<Proposal[]> {
      const proposals = await this.loadProposals();
      return proposals.filter(p => p.status === 'pending');
  }

  async getProposal(id: string): Promise<Proposal | null> {
      const proposals = await this.loadProposals();
      return proposals.find(p => p.id === id) || null;
  }
}
