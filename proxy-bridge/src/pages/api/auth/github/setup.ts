
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.queenbee');
const GITHUB_CREDS_FILE = path.join(CONFIG_DIR, 'github-oauth.json');

function isLocalRequest(req: NextApiRequest): boolean {
    const host = req.headers.host || '';
    const remoteAddr = (req.socket as any).remoteAddress || '';
    const localHosts = ['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const hostName = host.split(':')[0];
    return localHosts.includes(hostName) || localHosts.includes(remoteAddr);
}

async function validateGitHubCredentials(clientId: string, clientSecret: string): Promise<boolean> {
    try {
        const res = await fetch(`https://api.github.com/applications/${clientId}`, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
                'Accept': 'application/vnd.github+json',
            },
        });
        return res.status !== 401;
    } catch {
        return false;
    }
}

/**
 * Validates and saves GitHub OAuth credentials securely
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!isLocalRequest(req)) {
        return res.status(403).json({ error: 'Credential setup is only allowed from localhost' });
    }

    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'Missing credentials' });
    }

    if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
        return res.status(400).json({ error: 'Credentials must be strings' });
    }

    try {
        // Validate credentials against GitHub API before storing
        const valid = await validateGitHubCredentials(clientId, clientSecret);
        if (!valid) {
            return res.status(400).json({ error: 'Invalid GitHub credentials. Verification with GitHub API failed.' });
        }

        // Store in secure config directory instead of process.env
        await fs.ensureDir(CONFIG_DIR);
        await fs.writeJson(GITHUB_CREDS_FILE, {
            clientId,
            clientSecret,
            updatedAt: new Date().toISOString()
        }, { mode: 0o600 });

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Failed to save credentials:', error);
        return res.status(500).json({
            error: 'Failed to save credentials',
            message: error.message
        });
    }
}
