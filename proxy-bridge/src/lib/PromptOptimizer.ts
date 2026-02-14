import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface PromptOptimization {
  id: string;
  workerType: string; // 'logic-bee', 'ui-bee', 'test-bee'
  originalPrompt: string;
  optimizedPrompt: string;
  reason: string; // Why optimization was needed
  rejectionCount: number;
  timestamp: string;
}

export interface WorkerMetrics {
  workerType: string;
  totalProposals: number;
  acceptedCount: number;
  rejectedCount: number;
  mutationRequiredCount: number;
  lastUpdated: string;
}

export interface PromptOptimizerConfig {
  rejectionRateThreshold: number; // If > 0.25, trigger optimization
  minRejectionsForOptimization: number; // Minimum 10 rejections before optimizing
  optimizationIntervalMs: number; // Check every 24h by default
}

/**
 * PromptOptimizer - KPI-Driven Prompt Auto-Tuning
 * 
 * Based on DSPy Meta-Prompt Optimization patterns.
 * Tracks rejection_rate per worker type and auto-generates improved
 * instructions when rejection rates exceed threshold.
 */
export class PromptOptimizer {
  private projectPath: string;
  private metricsFile: string;
  private optimizationsFile: string;
  private config: PromptOptimizerConfig;
  private metrics: Map<string, WorkerMetrics> = new Map();
  private lastOptimization: Map<string, string> = new Map(); // workerType -> timestamp

  constructor(
    projectPath: string, 
    config: Partial<PromptOptimizerConfig> = {}
  ) {
    this.projectPath = projectPath;
    this.metricsFile = path.join(projectPath, '.queenbee', 'worker-metrics.json');
    this.optimizationsFile = path.join(projectPath, '.queenbee', 'prompt-optimizations.json');
    
    this.config = {
      rejectionRateThreshold: config.rejectionRateThreshold ?? 0.25,
      minRejectionsForOptimization: config.minRejectionsForOptimization ?? 10,
      optimizationIntervalMs: config.optimizationIntervalMs ?? 24 * 60 * 60 * 1000, // 24h
    };
  }

  /**
   * Initialize and load existing metrics
   */
  async initialize(): Promise<void> {
    try {
      if (await fs.pathExists(this.metricsFile)) {
        const data = await fs.readJson(this.metricsFile);
        for (const [key, value] of Object.entries(data)) {
          this.metrics.set(key, value as WorkerMetrics);
        }
      }
    } catch (error) {
      console.error('Error loading worker metrics:', error);
    }
  }

  /**
   * Record a proposal outcome for a worker
   */
  async recordOutcome(
    workerType: string, 
    outcome: 'accepted' | 'rejected' | 'mutation_required'
  ): Promise<void> {
    const metrics = this.metrics.get(workerType) || {
      workerType,
      totalProposals: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      mutationRequiredCount: 0,
      lastUpdated: new Date().toISOString(),
    };

    metrics.totalProposals++;
    metrics.lastUpdated = new Date().toISOString();

    switch (outcome) {
      case 'accepted':
        metrics.acceptedCount++;
        break;
      case 'rejected':
        metrics.rejectedCount++;
        break;
      case 'mutation_required':
        metrics.mutationRequiredCount++;
        break;
    }

    this.metrics.set(workerType, metrics);
    await this.saveMetrics();
  }

  /**
   * Get rejection rate for a worker type
   */
  getRejectionRate(workerType: string): number {
    const metrics = this.metrics.get(workerType);
    if (!metrics || metrics.totalProposals === 0) {
      return 0;
    }
    return metrics.rejectedCount / metrics.totalProposals;
  }

  /**
   * Get all worker metrics
   */
  async getAllMetrics(): Promise<WorkerMetrics[]> {
    await this.initialize();
    return Array.from(this.metrics.values());
  }

  /**
   * Check if optimization is needed for a worker type
   */
  async needsOptimization(workerType: string): Promise<boolean> {
    const metrics = this.metrics.get(workerType);
    if (!metrics) return false;

    // Check rejection rate
    const rejectionRate = this.getRejectionRate(workerType);
    if (rejectionRate <= this.config.rejectionRateThreshold) {
      return false;
    }

    // Check minimum rejections
    if (metrics.rejectedCount < this.config.minRejectionsForOptimization) {
      return false;
    }

    // Check time since last optimization
    const lastOpt = this.lastOptimization.get(workerType);
    if (lastOpt) {
      const lastOptTime = new Date(lastOpt).getTime();
      const now = Date.now();
      if (now - lastOptTime < this.config.optimizationIntervalMs) {
        return false;
      }
    }

    return true;
  }

  /**
   * Analyze failed proposals and generate optimized prompt
   */
  async optimizePrompt(
    workerType: string, 
    failedProposals: { action: string; reason: string; rejectionReason?: string }[]
  ): Promise<PromptOptimization | null> {
    if (failedProposals.length === 0) return null;

    // Load current worker prompt
    const workerPrompts = await this.loadWorkerPrompts();
    const currentPrompt = workerPrompts[workerType];
    
    if (!currentPrompt) {
      console.error(`No prompt found for worker type: ${workerType}`);
      return null;
    }

    // Analyze common failure patterns
    const failurePatterns = this.analyzeFailures(failedProposals);

    // Generate optimization prompt for LLM
    const optimizationPrompt = this.generateOptimizationPrompt(
      workerType,
      currentPrompt,
      failurePatterns,
      failedProposals
    );

    // Create optimization record
    const optimization: PromptOptimization = {
      id: uuidv4(),
      workerType,
      originalPrompt: currentPrompt,
      optimizedPrompt: optimizationPrompt.optimizedSection,
      reason: optimizationPrompt.reason,
      rejectionCount: failedProposals.length,
      timestamp: new Date().toISOString(),
    };

    // Save optimization
    await this.saveOptimization(optimization);
    this.lastOptimization.set(workerType, new Date().toISOString());

    return optimization;
  }

