import fs from 'fs-extra';
import path from 'path';

/**
 * SecurityAuditAgent: Autonomous worker that prevents accidental credential leakage.
 */
export class SecurityAuditAgent {
  private sensitivePatterns = [
    /nvapi-[a-zA-Z0-9]{32,}/g,      // NVIDIA API Keys
    /AIzaSy[a-zA-Z0-9_-]{33}/g,     // Google AI Keys
    /sk-[a-zA-Z0-9]{48}/g,          // Generic OpenAI keys
    /session_sda=[a-f0-9-]{36}/g,   // Dassault Session Cookies
    /ghp_[a-zA-Z0-9]{36}/g,         // GitHub PATs
    /AKIA[0-9A-Z]{16}/g,            // AWS Access Keys
    /sk_live_[a-zA-Z0-9]{24,}/g,    // Stripe Live Keys
    /(?:password|passwd|secret)\s*[:=]\s*['"][^'"]{8,}/gi, // Generic passwords
    /(?:postgres|mysql|mongodb):\/\/[^\s'"]+/gi,           // Database URLs
    /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,      // Private SSH keys
    /(?:jwt_secret|JWT_SECRET)\s*[:=]\s*['"][^'"]+/gi      // JWT secrets
  ];

  async auditProject(projectPath: string) {
    console.log(`[Security] Auditing project: ${projectPath}`);
    const findings = [];
    
    // We only audit files that are staged or recently modified to be efficient
    const files = await this.listTrackedFiles(projectPath);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      for (const pattern of this.sensitivePatterns) {
        if (content.match(pattern)) {
          findings.push({
            file: path.relative(projectPath, file),
            risk: 'CRITICAL',
            type: 'Credential Leak Detected',
            pattern: pattern.toString()
          });
        }
      }
    }

    return findings;
  }

  private async listTrackedFiles(dir: string): Promise<string[]> {
    // Only audit staged files (files about to be committed)
    const { execSync } = require('child_process');
    const exts = ['.ts', '.js', '.yaml', '.json', '.md', '.env'];
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
        cwd: dir,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return output
        .split('\n')
        .filter((f: string) => f.trim() && exts.some(e => f.endsWith(e)))
        .map((f: string) => path.join(dir, f.trim()));
    } catch {
      // If git fails (e.g. not a repo), return empty — don't block the commit
      return [];
    }
  }
}
