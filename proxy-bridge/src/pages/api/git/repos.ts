import type { NextApiRequest, NextApiResponse } from 'next';
import { UniversalForgeAdapter } from '../../../lib/ForgeAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const forge = new UniversalForgeAdapter();
  const githubUser = req.query.githubUser as string;

  try {
    const [githubRepos, gitlabRepos] = await Promise.all([
      githubUser ? forge.listGitHubRepos(githubUser) : Promise.resolve([]),
      forge.listGitLabRepos()
    ]);

    return res.status(200).json({
      github: githubRepos,
      gitlab: gitlabRepos,
      all: [...githubRepos, ...gitlabRepos]
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