  /**
   * Analyze failure patterns from rejected proposals
   */
  private analyzeFailures(
    proposals: { action: string; reason: string; rejectionReason?: string }[]
  ): string[] {
    const patterns: string[] = [];
    
    // Simple keyword analysis for common failure patterns
    const keywords = ['security', 'error', 'bug', 'performance', 'test', 'edge case', 'validation'];
    
    for (const keyword of keywords) {
      const count = proposals.filter(p => 
        p.action.toLowerCase().includes(keyword) ||
        p.reason?.toLowerCase().includes(keyword) ||
        p.rejectionReason?.toLowerCase().includes(keyword)
      ).length;
      
      if (count > proposals.length * 0.3) {
        patterns.push(`${keyword}: ${count} failures (${((count / proposals.length) * 100).toFixed(0)}%)`);
      }
    }

    return patterns;
  }

  /**
   * Generate optimization prompt for LLM
   */
  private generateOptimizationPrompt(
    workerType: string,
    currentPrompt: string,
    failurePatterns: string[],
    failedProposals: { action: string; reason: string; rejectionReason?: string }[]
  ): { optimizedSection: string; reason: string } {
    const failedExamples = failedProposals
      .slice(0, 5)
      .map(p => `- Action: ${p.action}\n  Reason: ${p.reason}\n  Rejection: ${p.rejectionReason || 'N/A'}`)
      .join('\n');

    const patterns = failurePatterns.length > 0 
      ? failurePatterns.join('\n') 
      : 'No specific pattern detected';

    const optimizedSection = `${currentPrompt}

---

## OPTIMIZATION BASED ON RECENT FAILURES

### Failure Patterns Detected:
${patterns}

### Recent Rejected Proposals:
${failedExamples}

### Additional Guidelines (Auto-Generated):
1. Pay special attention to ${failurePatterns[0]?.split(':')[0] || 'quality'} - it's causing ${failedProposals.length} rejections
2. Review each proposal against common failure patterns before submitting
3. Ensure all edge cases are considered in your implementation plan
4. Double-check security implications of any proposed changes

This optimization was auto-generated after ${failedProposals.length} rejections. Follow these additional guidelines to improve acceptance rate.`;

    return {
      optimizedSection,
      reason: `Rejection rate exceeded ${(this.config.rejectionRateThreshold * 100)}% threshold. ${failedProposals.length} rejections analyzed. Patterns: ${patterns}`,
    };
  }

  /**
   * Load worker prompts from the prompts directory
   */
  private async loadWorkerPrompts(): Promise<Record<string, string>> {
    const promptsDir = path.join(this.projectPath, 'src', 'lib', 'prompts', 'workers');
    const prompts: Record<string, string> = {};

    try {
      const files = await fs.readdir(promptsDir);
      for (const file of files) {
        if (file.endsWith('-bee.ts')) {
          const workerType = file.replace('-bee.ts', '-bee');
          const content = await fs.readFile(path.join(promptsDir, file), 'utf-8');
          // Extract the main prompt content (simplified - just use file content)
          prompts[workerType] = content;
        }
      }
    } catch (error) {
      console.error('Error loading worker prompts:', error);
    }

    return prompts;
  }

  /**
   * Save metrics to file
   */
  private async saveMetrics(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.metricsFile));
      const data: Record<string, WorkerMetrics> = {};
      for (const [key, value] of this.metrics) {
        data[key] = value;
      }
      await fs.writeJson(this.metricsFile, data, { spaces: 2 });
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Save optimization to file
   */
  private async saveOptimization(optimization: PromptOptimization): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.optimizationsFile));
      
      let optimizations: PromptOptimization[] = [];
      if (await fs.pathExists(this.optimizationsFile)) {
        optimizations = await fs.readJson(this.optimizationsFile);
      }
      
      optimizations.push(optimization);
      
      // Keep only last 10 optimizations per worker type
      const byWorker = new Map<string, PromptOptimization[]>();
      for (const opt of optimizations) {
        const existing = byWorker.get(opt.workerType) || [];
        existing.push(opt);
        byWorker.set(opt.workerType, existing);
      }

      const trimmed: PromptOptimization[] = [];
      for (const [, opts] of byWorker) {
        trimmed.push(...opts.slice(-10));
      }

      await fs.writeJson(this.optimizationsFile, trimmed, { spaces: 2 });
    } catch (error) {
      console.error('Error saving optimization:', error);
    }
  }

  /**
   * Get all optimizations for a worker type
   */
  async getOptimizations(workerType: string): Promise<PromptOptimization[]> {
    try {
      if (await fs.pathExists(this.optimizationsFile)) {
        const all = await fs.readJson(this.optimizationsFile);
        return all.filter((o: PromptOptimization) => o.workerType === workerType);
      }
    } catch (error) {
      console.error('Error loading optimizations:', error);
    }
    return [];
  }
}
