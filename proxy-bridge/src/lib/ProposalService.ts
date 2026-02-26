import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { aggregateScores } from './consensus';

export type ConfidenceLevel = 'ship' | 'approved' | 'mutation_required' | 'mutation_major' | 'rejected';

export interface Challenge {
  id: string;
  agentId: string;
  risks: string[];
  questions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface Judgment {
  agentId: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  reasoning: string;
  stressor?: string;
  timestamp: string;
}

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
  challenges?: Challenge[];
  judgment?: Judgment;
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

  /**
   * LS-04: Devil's Advocate challenges a proposal with risks, questions, and severity.
   */
  async challenge(
    proposalId: string,
    agentId: string,
    risks: string[],
    questions: string[],
    severity: Challenge['severity']
  ): Promise<Proposal | null> {
    const proposals = await this.loadProposals();
    const idx = proposals.findIndex(p => p.id === proposalId);
    if (idx === -1) return null;

    const challenge: Challenge = {
      id: uuidv4(),
      agentId,
      risks,
      questions,
      severity,
      timestamp: new Date().toISOString(),
    };

    if (!proposals[idx].challenges) proposals[idx].challenges = [];
    proposals[idx].challenges!.push(challenge);
    await this.saveProposals(proposals);
    return proposals[idx];
  }

  /**
   * LS-04: Judge assigns a confidence score and derives proposal fate.
   * stressor is REQUIRED when confidence < 80.
   */
  async judge(
    proposalId: string,
    agentId: string,
    confidence: number,
    reasoning: string,
    stressor?: string
  ): Promise<Proposal | null> {
    if (confidence < 80 && !stressor) {
      throw new Error(
        'stressor is required when confidence < 80. Provide a specific actionable concern (not vague).'
      );
    }

    const level = getConfidenceLevel(confidence);

    const proposals = await this.loadProposals();
    const idx = proposals.findIndex(p => p.id === proposalId);
    if (idx === -1) return null;

    proposals[idx].judgment = {
      agentId,
      confidence,
      confidenceLevel: level,
      reasoning,
      stressor,
      timestamp: new Date().toISOString(),
    };

    // Set proposal status
    if (level === 'ship' || level === 'approved') {
      proposals[idx].status = 'approved';
    } else if (level === 'mutation_required' || level === 'mutation_major') {
      proposals[idx].status = 'pending'; // stays pending — agent must mutate with stressor
      proposals[idx].stressor = stressor;
    } else {
      proposals[idx].status = 'rejected';
    }

    await this.saveProposals(proposals);

    // Broadcast judgment to roundtable (dynamic import to avoid circular deps)
    try {
      const { Roundtable } = await import('./Roundtable');
      const rt = new Roundtable(this.projectPath);
      const stressorNote = stressor ? `. Stressor: ${stressor}` : '';
      await rt.postMessage(
        agentId,
        'judge',
        `[JUDGMENT] Proposal "${proposals[idx].action?.slice(0, 60)}" → ${level.toUpperCase()} (confidence: ${confidence}/100)${stressorNote}. ${reasoning}`,
        {}
      );
    } catch { /* roundtable not available in all contexts */ }

    return proposals[idx];
  }

  /** Returns proposals that have been challenged but not yet judged */
  async getPendingChallenges(): Promise<Proposal[]> {
    const proposals = await this.loadProposals();
    return proposals.filter(
      p => p.status === 'pending' && p.challenges && p.challenges.length > 0 && !p.judgment
    );
  }

  /**
   * P17-02: Judge a proposal using geometric median consensus over multiple evaluator scores.
   * When multiple agents score the same proposal, use aggregateScores() instead of a plain mean
   * so that Byzantine outliers are suppressed.
   *
   * Example:
   *   const finalScore = judgeWithConsensus([85, 90, 20, 88]); // → ~87.7 (ignores outlier 20)
   *   const level = getConfidenceLevel(finalScore);
   *
   * @param scores - array of 0-100 confidence scores from individual evaluator agents
   * @returns aggregated score via geometric median
   */
  judgeWithConsensus(scores: number[]): number {
    // aggregateScores uses Weiszfeld's algorithm (consensus.ts) — Byzantine-robust.
    // NOTE: If only a single score is provided this is a no-op (returns that score unchanged).
    return aggregateScores(scores);
  }
}

/**
 * P17-02: Module-level export of judgeWithConsensus.
 * Wraps aggregateScores for use outside of ProposalService instances.
 * @param scores - array of 0-100 confidence scores from individual evaluator agents
 * @returns aggregated score via geometric median (Byzantine-robust)
 */
export function judgeWithConsensus(scores: number[]): number {
  return aggregateScores(scores);
}
