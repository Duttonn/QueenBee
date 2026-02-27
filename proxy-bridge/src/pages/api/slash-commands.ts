import type { NextApiRequest, NextApiResponse } from 'next';
import { SlashCommandRegistry } from '../../lib/SlashCommandRegistry';
import { withLogging } from '../../lib/api-utils';

/**
 * P19-14: Slash Commands API
 *
 * GET /api/slash-commands?prefix=X&projectPath=Y
 *   → SlashCommand[]  (array of commands whose name starts with `prefix`)
 *
 * Called by the ComposerBar to populate autocomplete suggestions.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const prefix = ((req.query.prefix as string) ?? '').trim();
  const projectPath = (req.query.projectPath as string) || undefined;

  try {
    const commands = await SlashCommandRegistry.getCompletions(prefix, projectPath);
    return res.status(200).json(commands);
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: 'Failed to load slash commands', details: error.message });
  }
}

export default withLogging(handler);
