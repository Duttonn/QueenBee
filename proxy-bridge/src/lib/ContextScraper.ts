import fs from 'fs-extra';
import path from 'path';

/**
 * ContextScraper: The "Reconnaissance" eye of the Queen Bee.
 * Scans directories for semantic context (READMEs, TODOs, Schemas).
 */
export class ContextScraper {
  async scrape(projectPath: string) {
    const findings: any = {
      readme: '',
      todos: [],
      techStack: []
    };

    // 1. Extract README
    const readmePath = path.join(projectPath, 'README.md');
    if (await fs.pathExists(readmePath)) {
      findings.readme = (await fs.readFile(readmePath, 'utf-8')).substring(0, 2000);
    }

    // 2. Identify TODOs in code
    const files = await this.listRelevantFiles(projectPath);
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('TODO:') || line.includes('FIXME:')) {
          findings.todos.push({ file: path.relative(projectPath, file), line: idx + 1, text: line.trim() });
        }
      });
    }

    return findings;
  }

  private async listRelevantFiles(dir: string): Promise<string[]> {
    // Simple recursive scan limiting depth for efficiency
    return []; // Logic to be expanded by Gamma Agent
  }
}
