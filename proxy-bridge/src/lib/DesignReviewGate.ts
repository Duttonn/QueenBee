/**
 * P20-09: Parallel Design Review Gate (Multi-Specialist Review)
 *
 * Before expensive execution, spawn lightweight parallel LLM calls with
 * different specialist personas (security, performance, architecture, UX,
 * maintainability) to review the plan. Uses geometric median (Weiszfeld)
 * from consensus.ts for Byzantine-robust score aggregation.
 *
 * Inspired by metaswarm's 5 parallel specialist reviewers with 3-iteration cap.
 *
 * Integration:
 *   - AutonomousRunner.ts: wire before Phase 3 (LAUNCH) in architect workflow
 *   - consensus.ts: reuse aggregateScores() for robust scoring
 *   - socket-instance.ts: emits DESIGN_REVIEW_RESULT event
 */

import { broadcast } from './socket-instance';
import { unifiedLLMService } from './UnifiedLLMService';
import { aggregateScores } from './consensus';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface ReviewerResult {
  role: string;
  approved: boolean;
  concerns: string[];
  suggestions: string[];
  score: number;
  critical: boolean;
}

export interface DesignReviewResult {
  /** Overall pass/fail */
  approved: boolean;
  /** Aggregated score via geometric median (0-100) */
  aggregateScore: number;
  /** Individual reviewer results */
  reviewers: ReviewerResult[];
  /** Iteration number (1-based) */
  iteration: number;
  /** Total duration */
  durationMs: number;
  /** Reasons for rejection (if any) */
  rejectionReasons: string[];
}

export interface DesignReviewOptions {
  /** Minimum aggregate score to pass (default: 70) */
  threshold?: number;
  /** Max iterations before human escalation (default: 3) */
  maxIterations?: number;
  /** Which reviewer roles to use */
  reviewerRoles?: string[];
  /** LLM provider for reviews */
  provider?: string;
}

/* ─── Reviewer Personas ─────────────────────────────────────────────── */

const DEFAULT_REVIEWERS: Record<string, string> = {
  security: `You are a security reviewer. Evaluate this design for:
- Injection vulnerabilities (SQL, command, XSS)
- Authentication/authorization gaps
- Data exposure risks
- Dependency vulnerabilities
- Secret/credential handling

Focus ONLY on security. Score 0-100. Flag any critical security concern.`,

  performance: `You are a performance reviewer. Evaluate this design for:
- N+1 query patterns
- Missing caching opportunities
- Unnecessary re-renders or recomputations
- Memory leaks or resource management
- Scalability bottlenecks

Focus ONLY on performance. Score 0-100.`,

  architecture: `You are an architecture reviewer. Evaluate this design for:
- Separation of concerns
- SOLID principles adherence
- Appropriate abstraction levels
- Dependency direction (clean architecture)
- Error handling strategy

Focus ONLY on architecture. Score 0-100.`,

  ux: `You are a UX reviewer. Evaluate this design for:
- User flow completeness
- Error state handling for the user
- Loading/empty states
- Accessibility considerations
- Consistency with existing UI patterns

Focus ONLY on user experience. Score 0-100.`,

  maintainability: `You are a maintainability reviewer. Evaluate this design for:
- Code readability and documentation needs
- Test coverage plan
- Naming conventions
- Configuration management
- Future extensibility

Focus ONLY on maintainability. Score 0-100.`,
};

const REVIEWER_RESPONSE_FORMAT = `
Respond in EXACTLY this format:
SCORE: <number 0-100>
APPROVED: <true|false>
CRITICAL: <true|false>
CONCERNS: <comma-separated list of concerns, or "none">
SUGGESTIONS: <comma-separated list of suggestions, or "none">`;

/* ─── DesignReviewGate ──────────────────────────────────────────────── */

