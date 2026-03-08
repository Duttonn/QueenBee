import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[API] GET /api/git/branches - Query:`, req.query);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  // Expand ~ to the home directory before resolving
  let resolvedPath = (projectPath as string).startsWith('~')
    ? (projectPath as string).replace('~', os.homedir())
    : (projectPath as string);

  const absoluteProjectPath = path.resolve(resolvedPath);

  try {
    if (!(await fs.pathExists(absoluteProjectPath))) {
        console.error(`[Branches API] Path does not exist: ${absoluteProjectPath}`);
        return res.status(404).json({ error: 'Project path not found', path: absoluteProjectPath });
    }

    const git = simpleGit(absoluteProjectPath);
    let isRepo: boolean;
    try {
      isRepo = await git.checkIsRepo();
    } catch {
      // If checkIsRepo throws (e.g. git binary not found), treat as non-repo
      console.warn(`[Branches API] checkIsRepo failed for: ${absoluteProjectPath}`);
      return res.status(200).json({ current: 'none', all: [], branches: {}, isNotRepo: true });
    }

    if (!isRepo) {
        console.warn(`[Branches API] Path is not a git repository: ${absoluteProjectPath}`);
        return res.status(200).json({ current: 'none', all: [], branches: {}, isNotRepo: true });
    }

    const branchSummary = await git.branchLocal();
    
    res.status(200).json({
      current: branchSummary.current,
      all: branchSummary.all,
      branches: branchSummary.branches
    });
  } catch (error: any) {
    console.error(`[Branches API] Error for ${absoluteProjectPath}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch branches', details: error.message });
  }
}
