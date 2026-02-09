import { Octokit } from '@octokit/rest';
import { ForgeAdapter, ForgeRepo, ForgeIssue } from './ForgeAdapter';

export class GitHubAdapter implements ForgeAdapter {
  id = 'github';
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async listRepos(): Promise<ForgeRepo[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50
    });
    return data.map(repo => ({
      id: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      full_name: repo.full_name,
      url: repo.html_url,
      html_url: repo.html_url,
      description: repo.description || '',
      isPrivate: repo.private,
      forge: 'github'
    }));
  }

  async listIssues(owner: string, repo: string): Promise<ForgeIssue[]> {
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open'
    });
    return data.filter(i => !i.pull_request).map(issue => ({
      id: String(issue.id),
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      url: issue.html_url
    }));
  }

  async createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string): Promise<string> {
    const { data } = await this.octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body
    });
    return data.html_url;
  }
}
