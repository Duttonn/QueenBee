import type { NextApiRequest, NextApiResponse } from 'next';
import { createModelProfileRegistry } from '../../../lib/ModelProfileRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectPath = req.query.projectPath as string || process.cwd();
  const registry = createModelProfileRegistry(projectPath);
  
  await registry.initialize();

  if (req.method === 'GET') {
    const config = await registry.getConfig();
    return res.status(200).json(config);
  }

  if (req.method === 'POST') {
    const { complexityRouting, fallbackEnabled } = req.body;
    
    if (typeof complexityRouting === 'boolean') {
      await registry.setComplexityRouting(complexityRouting);
    }
    if (typeof fallbackEnabled === 'boolean') {
      await registry.setFallbackEnabled(fallbackEnabled);
    }
    
    const config = await registry.getConfig();
    return res.status(200).json(config);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
