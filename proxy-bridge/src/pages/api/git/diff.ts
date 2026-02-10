import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectPath, filePath, staged } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  // Security: Resolve path to absolute. If relative, assume it's from the project root.
  const absoluteProjectPath = path.isAbsolute(projectPath as string) 
    ? projectPath as string 
    : path.resolve(process.cwd(), '..', projectPath as string);

  try {
    // We call our Python extractor for the heavy lifting of parsing
    const scriptPath = path.join(process.cwd(), 'src/lib/git_diff_extractor.py');
    const cachedFlag = staged === 'true' ? '--cached' : '';
    
    // BP-14: Increase maxBuffer to 10MB to handle larger diffs/untracked files
    const output = execSync(`python3 "${scriptPath}" "${absoluteProjectPath}" "${filePath || ''}" ${cachedFlag}`, {
        maxBuffer: 10 * 1024 * 1024
    }).toString();
    
    let diffData;
    try {
        diffData = JSON.parse(output);
    } catch (parseError) {
        console.error('[DiffAPI] Failed to parse script output as JSON:', output.substring(0, 500));
        return res.status(500).json({ error: 'Internal script error: invalid JSON output' });
    }
    
    if (diffData.status === 'error') {
        return res.status(500).json({ error: diffData.message });
    }

    res.status(200).json(diffData);
  } catch (error: any) {
    console.error('[DiffAPI] execSync error:', error.message);
    res.status(500).json({ error: 'Failed to extract diff', details: error.message });
  }
}
