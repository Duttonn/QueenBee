
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

const CONFIG_DIR = Paths.getQueenBeeConfigDir();
const TOKEN_FILE = path.join(CONFIG_DIR, 'github-token.json');

export async function saveToken(token: string) {
    await fs.ensureDir(CONFIG_DIR);
    // Set explicit mode for security (600: only owner can read/write)
    await fs.writeJson(TOKEN_FILE, { token, updatedAt: new Date().toISOString() }, { mode: 0o600 });
}

export async function getToken(): Promise<string | null> {
    try {
        if (!await fs.pathExists(TOKEN_FILE)) {
            return null;
        }
        const data = await fs.readJson(TOKEN_FILE);
        return data.token;
    } catch (error) {
        console.error('Failed to read token:', error);
        return null;
    }
}

export async function deleteToken() {
    try {
        if (await fs.pathExists(TOKEN_FILE)) {
            await fs.remove(TOKEN_FILE);
        }
    } catch (error) {
        console.error('Failed to delete token:', error);
    }
}
