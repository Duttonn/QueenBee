
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Hardcoded fallback for packaged app — env var takes precedence
const DEFAULT_CLIENT_ID = 'Ov23lit0FgPDINdBAXU0';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || DEFAULT_CLIENT_ID;

interface AuthInitResponse {
    type: 'redirect' | 'device_flow';
    url?: string;
    state?: string;
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
}

export class GitHubAuthManager {
    static isLocalMac(): boolean {
        // Check if running on macOS
        return os.platform() === 'darwin';
    }

    static async initiateLogin(redirectUri: string, mode?: 'electron' | 'web'): Promise<AuthInitResponse> {
        const clientId = CLIENT_ID;
        if (!clientId) throw new Error('GITHUB_CLIENT_ID is not configured');

        // Allow force usage of device flow via env var for testing or preference
        const preferDeviceFlow = process.env.USE_DEVICE_FLOW === 'true';

        // Hybrid Strategy:
        // 1. If explicitly requested web mode, or not on mac -> maybe device flow or web flow
        // For now, let's keep the logic but allow override
        
        const effectiveMode = mode || (this.isLocalMac() ? 'electron' : 'web');

        if (this.isLocalMac() && !preferDeviceFlow) {
            return this.initiateWebFlow(clientId, redirectUri, effectiveMode);
        } else {
            return this.initiateDeviceFlow(clientId);
        }
    }

    private static initiateWebFlow(clientId: string, redirectUri: string, mode: 'electron' | 'web'): AuthInitResponse {
        const scopes = [
            'user:email',
            'read:user',
            'repo',
            'workflow',
            'read:org',
            'gist',
        ].join(' ');

        const state = Buffer.from(JSON.stringify({
            timestamp: Date.now(),
            nonce: Math.random().toString(36).substring(7),
            mode: mode
        })).toString('base64');

        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('allow_signup', 'true');

        return {
            type: 'redirect',
            url: authUrl.toString(),
            state
        };
    }

    private static async initiateDeviceFlow(clientId: string): Promise<AuthInitResponse> {
        const response = await fetch('https://github.com/login/device/code', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                scope: 'repo read:user user:email workflow read:org gist',
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to initiate device flow: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            type: 'device_flow',
            device_code: data.device_code,
            user_code: data.user_code,
            verification_uri: data.verification_uri,
            expires_in: data.expires_in,
            interval: data.interval
        };
    }

    static async pollForToken(deviceCode: string): Promise<any> {
        const clientId = CLIENT_ID;
        if (!clientId) throw new Error('GITHUB_CLIENT_ID is not configured');

        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                device_code: deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
        });

        return response.json();
    }
}
