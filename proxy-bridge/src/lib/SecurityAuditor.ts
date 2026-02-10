export interface AuditResult {
  safe: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: string[];
  remediation?: string;
}

export class SecurityAuditor {
  private static DANGEROUS_PATTERNS = [
    { pattern: /rm\s+-(?:r|f|rf|fr)*r(?:r|f|rf|fr)*f(?:r|f|rf|fr)*|rm\s+-(?:r|f|rf|fr)*f(?:r|f|rf|fr)*r(?:r|f|rf|fr)*|rm\s+-rf|rm\s+-fr|rm\s+-r\s+-f|rm\s+-f\s+-r/, message: 'Recursive deletion (rm -rf) is prohibited.', level: 'critical' },
    { pattern: /rm\s+-r(?!\s+[^f])/, message: 'Recursive deletion (rm -r) is prohibited.', level: 'high' },
    { pattern: /mkfs/, message: 'Filesystem formatting command detected.', level: 'critical' },
    { pattern: /dd\s+if=/, message: 'Low-level disk write (dd) detected.', level: 'high' },
    { pattern: />\s*\/dev\/sd/, message: 'Attempt to write directly to a disk device.', level: 'critical' },
    { pattern: /curl.*\|\s*bash/, message: 'Piping remote content directly to bash is highly risky.', level: 'high' },
    { pattern: /wget.*\|\s*bash/, message: 'Piping remote content directly to bash is highly risky.', level: 'high' },
    { pattern: /:\(\)\{.*:\|:&\};:/, message: 'Fork bomb pattern detected.', level: 'critical' },
  ];

  private static SECRET_PATTERNS = [
    { pattern: /AIza[0-9A-Za-z-_]{35}/, message: 'Possible Google API Key detected.', level: 'high' },
    { pattern: /sk-[a-zA-Z0-9]{48}/, message: 'Possible OpenAI API Key detected.', level: 'high' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, message: 'Possible GitHub Personal Access Token detected.', level: 'high' },
    { pattern: /ey[a-zA-Z0-9-_]+\.ey[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/, message: 'Possible JWT detected.', level: 'medium' },
  ];

  /**
   * Audits a command before execution.
   */
  static async auditCommand(command: string): Promise<AuditResult> {
    const findings: string[] = [];
    let riskLevel: AuditResult['riskLevel'] = 'low';

    // 1. Check for dangerous shell patterns
    for (const { pattern, message, level } of this.DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        findings.push(message);
        riskLevel = this.maxRisk(riskLevel, level as any);
      }
    }

    // 2. Check for secrets leaking into logs/history
    for (const { pattern, message, level } of this.SECRET_PATTERNS) {
      if (pattern.test(command)) {
        findings.push(message);
        riskLevel = this.maxRisk(riskLevel, level as any);
      }
    }

    const safe = riskLevel !== 'critical' && riskLevel !== 'high';

    return {
      safe,
      riskLevel,
      findings,
      remediation: safe ? undefined : 'Command blocked by SecurityAuditor. Please use a safer approach or redact secrets.'
    };
  }

  /**
   * Audits content (like file content) for secrets.
   */
  static async auditContent(content: string): Promise<AuditResult> {
    const findings: string[] = [];
    let riskLevel: AuditResult['riskLevel'] = 'low';

    for (const { pattern, message, level } of this.SECRET_PATTERNS) {
      if (pattern.test(content)) {
        findings.push(message);
        riskLevel = this.maxRisk(riskLevel, level as any);
      }
    }

    const safe = riskLevel !== 'critical' && riskLevel !== 'high';

    return {
      safe,
      riskLevel,
      findings,
      remediation: safe ? undefined : 'Content blocked by SecurityAuditor. Possible secret leak detected.'
    };
  }

  private static maxRisk(a: AuditResult['riskLevel'], b: AuditResult['riskLevel']): AuditResult['riskLevel'] {
    const weights = { low: 0, medium: 1, high: 2, critical: 3 };
    return weights[a] >= weights[b] ? a : b;
  }
}
