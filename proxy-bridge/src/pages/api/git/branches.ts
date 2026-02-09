import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  const absoluteProjectPath = path.isAbsolute(projectPath as string)
    ? projectPath as string
    : path.resolve(process.cwd(), '..', projectPath as string);

  try {
    const git = simpleGit(absoluteProjectPath);
    const branchSummary = await git.branchLocal();
    
    res.status(200).json({
      current: branchSummary.current,
      all: branchSummary.all,
      branches: branchSummary.branches
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch branches', details: error.message });
  }
}
