export interface ForgeRepo {
  id: string;
  name: string;
  fullName: string;
  full_name: string; // Alias for frontend
  url: string;
  html_url: string; // Alias for frontend
  description: string;
  isPrivate: boolean;
  forge: 'github' | 'gitlab';
}

export interface ForgeIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
}

export interface ForgeAdapter {
  id: string;
  listRepos(): Promise<ForgeRepo[]>;
  listIssues(owner: string, repo: string): Promise<ForgeIssue[]>;
  createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string): Promise<string>;
}
