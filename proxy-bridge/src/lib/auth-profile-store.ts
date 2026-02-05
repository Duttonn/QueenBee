
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.queenbee');
const PROFILES_FILE = path.join(CONFIG_DIR, 'auth-profiles.json');

export type AuthMode = 'api_key' | 'oauth' | 'token';

export interface AuthProfile {
    id: string; // e.g., "google:default"
    provider: string; // e.g., "google", "anthropic"
    mode: AuthMode;
    // OAuth fields
    access?: string;
    refresh?: string;
    expires?: number;
    accountId?: string;
    // API Key fields
    apiKey?: string;
    // Token fields (static)
    token?: string;
}

export interface AuthProfileStoreData {
    version: number;
    profiles: Record<string, AuthProfile>;
}

export class AuthProfileStore {
    static async getStore(): Promise<AuthProfileStoreData> {
        try {
            await fs.ensureDir(CONFIG_DIR);

            if (!await fs.pathExists(PROFILES_FILE)) {
                const initial: AuthProfileStoreData = { version: 1, profiles: {} };
                await fs.writeJson(PROFILES_FILE, initial, { mode: 0o600 });
                return initial;
            }

            return await fs.readJson(PROFILES_FILE);
        } catch (error) {
            console.error('Failed to read auth profiles:', error);
            return { version: 1, profiles: {} };
        }
    }

    static async saveStore(data: AuthProfileStoreData) {
        await fs.ensureDir(CONFIG_DIR);
        await fs.writeJson(PROFILES_FILE, data, { mode: 0o600, spaces: 2 });
    }

    static async getProfile(profileId: string): Promise<AuthProfile | undefined> {
        const store = await this.getStore();
        return store.profiles[profileId];
    }

    static async saveProfile(profile: AuthProfile) {
        const store = await this.getStore();
        store.profiles[profile.id] = profile;
        await this.saveStore(store);
    }

    static async listProfiles(): Promise<AuthProfile[]> {
        const store = await this.getStore();
        return Object.values(store.profiles);
    }

    static async deleteProfile(profileId: string) {
        const store = await this.getStore();
        if (store.profiles[profileId]) {
            delete store.profiles[profileId];
            await this.saveStore(store);
        }
    }
}
