import type { NextApiRequest, NextApiResponse } from 'next';
import { PolicyStore } from '../../lib/PolicyStore';
import { withLogging } from '../../lib/api-utils';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectPath = req.query.projectPath as string || (req.body as any)?.projectPath;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  const policyStore = new PolicyStore(projectPath);

  if (req.method === 'GET') {
    try {
      const policies = await policyStore.getAll();
      return res.status(200).json(policies);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch policies', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key is required' });
      await policyStore.set(key, value);
      return res.status(200).json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update policy', details: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLogging(handler);
