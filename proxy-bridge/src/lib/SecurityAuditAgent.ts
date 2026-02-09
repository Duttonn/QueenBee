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
    // Audit core source and config files
    const exts = ['.ts', '.js', '.yaml', '.json', '.md', '.env'];
    const results: string[] = [];
    const walk = (d: string) => {
      if (d.includes('node_modules') || d.includes('.git')) return;
      const list = fs.readdirSync(d);
      for (const item of list) {
        const p = path.join(d, item);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) walk(p);
        else if (exts.some(e => p.endsWith(e))) results.push(p);
      }
    };
    walk(dir);
    return results;
  }
}
