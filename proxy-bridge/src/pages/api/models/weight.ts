import type { NextApiRequest, NextApiResponse } from 'next';
import { createModelProfileRegistry } from '../../../lib/ModelProfileRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, weight } = req.body;
  const projectPath = req.query.projectPath as string || process.cwd();
  
  if (!id || weight === undefined) {
    return res.status(400).json({ error: 'Missing id or weight' });
  }

  const registry = createModelProfileRegistry(projectPath);
  await registry.initialize();
  
  await registry.setWeight(id, weight);
  
  const config = await registry.getConfig();
  return res.status(200).json(config);
}
