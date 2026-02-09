import { ForgeAdapter, ForgeRepo, ForgeIssue } from './ForgeAdapter';

export class GitLabAdapter implements ForgeAdapter {
  id = 'gitlab';
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl: string = 'https://gitlab.com/api/v4') {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  async listRepos(): Promise<ForgeRepo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects?membership=true&simple=true&per_page=50`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitLab API failed: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return (data as any[]).map(r => ({
        id: String(r.id),
        name: r.name,
        fullName: r.path_with_namespace,
        full_name: r.path_with_namespace,
        url: r.web_url,
        html_url: r.web_url,
        description: r.description || '',
        isPrivate: r.visibility === 'private',
        forge: 'gitlab'
      }));
    } catch (e) {
      console.error('[GitLabAdapter] listRepos failed:', e);
      return [];
    }
  }

  async listIssues(owner: string, repo: string): Promise<ForgeIssue[]> {
    console.log('[GitLabAdapter] listIssues not fully implemented');
    return [];
  }

  async createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string): Promise<string> {
    console.log('[GitLabAdapter] createPullRequest not fully implemented');
    return 'https://gitlab.com/not-implemented';
  }
}
