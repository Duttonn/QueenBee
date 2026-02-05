import { execSync } from 'child_process';

export interface ForgeProject {
  id: string;
  name: string;
  url: string;
  forge: 'github' | 'gitlab';
}

export class UniversalForgeAdapter {
  async listGitHubRepos(): Promise<ForgeProject[]> {
    try {
      const output = execSync('gh repo list --limit 50 --json id,name,url').toString();
      return JSON.parse(output).map((r: any) => ({ ...r, forge: 'github' }));
    } catch (e) { return []; }
  }

  async listGitLabRepos(): Promise<ForgeProject[]> {
    try {
      const output = execSync('glab repo list --limit 50 --json id,path_with_namespace,web_url').toString();
      return JSON.parse(output).map((r: any) => ({
        id: r.id,
        name: r.path_with_namespace,
        url: r.web_url,
        forge: 'gitlab'
      }));
    } catch (e) { return []; }
  }
}
