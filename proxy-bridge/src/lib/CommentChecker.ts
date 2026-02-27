/**
 * P18-23: CommentChecker — detect and flag AI-generated comment slop
 *
 * Post-edit hook that checks modified files for common AI-slop comment patterns.
 * Configurable modes:
 *  - 'warn': return list of flagged lines (agent sees them, can choose to fix)
 *  - 'strip': automatically remove flagged comments from file content
 *
 * Pattern from oh-my-opencode comment-checker.
 */

import fs from 'fs-extra';

export type CommentCheckerMode = 'warn' | 'strip';

export interface CommentFinding {
  lineNumber: number;
  content: string;
  pattern: string; // Which pattern matched
}

export interface CommentCheckResult {
  hasSlop: boolean;
  findings: CommentFinding[];
  cleanedContent?: string; // Only set if mode === 'strip'
}

/** Patterns that indicate AI-generated comment slop. */
const SLOP_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // Restating the obvious
  { pattern: /\/\/\s*(This|The)\s+(function|method|class|variable|code)\s+(is|does|handles|processes|returns|creates|updates|deletes)/i, name: 'obvious_description' },
  // "Here we" pattern
  { pattern: /\/\/\s*Here (we|I) (are|will|should|need to|can)/i, name: 'here_we_pattern' },
  // Step descriptions that add no value
  { pattern: /\/\/\s*(Step \d+|First,|Next,|Then,|Finally,|Now we|At this point)\s+we/i, name: 'step_narration' },
  // NOTE: comments that state the obvious
  { pattern: /\/\/\s*NOTE:\s*(This|The)\s+(is|uses|implements|represents|stores)/i, name: 'note_obvious' },
  // TODO with no action (vague deferral)
  { pattern: /\/\/\s*TODO:?\s*(add|improve|handle|fix|update) (more|better|proper|appropriate|comprehensive)/i, name: 'vague_todo' },
  // Summarizing what the code clearly shows
  { pattern: /\/\/\s*(Check if|Verify that|Ensure that|Make sure)\s+.{0,30}(is|are)\s+(not null|defined|valid|correct|proper)/i, name: 'null_check_comment' },
  // "Main logic" or "Core functionality" type headers
  { pattern: /\/\/\s*(Main logic|Core (functionality|implementation)|Primary (logic|function)|Key (logic|function))/i, name: 'vague_header' },
  // Self-referential comments about the comment
  { pattern: /\/\/\s*(This comment|The comment|Note that|Please note|It's worth noting)/i, name: 'meta_comment' },
];

export class CommentChecker {
  private mode: CommentCheckerMode;

  constructor(options: { mode?: CommentCheckerMode } = {}) {
    this.mode = options.mode ?? 'warn';
  }

  /**
   * Check a string of source code for AI-slop comments.
   */
  check(content: string): CommentCheckResult {
    const lines = content.split('\n');
    const findings: CommentFinding[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, name } of SLOP_PATTERNS) {
        if (pattern.test(line.trim())) {
          findings.push({
            lineNumber: i + 1,
            content: line.trim(),
            pattern: name,
          });
          break; // Only report first match per line
        }
      }
    }

    const result: CommentCheckResult = {
      hasSlop: findings.length > 0,
      findings,
    };

    if (this.mode === 'strip' && findings.length > 0) {
      const slopLines = new Set(findings.map(f => f.lineNumber - 1));
      result.cleanedContent = lines
        .filter((_, idx) => !slopLines.has(idx))
        .join('\n');
    }

    return result;
  }

  /**
   * Check a file and optionally strip slop comments.
   */
  async checkFile(absolutePath: string): Promise<CommentCheckResult> {
    if (!(await fs.pathExists(absolutePath))) {
      return { hasSlop: false, findings: [] };
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    const result = this.check(content);

    if (this.mode === 'strip' && result.cleanedContent !== undefined) {
      await fs.writeFile(absolutePath, result.cleanedContent, 'utf-8');
    }

    return result;
  }

  /** Format findings as a human-readable message for the agent. */
  static formatFindings(findings: CommentFinding[]): string {
    if (findings.length === 0) return '';
    return `AI-slop comments detected (${findings.length}):\n` +
      findings.map(f => `  Line ${f.lineNumber}: [${f.pattern}] ${f.content.slice(0, 80)}`).join('\n');
  }
}
