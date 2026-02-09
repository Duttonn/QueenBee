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
      console.log('[API] Using GitHubAdapter with token');
      const adapter = new GitHubAdapter(token);
      const repos = await adapter.listRepos();
      return res.status(200).json(repos);
    } else {
      console.log('[API] Using UniversalForgeAdapter (CLI fallback)');
      const forge = new UniversalForgeAdapter();
      const user = (req.query.user as string) || ""; 
      const repos = await forge.listGitHubRepos(user);
      return res.status(200).json(repos);
    }
  } catch (error: any) {
    console.error('GitHub repos fetch failed:', error);
    return res.status(500).json({ error: 'Failed to fetch GitHub repositories', details: error.message });
  }
}
