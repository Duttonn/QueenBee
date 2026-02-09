import { NextApiRequest, NextApiResponse } from 'next';
import { UniversalForgeAdapter } from '../../../lib/ForgeAdapter';
import { GitLabAdapter } from '../../../lib/forges/GitLabAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  try {
    if (token) {
      console.log('[API] Using GitLabAdapter with token');
      const adapter = new GitLabAdapter(token);
      const repos = await adapter.listRepos();
      return res.status(200).json(repos);
    } else {
      console.log('[API] Using UniversalForgeAdapter (CLI fallback)');
      const forge = new UniversalForgeAdapter();
      const repos = await forge.listGitLabRepos();
      return res.status(200).json(repos);
    }
  } catch (error: any) {
    console.error('GitLab repos fetch failed:', error);
    return res.status(500).json({ error: 'Failed to fetch GitLab repositories', details: error.message });
  }
}
