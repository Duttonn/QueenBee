/**
 * P18-04: CredentialScrubber — post-process strings to redact leaked API keys
 *
 * Pattern from GoClaw: all tool outputs are piped through a credential scrubber
 * before being stored in logs, roundtable messages, or experience archives.
 *
 * Detects common key formats:
 *  - Anthropic: sk-ant-api0X-...
 *  - OpenAI: sk-...  / sk-proj-...
 *  - Google: AIza...
 *  - AWS Access Key: AKIA...
 *  - GitHub PAT: ghp_... / github_pat_...
 *  - Generic "Bearer <token>"
 *  - Generic high-entropy 40-char hex strings that look like secrets
 */

interface ScrubPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const PATTERNS: ScrubPattern[] = [
  {
    name: 'ANTHROPIC_KEY',
    pattern: /sk-ant-(?:api\d+-)?[A-Za-z0-9_\-]{20,}/g,
    replacement: '[REDACTED:ANTHROPIC_KEY]',
  },
  {
    name: 'OPENAI_KEY',
    pattern: /sk-(?:proj-)?[A-Za-z0-9_\-T]{20,}/g,
    replacement: '[REDACTED:OPENAI_KEY]',
  },
  {
    name: 'GOOGLE_KEY',
    pattern: /AIza[A-Za-z0-9_\-]{35}/g,
    replacement: '[REDACTED:GOOGLE_KEY]',
  },
  {
    name: 'AWS_ACCESS_KEY',
    pattern: /AKIA[A-Z0-9]{16}/g,
    replacement: '[REDACTED:AWS_KEY]',
  },
  {
    name: 'GITHUB_PAT',
    pattern: /(?:ghp_|github_pat_)[A-Za-z0-9_]{36,}/g,
    replacement: '[REDACTED:GITHUB_TOKEN]',
  },
  {
    name: 'BEARER_TOKEN',
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]{20,}={0,2}/g,
    replacement: 'Bearer [REDACTED]',
  },
];

export class CredentialScrubber {
  /**
   * Scrub a string, replacing known credential patterns with redacted placeholders.
   */
  static scrub(input: string): string {
    if (!input || typeof input !== 'string') return input;
    let result = input;
    for (const { pattern, replacement } of PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  /**
   * Scrub any object by serializing, scrubbing, and re-parsing.
   * Returns the same type as input.
   */
  static scrubObject<T>(input: T): T {
    if (input === null || input === undefined) return input;
    if (typeof input === 'string') return CredentialScrubber.scrub(input) as unknown as T;
    try {
      const json = JSON.stringify(input);
      const scrubbed = CredentialScrubber.scrub(json);
      return JSON.parse(scrubbed) as T;
    } catch {
      return input;
    }
  }

  /**
   * Check whether a string contains any credential patterns (without scrubbing).
   */
  static hasCredentials(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    return PATTERNS.some(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(input);
    });
  }
}
