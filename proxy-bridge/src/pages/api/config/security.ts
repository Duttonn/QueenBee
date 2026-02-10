import { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_COMMANDS = [
    'git', 'npm', 'npx', 'node', 'python3', 'python', 'ls', 'cat', 'head', 'tail',
    'mkdir', 'cp', 'mv', 'rm', 'touch', 'echo', 'grep', 'find', 'wc', 'diff',
    'tsc', 'eslint', 'prettier', 'jest', 'vitest', 'cargo', 'go', 'make', 'cd',
    'pwd', 'which', 'env', 'sort', 'uniq', 'sed', 'awk', 'tr', 'chmod',
    'bash', 'sh'
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    return res.status(200).json({ allowedCommands: ALLOWED_COMMANDS });
}
