import { execSync } from 'child_process';

/**
 * Universal Forge Adapter
 * Handles communication with GitHub (gh) and GitLab (glab) CLIs.
 */
export class UniversalForgeAdapter {
  
  async listGitHubRepos(user: string): Promise<any[]> {
    try {
      const output = execSync(`gh repo list ${user} --limit 50 --json name,url,description,sshUrl`).toString();
      return JSON.parse(output).map((r: any) => ({ ...r, forge: 'github' }));
    } catch (e) {
      console.error('[Forge] GitHub scan failed:', e);
      return [];
    }
  }

  async cloneProject(repoUrl: string, targetPath: string): Promise<boolean> {
    try {
      console.log(`[Forge] Cloning ${repoUrl} to ${targetPath}...`);
      execSync(`git clone ${repoUrl} ${targetPath}`, { stdio: 'inherit' });
      return true;
    } catch (e) {
      console.error('[Forge] Clone failed:', e);
      return false;
    }
  }

  async createPR(repoPath: string, title: string, body: string): Promise<string | null> {
    try {
      const output = execSync(`gh pr create --title "${title}" --body "${body}"`, { cwd: repoPath }).toString();
      return output.trim();
    } catch (e) {
      console.error('[Forge] PR creation failed:', e);
      return null;
    }
  }
}
