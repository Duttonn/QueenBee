import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import path from 'path';
import { Paths } from '../../../lib/Paths';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectPath, filePath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  // Security: Resolve path to absolute. If relative, assume it's from the project root.
  const absoluteProjectPath = path.isAbsolute(projectPath as string) 
    ? projectPath as string 
    : path.resolve(Paths.getWorkspaceRoot(), projectPath as string);

  try {
    // We call our Python extractor for the heavy lifting of parsing
    const scriptPath = path.join(Paths.getProxyBridgeRoot(), 'src/lib/git_diff_extractor.py');
    const output = execSync(`python3 "${scriptPath}" "${absoluteProjectPath}" "${filePath || ''}"`).toString();
    
    const diffData = JSON.parse(output);
    
    if (diffData.status === 'error') {
        return res.status(500).json({ error: diffData.message });
    }

    res.status(200).json(diffData);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to extract diff', details: error.message });
  }
}
