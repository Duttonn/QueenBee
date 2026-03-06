import { EventEmitter } from 'events';
import { PolicyStore } from './infrastructure/PolicyStore';
import { SessionLifecycleState } from './agents/AutonomousRunner';

/**
 * PR State information
 */
export interface PRInfo {
  url: string;
  number: number;
  state: 'open' | 'closed' | 'merged';
  title: string;
  branch: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * CI Status information
 */
export interface CIStatus {
  state: 'pending' | 'success' | 'failure' | 'neutral';
  checks: CICheck[];
}

/**
 * Individual CI check
 */
export interface CICheck {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | null;
  url: string;
}

/**
 * Review information
 */
export interface ReviewInfo {
  state: 'pending' | 'approved' | 'changes_requested' | 'commented';
  author: string;
  submittedAt: string;
}

/**
 * Complete PR State
 */
export interface PRState {
  exists: boolean;
  pr?: PRInfo;
  ci?: CIStatus;
  review?: ReviewInfo;
  mergeable: boolean;
  lastChecked: number;
}

/**
 * PR Lifecycle Manager - Tracks PR status, CI checks, and reviews
 * Polls GitHub/GitLab API for PR state changes
 */
export class PRLifecycleManager extends EventEmitter {
  private projectPath: string;
  private projectRepo: string;
  private pollIntervalMs: number = 30000; // 30 seconds default
  private pollTimer: NodeJS.Timeout | null = null;
  private trackedPRs: Map<string, PRState> = new Map();
  private policyStore: PolicyStore;

  constructor(projectPath: string, projectRepo: string) {
    super();
    this.projectPath = projectPath;
    this.projectRepo = projectRepo;
    this.policyStore = new PolicyStore(projectPath);
  }

