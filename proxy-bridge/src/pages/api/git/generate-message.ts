import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import { unifiedLLMService } from '../../../lib/UnifiedLLMService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectPath, files } = req.body;

  if (!projectPath || !files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const git = simpleGit(projectPath);
    
    // Check if it's a git repo first
    const isRepo = await git.checkIsRepo().catch(() => false);
    if (!isRepo) {
        return res.status(200).json({ message: `chore: update ${files.length} files` });
    }

    // Get diff for selected files
    // We limit the diff size to avoid token limits
    // We use catch to handle cases where HEAD might not exist or files are invalid
    const diff = await git.diff(['HEAD', '--', ...files]).catch(async (err) => {
        // If HEAD fails (new repo), try just the files
        return await git.diff(['--', ...files]).catch(() => '');
    });
    
    if (!diff) {
        return res.status(200).json({ message: `chore: update ${files.length} files` });
    }

    const truncatedDiff = diff.length > 5000 ? diff.substring(0, 5000) + '...(truncated)' : diff;

    const prompt = `You are a semantic commit message generator. 
    Analyze the following git diff and generate a concise, conventional commit message.
    Format: <type>(<scope>): <subject>
    
    Rules:
    1. Use Conventional Commits (feat, fix, docs, style, refactor, perf, test, chore).
    2. Keep subject under 50 chars.
    3. Be specific about what changed.
    4. Do not include body or footer, just the header line.
    5. Output ONLY the message string.

    Diff:
    ${truncatedDiff}`;

    try {
        const response = await unifiedLLMService.chat('auto', [{ role: 'user', content: prompt }], {
            temperature: 0.2,
            maxTokens: 60
        });

        const message = response.content.trim().replace(/^["']|["']$/g, ''); // Remove quotes if LLM adds them
        res.status(200).json({ message });

    } catch (llmError: any) {
        console.warn('LLM generation failed, falling back to default message:', llmError.message);
        // Fallback message
        const fileCount = files.length;
        const noun = fileCount === 1 ? 'file' : 'files';
        const fallback = `chore: update ${fileCount} ${noun}`;
        res.status(200).json({ message: fallback });
    }

  } catch (error: any) {
    console.error('Commit generation failed:', error);
    res.status(500).json({ error: error.message });
  }
}
