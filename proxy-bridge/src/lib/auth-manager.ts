
import { AuthProfile, AuthProfileStore } from './auth-profile-store';
import { v4 as uuidv4 } from 'uuid';
import open from 'open';
import crypto from 'crypto';

// Configuration for providers
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// OpenClaw "Borrowed" Client IDs for specific features
const ANTIGRAVITY_CLIENT_ID = process.env.ANTIGRAVITY_CLIENT_ID || "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const ANTIGRAVITY_CLIENT_SECRET = process.env.ANTIGRAVITY_CLIENT_SECRET || "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f";

const GEMINI_CLI_CLIENT_ID = process.env.GEMINI_CLI_CLIENT_ID; // Usually extracted from local install
const GEMINI_CLI_CLIENT_SECRET = process.env.GEMINI_CLI_CLIENT_SECRET;

// Redirect URI for local flow
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/callback';

export class AuthManager {

    /**
     * Start OAuth flow for a provider
     */
    static async initiateOAuth(provider: string, mode: 'electron' | 'web' = 'web'): Promise<{ url: string; state: string; codeVerifier?: string }> {
        if (provider === 'google') {
            return this.initiateGoogleOAuth(mode);
        }
        if (provider === 'google-antigravity') {
            return this.initiateAntigravityOAuth(mode);
        }
        if (provider === 'google-gemini-cli') {
            return this.initiateGeminiCliOAuth(mode);
        }
        if (provider === 'openai-codex') {
            return this.initiateOpenAICodexOAuth(mode);
        }
        if (provider === 'qwen-portal') {
            return this.initiateQwenPortalOAuth(mode);
        }
        if (provider === 'anthropic' || provider === 'anthropic-oauth') {
            return this.initiateAnthropicOAuth(mode);
        }
        throw new Error(`Provider ${provider} not supported for OAuth initiation`);
    }

    /**
     * Anthropic OAuth implementation (Claude Code)
     */
    private static async initiateAnthropicOAuth(mode: 'electron' | 'web' = 'web') {
        const stateRaw = { p: 'anthropic', n: uuidv4(), mode: mode };
        const state = Buffer.from(JSON.stringify(stateRaw)).toString('base64');
        // Anthropic uses claude.ai for authorize
        const url = `https://claude.ai/oauth/authorize?client_id=official-id-here&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email&state=${state}&response_type=code`;
        return { url, state };
    }

    /**
     * OpenAI Codex OAuth implementation
     */
    private static async initiateOpenAICodexOAuth(mode: 'electron' | 'web' = 'web') {
        const stateRaw = { p: 'openai-codex', n: uuidv4(), mode: mode };
        const state = Buffer.from(JSON.stringify(stateRaw)).toString('base64');
        const url = `https://auth.openai.com/oauth/authorize?client_id=official-id-here&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email&state=${state}&response_type=code`;
        return { url, state };
    }

    /**
     * Qwen Portal OAuth implementation
     */
    private static async initiateQwenPortalOAuth(mode: 'electron' | 'web' = 'web') {
        const stateRaw = { p: 'qwen-portal', n: uuidv4(), mode: mode };
        const state = Buffer.from(JSON.stringify(stateRaw)).toString('base64');
        const url = `https://chat.qwen.ai/api/v1/oauth2/authorize?client_id=f0304373b74a44d2b584a3fb70ca9e56&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email%20model.completion&state=${state}&response_type=code`;
        return { url, state };
    }

    /**
     * Google OAuth implementation (Standard)
     */
    private static async initiateGoogleOAuth(mode: 'electron' | 'web' = 'web') {
        if (!GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID not set');
        return this.generateGoogleUrl(GOOGLE_CLIENT_ID, ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/cloud-platform'], 'google', mode);
    }

    /**
     * Antigravity OAuth implementation (Borrowed ID)
     */
    private static async initiateAntigravityOAuth(mode: 'electron' | 'web' = 'web') {
        const scopes = [
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/cclog",
            "https://www.googleapis.com/auth/experimentsandconfigs",
        ];
        return this.generateGoogleUrl(ANTIGRAVITY_CLIENT_ID, scopes, 'google-antigravity', mode);
    }

    /**
     * Gemini CLI OAuth implementation
     */
    private static async initiateGeminiCliOAuth(mode: 'electron' | 'web' = 'web') {
        if (!GEMINI_CLI_CLIENT_ID) throw new Error('GEMINI_CLI_CLIENT_ID not set. Please set it in .env or install Gemini CLI.');
        const scopes = [
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ];
        return this.generateGoogleUrl(GEMINI_CLI_CLIENT_ID, scopes, 'google-gemini-cli', mode);
    }

    private static generateGoogleUrl(clientId: string, scopes: string[], provider: string, mode: 'electron' | 'web') {
        const stateRaw = { p: provider, n: uuidv4(), mode: mode };
        const state = Buffer.from(JSON.stringify(stateRaw)).toString('base64');
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: scopes.join(' '),
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            access_type: 'offline',
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
            return this.exchangeGoogleCode(code, GOOGLE_CLIENT_ID!, GOOGLE_CLIENT_SECRET!, codeVerifier);
        }
        if (provider === 'google-antigravity') {
            return this.exchangeGoogleCode(code, ANTIGRAVITY_CLIENT_ID, ANTIGRAVITY_CLIENT_SECRET, codeVerifier, 'google-antigravity');
        }
        if (provider === 'google-gemini-cli') {
            return this.exchangeGoogleCode(code, GEMINI_CLI_CLIENT_ID!, GEMINI_CLI_CLIENT_SECRET!, codeVerifier, 'google-gemini-cli');
        }
        throw new Error(`Provider ${provider} exchange not supported`);
    }

    private static async exchangeGoogleCode(code: string, clientId: string, clientSecret: string, codeVerifier?: string, provider: string = 'google'): Promise<AuthProfile> {
        if (!clientId || !clientSecret) throw new Error(`${provider} credentials not set`);

        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
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
        const profileId = await this.generateProfileId(provider, data.id_token);

        const profile: AuthProfile = {
            id: profileId,
            provider: provider,
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
