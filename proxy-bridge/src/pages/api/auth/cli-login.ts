import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { URL } from 'url';

/**
 * CLI Auth endpoint — in-app OAuth for subscription providers.
 *
 * POST /api/auth/cli-login  { provider: 'claude-code' | 'gemini-cli' }
 * → SSE stream of { type, ... } events
 *
 * Gemini: full PKCE OAuth (no CLI needed)
 * Claude: spawns `claude auth login`, streams its output, polls creds dir
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { provider } = req.body as { provider: string };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj: object) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };
  const done = () => { if (!res.writableEnded) res.end(); };

  if (provider === 'gemini-cli') {
    handleGeminiOAuth(send, done);
  } else if (provider === 'claude-code') {
    handleClaudeAuth(send, done);
  } else {
    send({ type: 'error', message: `Unknown provider: ${provider}` });
    done();
  }
}

// ── Gemini PKCE OAuth ─────────────────────────────────────────────────────────

const GEMINI_CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
const GEMINI_SCOPES = [
  'https://www.googleapis.com/auth/generative-language',
  'https://www.googleapis.com/auth/cloud-platform',
];
const OAUTH_CREDS_PATH = path.join(os.homedir(), '.gemini', 'oauth_creds.json');

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function handleGeminiOAuth(
  send: (o: object) => void,
  done: () => void,
) {
  // Generate PKCE
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

  // Start local callback server on a random port
  let callbackServer: http.Server | null = null;
  const port = await new Promise<number>(resolve => {
    const s = http.createServer();
    s.listen(0, '127.0.0.1', () => {
      callbackServer = s;
      resolve((s.address() as any).port);
    });
  });

  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GEMINI_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GEMINI_SCOPES.join(' '));
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  send({ type: 'url', url: authUrl.toString() });
  send({ type: 'status', message: 'Waiting for Google sign-in…' });

  // Wait for callback
  const code = await new Promise<string | null>(resolve => {
    const timeout = setTimeout(() => { resolve(null); }, 5 * 60 * 1000);

    callbackServer!.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
      const url = new URL(req.url!, `http://127.0.0.1:${port}`);
      const code = url.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="font-family:sans-serif;padding:40px;background:#0a0a0a;color:#fff">
        <h2 style="color:#4ade80">✓ Authenticated!</h2>
        <p>You can close this tab and return to QueenBee.</p>
        <script>window.close()</script>
      </body></html>`);
      clearTimeout(timeout);
      resolve(code);
    });
  });

  callbackServer!.close();

  if (!code) {
    send({ type: 'error', message: 'Timed out waiting for authentication (5 min).' });
    return done();
  }

  send({ type: 'status', message: 'Exchanging authorization code…' });

  // Exchange code for tokens (no client_secret — PKCE public client)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GEMINI_CLIENT_ID,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }).toString(),
  });

  const tokens = await tokenRes.json() as any;

  if (!tokenRes.ok || !tokens.refresh_token) {
    send({ type: 'error', message: `Token exchange failed: ${tokens.error_description || tokens.error || 'no refresh_token'}` });
    return done();
  }

  // Save to ~/.gemini/oauth_creds.json (same format as gemini-cli)
  const credsDir = path.dirname(OAUTH_CREDS_PATH);
  if (!fs.existsSync(credsDir)) fs.mkdirSync(credsDir, { recursive: true });
  fs.writeFileSync(OAUTH_CREDS_PATH, JSON.stringify({
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    expiry_date: Date.now() + (tokens.expires_in ?? 3600) * 1000,
  }, null, 2));

  send({ type: 'success', message: 'Gemini connected! Subscription active.' });
  done();
}

// ── Claude CLI Auth ───────────────────────────────────────────────────────────

const ANTHROPIC_CREDS_DIR = path.join(os.homedir(), '.config', 'anthropic');
const CLAUDE_BIN_CANDIDATES = [
  'claude',
  path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
  '/usr/local/bin/claude',
  path.join(os.homedir(), '.local', 'bin', 'claude'),
  '/opt/homebrew/bin/claude',
];

function findClaude(): string | null {
  for (const c of CLAUDE_BIN_CANDIDATES) {
    try { fs.accessSync(c === 'claude' ? '/usr/local/bin/claude' : c, fs.constants.X_OK); return c; } catch {}
  }
  // Try which
  try {
    const { execSync } = require('child_process');
    const p = execSync('which claude 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (p) return p;
  } catch {}
  return null;
}

function handleClaudeAuth(send: (o: object) => void, done: () => void) {
  const binary = findClaude();

  if (!binary) {
    send({
      type: 'install_needed',
      message: 'Claude CLI not found.',
      installCmd: 'npm install -g @anthropic-ai/claude-code',
    });
    // Don't end — frontend will poll /api/providers/test after user installs
    // Just wait a bit and end
    setTimeout(done, 500);
    return;
  }

  send({ type: 'status', message: 'Launching Claude authentication…' });

  const env = {
    ...process.env,
    PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
  };

  const proc = spawn(binary, ['auth', 'login'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const urlPattern = /https?:\/\/[^\s\]"'>]+/g;

  const handleData = (chunk: Buffer) => {
    const text = chunk.toString();
    // Relay output
    send({ type: 'output', text });
    // Extract and highlight URLs
    const urls = text.match(urlPattern);
    if (urls) {
      for (const url of urls) {
        if (url.includes('anthropic') || url.includes('auth') || url.includes('claude')) {
          send({ type: 'url', url });
        }
      }
    }
  };

  proc.stdout?.on('data', handleData);
  proc.stderr?.on('data', handleData);

  // Poll for credentials directory
  let polls = 0;
  const maxPolls = 60; // 2 min
  const poller = setInterval(() => {
    polls++;
    if (fs.existsSync(ANTHROPIC_CREDS_DIR)) {
      clearInterval(poller);
      proc.kill();
      send({ type: 'success', message: 'Claude connected! Subscription active.' });
      done();
    } else if (polls >= maxPolls) {
      clearInterval(poller);
      proc.kill();
      send({ type: 'error', message: 'Timed out. Complete authentication in the browser, then click "Check Again".' });
      done();
    }
  }, 2000);

  proc.on('exit', () => {
    clearInterval(poller);
    if (fs.existsSync(ANTHROPIC_CREDS_DIR)) {
      send({ type: 'success', message: 'Claude connected! Subscription active.' });
    } else {
      send({ type: 'error', message: 'Authentication process ended. Click "Check Again" if you completed login.' });
    }
    done();
  });
}

export const config = { api: { bodyParser: true } };
