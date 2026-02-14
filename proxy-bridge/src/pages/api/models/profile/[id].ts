import type { NextApiRequest, NextApiResponse } from 'next';
import { createModelProfileRegistry } from '../../../../lib/ModelProfileRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const projectPath = req.query.projectPath as string || process.cwd();
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing profile id' });
  }

  const registry = createModelProfileRegistry(projectPath);
  await registry.initialize();

  if (req.method === 'GET') {
    const profile = await registry.getProfileById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.status(200).json(profile);
  }

  if (req.method === 'PATCH') {
    const updates = req.body;
    const profile = await registry.updateProfile(id, updates);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.status(200).json(profile);
  }

  if (req.method === 'DELETE') {
    const deleted = await registry.deleteProfile(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
