import { NextApiRequest, NextApiResponse } from 'next';
import { UniversalForgeAdapter } from '../../../lib/ForgeAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const forge = new UniversalForgeAdapter();
  // If user param is provided, use it. Otherwise, defaults to empty string which might need handling in adapter 
  // or we pass undefined/null and let adapter handle it.
  // Looking at adapter: `gh repo list ${user} ...` -> if user is undefined, it becomes "undefined" string?
  // Let's modify adapter or pass "" if undefined.
  
  // Actually, standard `gh repo list` with no args lists your own repos.
  // But the adapter does `${user}`.
  // If I pass "", it becomes `gh repo list  ...` (double space) which is fine.
  
  const user = (req.query.user as string) || ""; 

  try {
    const repos = await forge.listGitHubRepos(user);
    return res.status(200).json(repos);
  } catch (error: any) {
    console.error('GitHub repos fetch failed:', error);
    return res.status(500).json({ error: 'Failed to fetch GitHub repositories', details: error.message });
  }
}
