
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';

/**
 * Validates and saves GitHub OAuth credentials to the .env.local file
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'Missing credentials' });
    }

    try {
        const envPath = path.join(process.cwd(), '.env.local');

        // Read existing env file if it exists
        let envContent = '';
        if (await fs.pathExists(envPath)) {
            envContent = await fs.readFile(envPath, 'utf-8');
        }

        // Update or append variables
        const newLines: string[] = [];
        const lines = envContent.split('\n');

        let foundId = false;
        let foundSecret = false;

        for (const line of lines) {
            if (line.startsWith('GITHUB_CLIENT_ID=')) {
                newLines.push(`GITHUB_CLIENT_ID=${clientId}`);
                foundId = true;
            } else if (line.startsWith('GITHUB_CLIENT_SECRET=')) {
                newLines.push(`GITHUB_CLIENT_SECRET=${clientSecret}`);
                foundSecret = true;
            } else {
                newLines.push(line);
            }
        }

        if (!foundId) newLines.push(`GITHUB_CLIENT_ID=${clientId}`);
        if (!foundSecret) newLines.push(`GITHUB_CLIENT_SECRET=${clientSecret}`);

        // Write back to file
        await fs.writeFile(envPath, newLines.join('\n').trim() + '\n');

        // Also update current process env so restart isn't strictly necessary for *this* process
        // (though Next.js dev server might need restart to pick up .env changes reliably)
        process.env.GITHUB_CLIENT_ID = clientId;
        process.env.GITHUB_CLIENT_SECRET = clientSecret;

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Failed to save credentials:', error);
        return res.status(500).json({
            error: 'Failed to save credentials',
            message: error.message
        });
    }
}
