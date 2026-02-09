import { NextApiRequest, NextApiResponse } from 'next';
import { UniversalForgeAdapter } from '../../../lib/ForgeAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const forge = new UniversalForgeAdapter();

  try {
    const repos = await forge.listGitLabRepos();
    return res.status(200).json(repos);
  } catch (error: any) {
    console.error('GitLab repos fetch failed:', error);
    return res.status(500).json({ error: 'Failed to fetch GitLab repositories', details: error.message });
  }
}
