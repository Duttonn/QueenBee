/**
 * P19-15: Council Automation
 *
 * Auto-convenes a council of agents when a tool call touches security-sensitive
 * files OR the diff size exceeds 500 lines. Uses Weiszfeld geometric median
 * consensus (P17-02) to aggregate three simulated reviewer scores.
 *
 * "Simulated multi-agent" means we call the LLM three times with slightly
 * different reviewer personas. This is the groundwork for real multi-agent
 * orchestration in a future phase.
 */

import { judgeWithConsensus } from '../ProposalService';
import { unifiedLLMService } from '../UnifiedLLMService';
import { broadcast } from '../infrastructure/socket-instance';

export interface CouncilResult {
  approved: boolean;
  score: number;       // Geometric median of the three reviewer scores (0-100)
  reasoning: string;   // Combined reasoning from all reviewers
}

export class CouncilAutomation {
  // -------------------------------------------------------------------------
  // Security-sensitive file patterns (path/content-based)
  // -------------------------------------------------------------------------
  private static SECURITY_PATTERNS: RegExp[] = [
    /auth/i,
    /credential/i,
    /secret/i,
    /password/i,
    /token/i,
    /\.env/,
    /keyring/i,
    /crypto/i,
    /oauth/i,
    /jwt/i,
  ];

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Determine whether a tool call warrants convening a council.
   *
   * Returns true if ANY of the following conditions are met:
   *  - A file path in the args matches a security-sensitive pattern
   *  - diffSize exceeds 500 lines
   *  - args.requires_council === true (explicit override from agent)
   */
  static shouldConvene(
    toolName: string,
    args: Record<string, any>,
    diffSize?: number
  ): boolean {
    // Only intercept write/edit operations
    if (toolName !== 'write_file' && toolName !== 'edit_file') {
      return false;
    }

    // Explicit override
    if (args.requires_council === true) {
      return true;
    }

    // Large diff
    if (typeof diffSize === 'number' && diffSize > 500) {
      return true;
    }

    // Security-sensitive file path
    const filePath: string = args.path || args.file || args.filename || '';
    if (filePath) {
      for (const pattern of CouncilAutomation.SECURITY_PATTERNS) {
        if (pattern.test(filePath)) {
          return true;
        }
      }
    }

    // Security-sensitive content patterns (for inline content writes)
    const content: string = typeof args.content === 'string' ? args.content : '';
    if (content) {
      for (const pattern of CouncilAutomation.SECURITY_PATTERNS) {
        if (pattern.test(content)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Convene a council of three simulated reviewers.
   *
   * Each reviewer is given a slightly different persona prefix so the LLM
   * produces subtly different perspectives. Their 0-100 scores are aggregated
   * via geometric median (Byzantine-robust, P17-02).
   *
   * @param proposal - Description of the proposed action (tool + args summary)
   * @param context  - Additional context for the reviewers
   * @param options  - Optional LLM provider/model settings
   */
  static async convene(
    proposal: string,
    context: string,
    options: {
      providerId?: string;
      apiKey?: string;
      model?: string;
    } = {}
  ): Promise<CouncilResult> {
    const providerId = options.providerId || 'auto';
    const model      = options.model || 'claude-3-haiku-20240307';

    const REVIEWERS = [
      'Reviewer 1 (Security Auditor): Focus on security risks, secret exposure, and auth bypass vectors.',
      'Reviewer 2 (Senior Engineer): Focus on code correctness, maintainability, and unintended side-effects.',
      'Reviewer 3 (Risk Manager): Focus on blast radius, rollback difficulty, and compliance concerns.',
    ];

    const scores: number[]     = [];
    const reasonings: string[] = [];

    for (const reviewer of REVIEWERS) {
      const prompt = `You are a ${reviewer}

Proposed operation:
${proposal}

Additional context:
${context}

Evaluate whether this operation should be approved by an automated council gate.
Respond ONLY with a JSON object: { "score": <0-100>, "reasoning": "<one concise sentence>" }

Scoring: 90-100 = safe to proceed, 80-89 = approved with minor concerns, 70-79 = risky but acceptable, 60-69 = major concerns, 0-59 = reject.`;

      try {
        const response = await unifiedLLMService.chat(
          providerId,
          [{ role: 'user', content: prompt }],
          {
            model,
            maxTokens: 150,
            temperature: 0.3,
            apiKey: options.apiKey,
          }
        );

        if (response.content) {
          // Strip markdown code fences if present
          const cleaned = response.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          const parsed = JSON.parse(cleaned) as { score: number; reasoning: string };
          const score  = Math.max(0, Math.min(100, Number(parsed.score) || 0));
          scores.push(score);
          reasonings.push(`[${reviewer.split(':')[0]}] ${parsed.reasoning}`);
        }
      } catch (reviewErr) {
        console.warn('[CouncilAutomation] Reviewer LLM call failed:', reviewErr);
        // Fallback: inject a neutral score to avoid blocking on transient errors
        scores.push(75);
        reasonings.push(`[${reviewer.split(':')[0]}] Review unavailable (LLM error).`);
      }
    }

    // Aggregate via geometric median (P17-02 / consensus.ts)
    const medianScore = scores.length > 0 ? judgeWithConsensus(scores) : 0;
    const approved    = medianScore >= 80;

    const councilResult: CouncilResult = {
      approved,
      score: Math.round(medianScore * 100) / 100,
      reasoning: reasonings.join(' | '),
    };

    // Emit COUNCIL_REVIEW socket event so the dashboard can display it
    broadcast('COUNCIL_REVIEW', {
      proposal,
      approved,
      score: councilResult.score,
      reasoning: councilResult.reasoning,
      reviewerScores: scores,
      timestamp: new Date().toISOString(),
    });

    return councilResult;
  }
}
