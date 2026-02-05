import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectPath, filePath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  try {
    // We call our Python extractor for the heavy lifting of parsing
    import path from 'path';
    const scriptPath = path.join(process.cwd(), 'src/lib/git_diff_extractor.py');
    const output = execSync(`python3 ${scriptPath} ${projectPath} ${filePath || ''}`).toString();
    
    const diffData = JSON.parse(output);
    
    // Optional: Get Queen Bee explanation here by passing the diff to an LLM
    // const explanation = await getQueenBeeExplanation(diffData);
    // diffData.explanation = explanation;

    res.status(200).json(diffData);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to extract diff', details: error.message });
  }
}
