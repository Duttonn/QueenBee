import fs from 'fs-extra';
import path from 'path';

export interface AgentReasoning {
  agentId: string;
  reasoning: string; // The agent's reasoning chain
  confidence: number;
  timestamp: string;
}

export interface ConsensusResult {
  isConsensus: boolean;
  similarity: number;
  confidence: number;
  antiConformityTriggered: boolean;
  stressTestPrompt?: string;
  details: string;
}

export interface DebateRound {
  round: number;
  reasonings: AgentReasoning[];
  consensusReached: boolean;
  antiConformityInjected: boolean;
}

/**
 * ConsensusAnalyzer - Detects False Consensus in Multi-Agent Debates
 * 
 * Based on Free-MAD debate strategies and Byzantine Fault Tolerance patterns.
 * Detects when agents agree for wrong reasons (groupthink) and injects
 * anti-conformity stress tests.
 */
export class ConsensusAnalyzer {
  private projectPath: string;
  private rounds: DebateRound[] = [];
  private similarityThreshold = 0.95; // If similarity > 0.95, suspicious
  private confidenceThreshold = 0.75; // If confidence < 0.75 for 3+ rounds
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Calculate semantic similarity between two reasoning strings
   * Uses simple keyword/phrase overlap for now (can be enhanced with embeddings)
   */
  private calculateSimilarity(reasoning1: string, reasoning2: string): number {
    // Normalize and tokenize
    const tokens1 = this.tokenize(reasoning1);
    const tokens2 = this.tokenize(reasoning2);
    
    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }

    // Jaccard similarity
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Add a new reasoning to the current debate round
   */
  addReasoning(agentId: string, reasoning: string, confidence: number): void {
    const currentRound = this.rounds.length > 0 ? this.rounds[this.rounds.length - 1] : null;
    
    if (!currentRound || currentRound.consensusReached) {
      // Start new round
      this.rounds.push({
        round: this.rounds.length + 1,
        reasonings: [{
          agentId,
          reasoning,
          confidence,
          timestamp: new Date().toISOString(),
        }],
        consensusReached: false,
        antiConformityInjected: false,
      });
    } else {
      // Add to current round
      currentRound.reasonings.push({
        agentId,
        reasoning,
        confidence,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Analyze current round for false consensus
   */
  analyzeCurrentRound(): ConsensusResult {
    const currentRound = this.rounds[this.rounds.length - 1];
    
    if (!currentRound || currentRound.reasonings.length < 2) {
      return {
        isConsensus: false,
        similarity: 0,
        confidence: 1.0,
        antiConformityTriggered: false,
        details: 'Not enough reasonings to analyze',
      };
    }

    // Calculate pairwise similarities
    const similarities: number[] = [];
    for (let i = 0; i < currentRound.reasonings.length; i++) {
      for (let j = i + 1; j < currentRound.reasonings.length; j++) {
        const sim = this.calculateSimilarity(
          currentRound.reasonings[i].reasoning,
          currentRound.reasonings[j].reasoning
        );
        similarities.push(sim);
      }
    }

    // Average similarity
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    
    // Average confidence
    const avgConfidence = currentRound.reasonings.reduce((a, r) => a + r.confidence, 0) / currentRound.reasonings.length;

    // Check for false consensus (too much agreement = suspicious)
    const isFalseConsensus = avgSimilarity > this.similarityThreshold;
    
    // Check for consensus instability (low confidence over multiple rounds)
    const hasInstability = this.checkConsensusInstability();

    if (isFalseConsensus) {
      currentRound.consensusReached = true;
      currentRound.antiConformityInjected = true;
      
      return {
        isConsensus: true,
        similarity: avgSimilarity,
        confidence: avgConfidence,
        antiConformityTriggered: true,
        stressTestPrompt: this.generateStressTestPrompt(currentRound),
        details: `False consensus detected: agents agree with ${(avgSimilarity * 100).toFixed(1)}% similarity. Injecting anti-conformity stress test.`,
      };
    }

    // Mark consensus if reached with acceptable confidence
    if (avgSimilarity > 0.7 && avgConfidence > this.confidenceThreshold) {
      currentRound.consensusReached = true;
      return {
        isConsensus: true,
        similarity: avgSimilarity,
        confidence: avgConfidence,
        antiConformityTriggered: false,
        details: `Genuine consensus reached with ${(avgSimilarity * 100).toFixed(1)}% similarity and ${(avgConfidence * 100).toFixed(1)}% confidence.`,
      };
    }

    return {
      isConsensus: false,
      similarity: avgSimilarity,
      confidence: avgConfidence,
      antiConformityTriggered: false,
      details: `No consensus yet. Similarity: ${(avgSimilarity * 100).toFixed(1)}%, Confidence: ${(avgConfidence * 100).toFixed(1)}%`,
    };
  }

  /**
   * Check for consensus instability over multiple rounds
   */
  private checkConsensusInstability(): boolean {
    if (this.rounds.length < 3) return false;

    const recentRounds = this.rounds.slice(-3);
    const lowConfidenceCount = recentRounds.filter(round => {
      const avgConf = round.reasonings.reduce((a, r) => a + r.confidence, 0) / round.reasonings.length;
      return avgConf < this.confidenceThreshold;
    }).length;

    return lowConfidenceCount >= 3;
  }

  /**
   * Generate anti-conformity stress test prompt
   */
  private generateStressTestPrompt(round: DebateRound): string {
    const agents = round.reasonings.map(r => r.agentId).join(', ');
    
    return `⚠️ ANTI-CONFORMITY STRESS TEST ⚠️

The following agents have reached consensus with suspiciously high similarity (possible groupthink):
Agents: ${agents}

Your agreement is too perfect. This often indicates:
1. You may have started from the same flawed assumption
2. Groupthink may have suppressed dissenting views
3. Critical edge cases may be overlooked

TASK: Each agent must now independently identify AT LEAST 2 flaws or edge cases in the proposed solution that the group may have missed. 

Go back to first principles and challenge your own reasoning. What could go wrong? What assumptions are you making that might be wrong?

Respond with your individual analysis - do NOT look at other agents' responses first.`;
  }

  /**
   * Get confidence trajectory over debate rounds
   */
  getConfidenceTrajectory(): { round: number; avgConfidence: number }[] {
    return this.rounds.map(round => ({
      round: round.round,
      avgConfidence: round.reasonings.reduce((a, r) => a + r.confidence, 0) / round.reasonings.length,
    }));
  }

  /**
   * Reset analyzer for new debate
   */
  reset(): void {
    this.rounds = [];
  }

  /**
   * Get current round number
   */
  getCurrentRound(): number {
    return this.rounds.length;
  }

  /**
   * Log analysis results to file for debugging
   */
  async logAnalysis(): Promise<void> {
    const logFile = path.join(this.projectPath, '.queenbee', 'logs', 'consensus-analysis.jsonl');
    await fs.ensureDir(path.dirname(logFile));
    
    const entry = {
      timestamp: new Date().toISOString(),
      rounds: this.rounds.map(r => ({
        round: r.round,
        agentCount: r.reasonings.length,
        consensusReached: r.consensusReached,
        antiConformityInjected: r.antiConformityInjected,
      })),
      trajectory: this.getConfidenceTrajectory(),
    };
    
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
  }
}
