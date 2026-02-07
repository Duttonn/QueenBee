import { Octokit } from '@octokit/rest';
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { RepoClonerService } from './RepoClonerService';
import { ProjectTaskManager } from './ProjectTaskManager';

export class GitHubSyncService {
  private octokit: Octokit | null = null;
  private cloner: RepoClonerService;

  constructor() {
    this.cloner = new RepoClonerService();
    this.initialize();
  }

  private async initialize() {
    const tokenPath = Paths.getGitHubTokenPath();
    if (await fs.pathExists(tokenPath)) {
      const { token } = await fs.readJson(tokenPath);
      this.octokit = new Octokit({ auth: token });
    }
  }

  async listUserRepos() {
    if (!this.octokit) throw new Error('GitHub not authenticated');
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50
    });
    return data.map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description,
      isPrivate: repo.private
    }));
  }

  async syncIssuesToTasks(owner: string, repo: string, projectPath: string) {
    if (!this.octokit) throw new Error('GitHub not authenticated');
    const { data: issues } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open'
    });

    const ptm = new ProjectTaskManager(projectPath);
    for (const issue of issues) {
      if (issue.pull_request) continue; // Skip PRs
      
      const taskId = `GH-${issue.number}`;
      const description = `[GitHub Issue] ${issue.title} - ${issue.html_url}`;
      await ptm.addTask('PHASE 2: FEATURES', taskId, description);
    }

    return issues.length;
  }
}

export const githubSyncService = new GitHubSyncService();