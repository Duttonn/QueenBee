import fs from 'fs-extra';
import { execSync } from 'child_process';
import path from 'path';

export class LocalEnvironmentManager {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Detects and runs setup scripts defined in .codex/config.json or common patterns
   */
  async runSetup() {
    console.log(`[EnvManager] Initializing environment for ${this.projectPath}`);
    
    // 1. Detect Stack
    if (fs.existsSync(path.join(this.projectPath, 'package.json'))) {
      console.log('[EnvManager] Node.js project detected. Running npm install...');
      execSync('npm install', { cwd: this.projectPath, stdio: 'inherit' });
    } else if (fs.existsSync(path.join(this.projectPath, 'requirements.txt'))) {
      console.log('[EnvManager] Python project detected. Setting up venv...');
      execSync('python3 -m venv .venv && ./ .venv/bin/pip install -r requirements.txt', { cwd: this.projectPath, stdio: 'inherit' });
    }

    // 2. Run custom .codex/setup.sh if exists
    const customSetup = path.join(this.projectPath, '.codex', 'setup.sh');
    if (fs.existsSync(customSetup)) {
      console.log('[EnvManager] Running custom .codex/setup.sh');
      execSync(`bash ${customSetup}`, { cwd: this.projectPath, stdio: 'inherit' });
    }
  }
}