  /**
   * Start polling for PR status
   */
  async startPolling(branch: string): Promise<void> {
    // Load poll interval from policies
    const interval = await this.policyStore.get('pr_poll_interval');
    if (interval) {
      this.pollIntervalMs = interval;
    }

    console.log(`[PRLifecycleManager] Starting PR polling for branch ${branch} every ${this.pollIntervalMs}ms`);

    // Initial check
    await this.checkPRStatus(branch);

    // Start polling
    this.pollTimer = setInterval(async () => {
      await this.checkPRStatus(branch);
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log('[PRLifecycleManager] Stopped PR polling');
    }
  }

  /**
   * Check PR status for a branch
   */
  async checkPRStatus(branch: string): Promise<PRState> {
    console.log(`[PRLifecycleManager] Checking PR status for branch: ${branch}`);

    try {
      // Check if PR exists for this branch
      const prInfo = await this.detectPR(branch);
      
      if (!prInfo) {
        const noPRState: PRState = {
          exists: false,
          mergeable: false,
          lastChecked: Date.now(),
        };
        this.trackedPRs.set(branch, noPRState);
        return noPRState;
      }

      // Get CI status
      const ciStatus = await this.getCIChecks(prInfo);

      // Get review status
      const reviewInfo = await this.getReviewStatus(prInfo);

      // Get mergeability
      const mergeable = await this.getMergeability(prInfo);

      const prState: PRState = {
        exists: true,
        pr: prInfo,
        ci: ciStatus,
        review: reviewInfo,
        mergeable,
        lastChecked: Date.now(),
      };

      this.trackedPRs.set(branch, prState);

      // Emit state change events
      await this.emitStateChanges(branch, prState);

      return prState;
    } catch (error) {
      console.error(`[PRLifecycleManager] Error checking PR status:`, error);
      return {
        exists: false,
        mergeable: false,
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Detect if PR exists for a branch
   */
  private async detectPR(branch: string): Promise<PRInfo | null> {
    // Use gh CLI to find PR for branch
    const { execSync } = require('child_process');
    
    try {
      const output = execSync(
        `gh pr view ${branch} --json url,number,title,headRefName,author,createdAt,updatedAt,state 2>/dev/null`,
        { encoding: 'utf-8', cwd: this.projectPath }
      );
      
      const pr = JSON.parse(output);
      
      return {
        url: pr.url,
        number: pr.number,
        state: pr.state,
        title: pr.title,
        branch: pr.headRefName,
        author: pr.author?.login || 'unknown',
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
      };
    } catch {
      // No PR found
      return null;
    }
  }

  /**
   * Get CI checks for a PR
   */
  private async getCIChecks(prInfo: PRInfo): Promise<CIStatus> {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync(
        `gh pr checks ${prInfo.number} --json name,status,conclusion,detailsUrl 2>/dev/null`,
        { encoding: 'utf-8' }
      );
      
      const checks = JSON.parse(output);
      
      const checkList: CICheck[] = checks.map((check: any) => ({
        name: check.name,
        status: check.status || 'completed',
        conclusion: check.conclusion || null,
        url: check.detailsUrl || '',
      }));

      // Determine overall state
      const hasFailure = checkList.some(c => c.conclusion === 'failure');
      const hasPending = checkList.some(c => c.status === 'queued' || c.status === 'in_progress');
      
      let state: 'pending' | 'success' | 'failure' | 'neutral' = 'neutral';
      if (hasPending) {
        state = 'pending';
      } else if (hasFailure) {
        state = 'failure';
      } else {
        state = 'success';
      }

      return { state, checks: checkList };
    } catch {
      return { state: 'neutral', checks: [] };
    }
  }

  /**
   * Get review status for a PR
   */
  private async getReviewStatus(prInfo: PRInfo): Promise<ReviewInfo | undefined> {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync(
        `gh pr view ${prInfo.number} --json reviews 2>/dev/null`,
        { encoding: 'utf-8' }
      );
      
      const data = JSON.parse(output);
      const reviews = data.reviews || [];
      
      // Get latest review from each author
      const latestByAuthor = new Map<string, any>();
      for (const review of reviews) {
        const existing = latestByAuthor.get(review.author?.login);
        if (!existing || new Date(review.submittedAt) > new Date(existing.submittedAt)) {
          latestByAuthor.set(review.author?.login, review);
        }
      }

      // Check for approval or changes requested
      const approved = Array.from(latestByAuthor.values()).find((r: any) => r.state === 'APPROVED');
      if (approved) {
        return {
          state: 'approved',
          author: approved.author?.login,
          submittedAt: approved.submittedAt,
        };
      }

      const changesRequested = Array.from(latestByAuthor.values()).find((r: any) => r.state === 'CHANGES_REQUESTED');
      if (changesRequested) {
        return {
          state: 'changes_requested',
          author: changesRequested.author?.login,
          submittedAt: changesRequested.submittedAt,
        };
      }

      // Has pending reviews
      if (reviews.length > 0) {
        return {
          state: 'pending',
          author: reviews[0]?.author?.login || 'unknown',
          submittedAt: reviews[0]?.submittedAt || '',
        };
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if PR is mergeable
   */
  private async getMergeability(prInfo: PRInfo): Promise<boolean> {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync(
        `gh pr view ${prInfo.number} --json mergeable 2>/dev/null`,
        { encoding: 'utf-8' }
      );
      
      const data = JSON.parse(output);
      return data.mergeable === true;
    } catch {
      return false;
    }
  }

  /**
   * Emit state change events based on PR state
   */
  private async emitStateChanges(branch: string, prState: PRState): Promise<void> {
    if (!prState.exists || !prState.pr) return;

    // Emit based on CI state
    if (prState.ci) {
      if (prState.ci.state === 'failure') {
        this.emit('ci.failing', { branch, pr: prState.pr, ci: prState.ci });
      } else if (prState.ci.state === 'success') {
        this.emit('ci.passing', { branch, pr: prState.pr, ci: prState.ci });
      }
    }

    // Emit based on review state
    if (prState.review) {
      if (prState.review.state === 'approved') {
        this.emit('review.approved', { branch, pr: prState.pr, review: prState.review });
      } else if (prState.review.state === 'changes_requested') {
        this.emit('review.changes_requested', { branch, pr: prState.pr, review: prState.review });
      } else if (prState.review.state === 'pending') {
        this.emit('review.pending', { branch, pr: prState.pr, review: prState.review });
      }
    }

    // Emit merge ready
    if (prState.mergeable && prState.ci?.state === 'success' && prState.review?.state === 'approved') {
      this.emit('merge.ready', { branch, pr: prState.pr });
    }
  }

  /**
   * Get current PR state for a branch
   */
  getPRState(branch: string): PRState | undefined {
    return this.trackedPRs.get(branch);
  }

  /**
   * Get all tracked PRs
   */
  getAllPRStates(): Map<string, PRState> {
    return new Map(this.trackedPRs);
  }

  /**
   * Merge a PR
   */
  async mergePR(branch: string, method: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<boolean> {
    const prState = this.trackedPRs.get(branch);
    if (!prState?.exists || !prState.pr) {
      throw new Error(`No PR found for branch ${branch}`);
    }

    const { execSync } = require('child_process');
    
    try {
      execSync(
        `gh pr merge ${prState.pr.number} --${method} --auto 2>/dev/null`,
        { encoding: 'utf-8', cwd: this.projectPath }
      );
      
      this.emit('merge.completed', { branch, pr: prState.pr });
      return true;
    } catch (error) {
      console.error(`[PRLifecycleManager] Error merging PR:`, error);
      return false;
    }
  }

  /**
   * Set poll interval
   */
  setPollInterval(ms: number): void {
    this.pollIntervalMs = ms;
    
    // Restart polling with new interval if running
    if (this.pollTimer) {
      this.stopPolling();
      // Note: caller needs to restart with the branch
    }
  }

  /**
   * Clean up
   */
  cleanup(): void {
    this.stopPolling();
    this.trackedPRs.clear();
  }
}
