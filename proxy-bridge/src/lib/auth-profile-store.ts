
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

const CONFIG_DIR = Paths.getQueenBeeConfigDir();

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

function getProfilesFile(sessionId?: string): string {
    if (sessionId) {
        const sessionDir = path.join(CONFIG_DIR, 'sessions', sessionId);
        return path.join(sessionDir, 'auth-profiles.json');
    }
    return path.join(CONFIG_DIR, 'auth-profiles.json');
}

export class AuthProfileStore {
    static async getStore(sessionId?: string): Promise<AuthProfileStoreData> {
        try {
            const file = getProfilesFile(sessionId);
            await fs.ensureDir(path.dirname(file));

            if (!await fs.pathExists(file)) {
                const initial: AuthProfileStoreData = { version: 1, profiles: {} };
                await fs.writeJson(file, initial, { mode: 0o600 });
                return initial;
            }

            return await fs.readJson(file);
        } catch (error) {
            console.error('Failed to read auth profiles:', error);
            return { version: 1, profiles: {} };
        }
    }

    static async saveStore(data: AuthProfileStoreData, sessionId?: string) {
        const file = getProfilesFile(sessionId);
        await fs.ensureDir(path.dirname(file));
        await fs.writeJson(file, data, { mode: 0o600, spaces: 2 });
    }

    static async getProfile(profileId: string, sessionId?: string): Promise<AuthProfile | undefined> {
        const store = await this.getStore(sessionId);
        return store.profiles[profileId];
    }

    static async saveProfile(profile: AuthProfile, sessionId?: string) {
        const store = await this.getStore(sessionId);
        store.profiles[profile.id] = profile;
        await this.saveStore(store, sessionId);
    }

    static async listProfiles(sessionId?: string): Promise<AuthProfile[]> {
        const store = await this.getStore(sessionId);
        return Object.values(store.profiles);
    }

    static async deleteProfile(profileId: string, sessionId?: string) {
        const store = await this.getStore(sessionId);
        if (store.profiles[profileId]) {
            delete store.profiles[profileId];
            await this.saveStore(store, sessionId);
        }
    }
}
