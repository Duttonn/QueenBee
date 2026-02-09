import { execSync } from 'child_process';

export interface ForgeRepository {
  name: string;
  url: string;
  sshUrl: string;
  description: string;
  forge: 'github' | 'gitlab';
}

/**
 * Universal Forge Adapter
 * Handles communication with GitHub (gh) and GitLab (glab) CLIs.
 */
export class UniversalForgeAdapter {
  
  async listGitHubRepos(user: string): Promise<ForgeRepository[]> {
    try {
      const output = execSync(`gh repo list ${user} --limit 50 --json name,url,description,sshUrl`).toString();
      return JSON.parse(output).map((r: any) => ({ ...r, forge: 'github' as const }));
    } catch (e) {
      console.error('[Forge] GitHub scan failed:', e);
      return [];
    }
  }

  async listGitLabRepos(): Promise<ForgeRepository[]> {
    try {
      // glab repo list returns a different format
      const output = execSync(`glab repo list --per-page 50`).toString();
      // Parsing glab output is trickier as it's not JSON by default in older versions
      // But newer versions support JSON
      try {
        const jsonOutput = execSync(`glab repo list --per-page 50 --json`).toString();
        return JSON.parse(jsonOutput).map((r: any) => ({
          name: r.name,
          url: r.web_url,
          sshUrl: r.ssh_url_to_repo,
          description: r.description,
          forge: 'gitlab' as const
        }));
      } catch (e) {
        // Fallback or handle error
        console.warn('[Forge] GitLab JSON output failed, trying legacy parse');
        return [];
      }
    } catch (e) {
      console.error('[Forge] GitLab scan failed:', e);
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
      // Detect forge type
      const remoteUrl = execSync(`git remote get-url origin`, { cwd: repoPath }).toString().toLowerCase();
      
      if (remoteUrl.includes('gitlab')) {
        console.log('[Forge] Detected GitLab repository. Creating Merge Request...');
        const output = execSync(`glab mr create --title "${title}" --description "${body}" --yes`, { cwd: repoPath }).toString();
        return output.trim();
      } else {
        console.log('[Forge] Detected GitHub repository. Creating Pull Request...');
        const output = execSync(`gh pr create --title "${title}" --body "${body}"`, { cwd: repoPath }).toString();
        return output.trim();
      }
    } catch (e) {
      console.error('[Forge] PR/MR creation failed:', e);
      return null;
    }
  }
}