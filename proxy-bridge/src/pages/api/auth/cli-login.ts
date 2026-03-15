import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { URL } from 'url';

/**
 * CLI Auth — poll-based (avoids SSE buffering issues in Electron).
 *
 * POST { provider, action: 'start' }
 *   → starts auth, returns { sessionId, url? } immediately
 *
 * GET  ?sessionId=...
 *   → { status: 'waiting'|'success'|'error'|'install_needed', url?, log?, message?, installCmd? }
 *
 * DELETE ?sessionId=...
 *   → cancels session
 */

interface Session {
  status: 'waiting' | 'success' | 'error' | 'install_needed';
  url: string | null;
  log: string[];
  message: string;
  installCmd?: string;
  cleanup?: () => void;
}

const sessions = new Map<string, Session>();

function mkId() { return crypto.randomBytes(8).toString('hex'); }

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const id = req.query.sessionId as string;
    const s = sessions.get(id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    return res.status(200).json({
      status:     s.status,
      url:        s.url,
      log:        s.log.slice(-40),
      message:    s.message,
      installCmd: s.installCmd,
    });
  }

  if (req.method === 'DELETE') {
    const id = req.query.sessionId as string;
    const s = sessions.get(id);
    s?.cleanup?.();
    sessions.delete(id);
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { provider, action } = req.body as { provider: string; action?: string };
  if (action !== 'start' && action !== undefined) return res.status(400).json({ error: 'use action: start' });

  const sessionId = mkId();
  const session: Session = { status: 'waiting', url: null, log: [], message: 'Starting…' };
  sessions.set(sessionId, session);

  // Clean up stale sessions after 10 min
  setTimeout(() => { session.cleanup?.(); sessions.delete(sessionId); }, 10 * 60 * 1000);

  if (provider === 'gemini-cli') {
    startGeminiOAuth(session).catch(err => {
      session.status = 'error';
      session.message = err.message;
    });
  } else if (provider === 'claude-code') {
    startClaudeAuth(session);
  } else {
    session.status = 'error';
    session.message = `Unknown provider: ${provider}`;
  }

  return res.status(200).json({ sessionId, url: session.url });
}

// ── Gemini PKCE OAuth ─────────────────────────────────────────────────────────

const GEMINI_CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
// gemini-cli uses cloud-platform (not generative-language which is restricted)
const GEMINI_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');
const OAUTH_CREDS_PATH = path.join(os.homedir(), '.gemini', 'oauth_creds.json');