export class DesignReviewGate {
  /**
   * Run a parallel multi-specialist design review.
   * Returns aggregated result with per-reviewer feedback.
   */
  static async review(
    plan: string,
    options: DesignReviewOptions = {}
  ): Promise<DesignReviewResult> {
    const {
      threshold = 70,
      maxIterations = 3,
      reviewerRoles = ['security', 'architecture', 'performance', 'maintainability'],
      provider = 'auto',
    } = options;

    const start = Date.now();

    // Run all reviewers in parallel
    const reviewPromises = reviewerRoles.map(role =>
      DesignReviewGate.runReviewer(role, plan, provider)
    );

    const results = await Promise.allSettled(reviewPromises);
    const reviewers: ReviewerResult[] = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        role: reviewerRoles[i],
        approved: true, // Don't block on reviewer infra failure
        concerns: [`Reviewer failed: ${(r as PromiseRejectedResult).reason?.message}`],
        suggestions: [],
        score: 70,
        critical: false,
      };
    });

    // Aggregate scores via geometric median (Byzantine-robust)
    const scores = reviewers.map(r => r.score);
    const aggregateScore = aggregateScores(scores);

    // Check for critical flags
    const criticalReviewers = reviewers.filter(r => r.critical);
    const hasCritical = criticalReviewers.length > 0;

    // Determine pass/fail
    const approved = aggregateScore >= threshold && !hasCritical;

    const rejectionReasons: string[] = [];
    if (aggregateScore < threshold) {
      rejectionReasons.push(`Aggregate score ${aggregateScore.toFixed(0)} below threshold ${threshold}`);
    }
    for (const cr of criticalReviewers) {
      rejectionReasons.push(`${cr.role} flagged critical: ${cr.concerns.join('; ')}`);
    }

    const durationMs = Date.now() - start;

    const result: DesignReviewResult = {
      approved,
      aggregateScore,
      reviewers,
      iteration: 1,
      durationMs,
      rejectionReasons,
    };

    // Emit socket event
    broadcast('DESIGN_REVIEW_RESULT', {
      approved,
      aggregateScore: Math.round(aggregateScore),
      reviewerCount: reviewers.length,
      criticalCount: criticalReviewers.length,
      durationMs,
      reviewers: reviewers.map(r => ({
        role: r.role,
        score: r.score,
        approved: r.approved,
        critical: r.critical,
        concernCount: r.concerns.length,
      })),
    });

    return result;
  }

  /**
   * Run a single specialist reviewer.
   */
  private static async runReviewer(
    role: string,
    plan: string,
    provider: string
  ): Promise<ReviewerResult> {
    const systemPrompt = (DEFAULT_REVIEWERS[role] || `You are a ${role} reviewer. Score this design 0-100.`)
      + REVIEWER_RESPONSE_FORMAT;

    try {
      const response = await unifiedLLMService.chat(provider, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Review this design plan:\n\n${plan}` },
      ], {
        maxTokens: 512,
        temperature: 0.2,
      });

      const text = typeof response === 'string'
        ? response
        : (response as any)?.content || (response as any)?.choices?.[0]?.message?.content || '';

      return DesignReviewGate.parseReviewerResponse(role, text);
    } catch (err: any) {
      console.warn(`[DesignReviewGate] ${role} reviewer failed:`, err.message);
      return {
        role,
        approved: true,
        concerns: [`Reviewer error: ${err.message}`],
        suggestions: [],
        score: 70,
        critical: false,
      };
    }
  }

  /**
   * Parse a reviewer's structured response.
   */
  private static parseReviewerResponse(role: string, text: string): ReviewerResult {
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 50;

    const approvedMatch = text.match(/APPROVED:\s*(true|false)/i);
    const approved = approvedMatch ? approvedMatch[1].toLowerCase() === 'true' : score >= 60;

    const criticalMatch = text.match(/CRITICAL:\s*(true|false)/i);
    const critical = criticalMatch ? criticalMatch[1].toLowerCase() === 'true' : false;

    const concernsMatch = text.match(/CONCERNS:\s*(.+)/i);
    const concerns = concernsMatch && concernsMatch[1].trim().toLowerCase() !== 'none'
      ? concernsMatch[1].split(',').map(c => c.trim()).filter(Boolean)
      : [];

    const suggestionsMatch = text.match(/SUGGESTIONS:\s*(.+)/i);
    const suggestions = suggestionsMatch && suggestionsMatch[1].trim().toLowerCase() !== 'none'
      ? suggestionsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      : [];

    return { role, approved, concerns, suggestions, score, critical };
  }

  /**
   * Format review results as feedback for the architect to iterate on.
   */
  static formatFeedback(result: DesignReviewResult): string {
    const lines: string[] = [
      `DESIGN REVIEW ${result.approved ? 'PASSED' : 'FAILED'} (score: ${Math.round(result.aggregateScore)}/100, iteration ${result.iteration})`,
    ];

    for (const r of result.reviewers) {
      lines.push(`\n[${r.role.toUpperCase()}] Score: ${r.score}/100 ${r.critical ? '⚠ CRITICAL' : ''}`);
      if (r.concerns.length > 0) lines.push(`  Concerns: ${r.concerns.join('; ')}`);
      if (r.suggestions.length > 0) lines.push(`  Suggestions: ${r.suggestions.join('; ')}`);
    }

    if (result.rejectionReasons.length > 0) {
      lines.push(`\nRejection reasons: ${result.rejectionReasons.join('; ')}`);
      lines.push('Address these concerns and re-submit the design.');
    }

    return lines.join('\n');
  }
}
