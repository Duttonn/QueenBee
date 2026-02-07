import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { Paths } from '../../../lib/Paths';
import { GitHubAdapter } from '../../../lib/forges/GitHubAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { treePath, repoPath, prTitle, prBody } = req.body;

  if (!treePath || !repoPath) {
    return res.status(400).json({ error: 'treePath and repoPath are required' });
  }

  try {
    const git = simpleGit(treePath);
    
    // 1. Check if there are changes to commit
    const status = await git.status();
    if (status.files.length > 0) {
      await git.add('.');
      await git.commit(prTitle || 'Agent implementation');
    }

    // 2. Get the current branch
    const branchResult = await git.branchLocal();
    const branchName = branchResult.current;

    // 3. Push to origin
    console.log(`[Ship] Pushing branch ${branchName} to origin...`);
    await git.push('origin', branchName);

    // 4. Create Pull Request using ForgeAdapter
    // For the prototype, we use the first GitHub token found
    const tokenPath = Paths.getGitHubTokenPath();
    if (await fs.pathExists(tokenPath)) {
      const { token } = await fs.readJson(tokenPath);
      const adapter = new GitHubAdapter(token);
      
      // Extract owner/repo from repoPath or project name
      // Mocking owner/repo for now
      const repoName = repoPath.split('/').pop() || 'QueenBee';
      const owner = 'Duttonn'; // Mock owner

      const prUrl = await adapter.createPullRequest(owner, repoName, prTitle, branchName, 'main', prBody);
      
      return res.status(200).json({ success: true, prUrl });
    }

    return res.status(200).json({ success: true, message: 'Branch pushed, but no forge adapter available for PR creation.' });

  } catch (error: any) {
    console.error('[Ship] Failed:', error);
    return res.status(500).json({ error: String(error) });
  }
}
