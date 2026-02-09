import { NextApiRequest, NextApiResponse } from 'next';
import { UniversalForgeAdapter } from '../../../lib/ForgeAdapter';
import { GitHubAdapter } from '../../../lib/forges/GitHubAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  try {
    if (token) {
      console.log('[API] Fetching GitHub repos using Octokit (token provided)');
      const adapter = new GitHubAdapter(token);
      const repos = await adapter.listRepos();
      console.log(`[API] GitHubAdapter found ${repos.length} repos`);
      return res.status(200).json(repos);
    } else {
      console.log('[API] No GitHub token found in headers. Falling back to CLI.');
      const forge = new UniversalForgeAdapter();
      const user = (req.query.user as string) || ""; 
      const repos = await forge.listGitHubRepos(user);
      console.log(`[API] UniversalForgeAdapter (CLI) found ${repos.length} repos`);
      return res.status(200).json(repos);
    }
  } catch (error: any) {
    console.error('[API] GitHub repos fetch failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch GitHub repositories', details: error.message });
  }
}