function b64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function startGeminiOAuth(session: Session) {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());

  // Local callback server on a random port
  const { server, port } = await new Promise<{ server: http.Server; port: number }>((resolve, reject) => {
    const s = http.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => resolve({ server: s, port: (s.address() as any).port }));
  });

  session.cleanup = () => { try { server.close(); } catch {} };

  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GEMINI_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GEMINI_SCOPES);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  session.url = authUrl.toString();
  session.message = 'Open the link above to sign in with Google';

  // Wait for callback
  const code = await new Promise<string | null>(resolve => {
    const timeout = setTimeout(() => { server.close(); resolve(null); }, 5 * 60 * 1000);
    server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
      const u = new URL(req.url!, `http://127.0.0.1:${port}`);
      const code = u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="font-family:sans-serif;padding:48px;background:#09090b;color:#fafafa">
        <h2 style="color:#4ade80;font-size:1.5rem">✓ Signed in!</h2>
        <p style="color:#a1a1aa">You can close this tab and return to QueenBee.</p>
        <script>setTimeout(()=>window.close(),1500)</script>
      </body></html>`);
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });
  });

  if (!code) {
    session.status = 'error';
    session.message = 'Timed out (5 min). Try again.';
    return;
  }

  session.message = 'Exchanging authorization code…';

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: GEMINI_CLIENT_ID,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }).toString(),
  });
  const tokens = await tokenRes.json() as any;

  if (!tokenRes.ok || !tokens.refresh_token) {
    session.status = 'error';
    session.message = `Token exchange failed: ${tokens.error_description || tokens.error || JSON.stringify(tokens)}`;
    return;
  }

  const dir = path.dirname(OAUTH_CREDS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OAUTH_CREDS_PATH, JSON.stringify({
    refresh_token: tokens.refresh_token,
    access_token:  tokens.access_token,
    token_type:    tokens.token_type ?? 'Bearer',
    expiry_date:   Date.now() + (tokens.expires_in ?? 3600) * 1000,
  }, null, 2));

  session.status = 'success';
  session.message = 'Gemini connected! Subscription active.';
}

// ── Claude CLI Auth ───────────────────────────────────────────────────────────

const ANTHROPIC_CREDS_DIR = path.join(os.homedir(), '.config', 'anthropic');

function findClaude(): string | null {
  const candidates = [
    path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(os.homedir(), '.local', 'bin', 'claude'),
  ];
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); return c; } catch {}
  }
  try {
    const { execSync } = require('child_process');
    const p = execSync('which claude 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (p) { fs.accessSync(p, fs.constants.X_OK); return p; }
  } catch {}
  return null;
}

/** Returns true if ~/.config/anthropic/ has at least one non-empty file */
function claudeCredentialsExist(): boolean {
  try {
    if (!fs.existsSync(ANTHROPIC_CREDS_DIR)) return false;
    const files = fs.readdirSync(ANTHROPIC_CREDS_DIR);
    return files.some(f => {
      try { return fs.statSync(path.join(ANTHROPIC_CREDS_DIR, f)).size > 0; } catch { return false; }
    });
  } catch { return false; }
}

function startClaudeAuth(session: Session) {
  const binary = findClaude();

  if (!binary) {
    session.status = 'install_needed';
    session.message = 'Claude CLI not found.';
    session.installCmd = 'npm install -g @anthropic-ai/claude-code';
    return;
  }

  const env = {
    ...process.env,
    PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
  };

  const proc = spawn(binary, ['auth', 'login'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const urlRe = /https?:\/\/[^\s\]"'>]+/g;
  let loggedIn = false;

  const handleChunk = (chunk: Buffer) => {
    const text = chunk.toString();
    const line = text.trim();
    if (line) session.log.push(line);

    // Extract the first Anthropic/Claude URL from output
    const urls = text.match(urlRe) ?? [];
    for (const u of urls) {
      if (!session.url && (u.includes('anthropic') || u.includes('claude'))) {
        session.url = u;
        session.message = 'Open the link above to sign in with Claude.ai';
      }
    }

    // Detect success text in output
    if (/login successful|successfully authenticated|logged in|auth.*success/i.test(text)) {
      loggedIn = true;
    }
  };

  proc.stdout?.on('data', handleChunk);
  proc.stderr?.on('data', handleChunk);

  // Poll for credentials (check every 2s for up to 3 min)
  let polls = 0;
  const poller = setInterval(() => {
    polls++;
    if (claudeCredentialsExist()) {
      clearInterval(poller);
      proc.kill();
      session.status = 'success';
      session.message = 'Claude connected! Subscription active.';
    } else if (polls >= 90) {
      clearInterval(poller);
      proc.kill();
      if (session.status !== 'success') {
        session.status = 'error';
        session.message = 'Timed out. If you completed login, click "Check credentials".';
      }
    }
  }, 2000);

  proc.on('exit', () => {
    clearInterval(poller);
    if (loggedIn || claudeCredentialsExist()) {
      session.status = 'success';
      session.message = 'Claude connected! Subscription active.';
    } else if (session.status === 'waiting') {
      session.status = 'error';
      session.message = 'Authentication ended. If you completed login, click "Check credentials".';
    }
  });

  session.cleanup = () => {
    clearInterval(poller);
    try { proc.kill(); } catch {}
  };
}
