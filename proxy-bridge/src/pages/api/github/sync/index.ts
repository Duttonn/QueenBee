import { NextApiRequest, NextApiResponse } from 'next';
import { githubSyncService } from '../../../../lib/GitHubSyncService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const repos = await githubSyncService.listUserRepos();
      return res.status(200).json(repos);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    const { action, payload } = req.body;

    try {
      switch (action) {
        case 'SYNC_ISSUES':
          const count = await githubSyncService.syncIssuesToTasks(payload.owner, payload.repo, payload.projectPath);
          return res.status(200).json({ success: true, count });
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
