
import { AuthProfile, AuthProfileStore } from './auth-profile-store';
import { v4 as uuidv4 } from 'uuid';
import open from 'open';
import crypto from 'crypto';

// Configuration for providers
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Redirect URI for local flow
const REDIRECT_URI = 'http://localhost:3001/api/auth/callback';

export class AuthManager {

    /**
     * Start OAuth flow for a provider
     */
    static async initiateOAuth(provider: string): Promise<{ url: string; state: string; codeVerifier?: string }> {
        if (provider === 'google') {
            return this.initiateGoogleOAuth();
        }
        throw new Error(`Provider ${provider} not supported for OAuth initiation`);
    }

    /**
     * Google OAuth implementation
     */
    private static async initiateGoogleOAuth() {
        if (!GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID not set');

        const stateRaw = { p: 'google', n: uuidv4() };
        const state = Buffer.from(JSON.stringify(stateRaw)).toString('base64');
        // Google supports PKCE
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);

        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'openid email profile https://www.googleapis.com/auth/cloud-platform', // Adjust scopes as needed for Gemini/Antigravity
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            access_type: 'offline', // Important for refresh token
            prompt: 'consent'
        });

        const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        return { url, state, codeVerifier };
    }

    /**
     * Complete OAuth flow by exchanging code for tokens
     */
    static async exchangeCodeForToken(provider: string, code: string, codeVerifier?: string): Promise<AuthProfile> {
        if (provider === 'google') {
            return this.exchangeGoogleCode(code, codeVerifier);
        }
        throw new Error(`Provider ${provider} exchange not supported`);
    }

    private static async exchangeGoogleCode(code: string, codeVerifier?: string): Promise<AuthProfile> {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error('Google credentials not set');

        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
        });

        if (codeVerifier) {
            params.append('code_verifier', codeVerifier);
        }

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Google token exchange failed: ${err}`);
        }

        const data = await res.json();
        // data: access_token, refresh_token, expires_in, id_token, scope

        // Use ID token to get user info/email for profile ID
        const profileId = await this.generateProfileId('google', data.id_token);

        const profile: AuthProfile = {
            id: profileId,
            provider: 'google',
            mode: 'oauth',
            access: data.access_token,
            refresh: data.refresh_token,
            expires: Date.now() + (data.expires_in * 1000),
        };

        await AuthProfileStore.saveProfile(profile);
        return profile;
    }

    /**
     * PKCE Helpers
     */
    private static generateCodeVerifier() {
        return base64URLEncode(crypto.randomBytes(32));
    }

    private static generateCodeChallenge(verifier: string) {
        return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
    }

    private static async generateProfileId(provider: string, idToken?: string): Promise<string> {
        // Simple heuristic for ID
        let suffix = 'default';
        if (idToken) {
            try {
                // Decode JWT simply without verify for ID extraction (verify typically done by backend middleware)
                const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                if (payload.email) suffix = payload.email;
            } catch (e) {
                // ignore
            }
        }
        return `${provider}:${suffix}`;
    }

    /**
     * Refresh Token Logic
     */
    static async refreshProfile(profileId: string): Promise<AuthProfile> {
        const profile = await AuthProfileStore.getProfile(profileId);
        if (!profile) throw new Error('Profile not found');
        if (profile.mode !== 'oauth' || !profile.refresh) return profile;

        if (profile.provider === 'google') {
            return this.refreshGoogleToken(profile);
        }

        return profile;
    }

    private static async refreshGoogleToken(profile: AuthProfile): Promise<AuthProfile> {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return profile;

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: profile.refresh!
            })
        });

        if (!res.ok) throw new Error('Failed to refresh Google token');

        const data = await res.json();

        const updated: AuthProfile = {
            ...profile,
            access: data.access_token,
            expires: Date.now() + (data.expires_in * 1000),
            // refresh token might not be rotated always
            refresh: data.refresh_token || profile.refresh
        };

        await AuthProfileStore.saveProfile(updated);
        return updated;
    }

    /**
     * Add Static Token (Gemini CLI / Claude Setup Token)
     */
    static async addStaticToken(provider: string, token: string, alias: string = 'default') {
        const profile: AuthProfile = {
            id: `${provider}:${alias}`,
            provider,
            mode: 'token',
            token
        };
        await AuthProfileStore.saveProfile(profile);
    }
}

function base64URLEncode(str: Buffer) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
