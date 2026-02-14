import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type ConfidenceLevel = 'ship' | 'approved' | 'mutation_required' | 'mutation_major' | 'rejected';

export interface Proposal {
  id: string;
  agentId: string;
  action: string; // Description of the proposed action
  status: 'pending' | 'approved' | 'rejected';
  confidence?: number; // 0-100 confidence score
  confidenceLevel?: ConfidenceLevel;
  stressor?: string; // Specific stressor for mutation
  reason?: string; // Reason for proposal or rejection
  timestamp: string;
}

/**
 * Determine confidence level from score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 90) return 'ship';
  if (confidence >= 80) return 'approved';
  if (confidence >= 70) return 'mutation_required';
  if (confidence >= 60) return 'mutation_major';
  return 'rejected';
}

/**
 * Get action recommendation based on confidence level
 */
export function getRecommendationForLevel(level: ConfidenceLevel): { action: string; mutate: boolean } {
  switch (level) {
    case 'ship':
      return { action: 'SHIP - Approve immediately', mutate: false };
    case 'approved':
      return { action: 'APPROVE - Ready to proceed', mutate: false };
    case 'mutation_required':
      return { action: 'MUTATE - Requires specific stressor', mutate: true };
    case 'mutation_major':
      return { action: 'MUTATE + RETHINK - Major revision needed', mutate: true };
    case 'rejected':
      return { action: 'REJECT - Do not proceed', mutate: false };
  }
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

  /**
   * Submit proposal with confidence score
   */
  async submit(agentId: string, action: string, reason?: string, confidence?: number): Promise<Proposal> {
    const proposals = await this.loadProposals();
    
    const confidenceLevel = confidence !== undefined ? getConfidenceLevel(confidence) : undefined;
    const recommendation = confidenceLevel ? getRecommendationForLevel(confidenceLevel) : undefined;
    
    const newProposal: Proposal = {
      id: uuidv4(),
      agentId,
      action,
      status: 'pending',
      confidence,
      confidenceLevel,
      reason: reason || recommendation?.action,
      timestamp: new Date().toISOString(),
    };
    proposals.push(newProposal);
    await this.saveProposals(proposals);
    return newProposal;
  }

  /**
   * Evaluate confidence and determine if mutation is needed
   * Returns the recommendation and any required stressor
   */
  async evaluateConfidence(proposalId: string): Promise<{
    level: ConfidenceLevel;
    recommendation: string;
    mutate: boolean;
    stressor?: string;
  } | null> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal || proposal.confidence === undefined) {
      return null;
    }

    const level = getConfidenceLevel(proposal.confidence);
    const recommendation = getRecommendationForLevel(level);

    return {
      level,
      recommendation: recommendation.action,
      mutate: recommendation.mutate,
      stressor: proposal.stressor,
    };
  }

  /**
   * Add or update stressor for a proposal (used when mutation is required)
   */
  async setStressor(id: string, stressor: string): Promise<Proposal | null> {
    const proposals = await this.loadProposals();
    const proposalIndex = proposals.findIndex(p => p.id === id);
    if (proposalIndex === -1) return null;

    proposals[proposalIndex].stressor = stressor;
    await this.saveProposals(proposals);
    return proposals[proposalIndex];
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
