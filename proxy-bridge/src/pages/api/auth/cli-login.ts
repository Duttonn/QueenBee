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
 *
 * Supported providers:
 *   - gemini-cli        : Google OAuth + project provisioning (extracts creds from installed gemini binary)
 *   - gemini-antigravity: Google OAuth + project provisioning (no CLI required — free tier via Google account)
 *   - claude-code       : Claude CLI OAuth
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

// Only one active auth session per provider — prevents browser windows from accumulating
const activeByProvider = new Map<string, string>(); // provider → sessionId

function mkId() { return crypto.randomBytes(8).toString('hex'); }

/** Kill and remove any existing session for a provider before starting a new one. */
function evictProviderSession(provider: string) {
  const prev = activeByProvider.get(provider);
  if (prev) {
    const s = sessions.get(prev);
    s?.cleanup?.();
    sessions.delete(prev);
    activeByProvider.delete(provider);
  }
}

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
    // Also remove from provider map if it's the active session
    for (const [p, sid] of activeByProvider) {
      if (sid === id) { activeByProvider.delete(p); break; }
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { provider, action } = req.body as { provider: string; action?: string };
  if (action !== 'start' && action !== undefined) return res.status(400).json({ error: 'use action: start' });

  // Kill any existing auth process for this provider before starting a new one
  evictProviderSession(provider);

  const sessionId = mkId();
  const session: Session = { status: 'waiting', url: null, log: [], message: 'Starting…' };
  sessions.set(sessionId, session);
  activeByProvider.set(provider, sessionId);

  // Clean up stale sessions after 10 min
  setTimeout(() => {
    session.cleanup?.();
    sessions.delete(sessionId);
    if (activeByProvider.get(provider) === sessionId) activeByProvider.delete(provider);
  }, 10 * 60 * 1000);

  if (provider === 'gemini-cli') {
    startGeminiOAuth(session, 'gemini-cli').catch(err => {
      session.status = 'error';
      session.message = err.message;
    });
  } else if (provider === 'gemini-antigravity') {
    startGeminiOAuth(session, 'gemini-antigravity').catch(err => {
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

// Known client ID for the google/gemini-cli open-source project
const FALLBACK_CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';

// gemini-cli uses cloud-platform scope (NOT generative-language — that one is restricted)
const GEMINI_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Fixed redirect URI on port 8085 — matches what the gemini-cli OAuth client is registered for
const REDIRECT_URI = 'http://localhost:8085/oauth2callback';

const OAUTH_CREDS_PATH       = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
const ANTIGRAVITY_CREDS_PATH = path.join(os.homedir(), '.gemini', 'queenbee_antigravity_creds.json');

// Code Assist API endpoints (tried in order)
const CODE_ASSIST_ENDPOINTS = [
  'https://cloudcode-pa.googleapis.com',
  'https://daily-cloudcode-pa.sandbox.googleapis.com',
];

/** Try to extract the OAuth client ID (and secret) from the installed gemini-cli binary */
function extractGeminiCliCredentials(): { clientId: string; clientSecret?: string } | null {
  // Well-known install locations (covers homebrew, npm global, nvm, etc.)
  const wellKnownBases = [
    '/opt/homebrew/lib/node_modules/@google/gemini-cli',
    '/usr/local/lib/node_modules/@google/gemini-cli',
    path.join(os.homedir(), '.npm-global', 'lib', 'node_modules', '@google', 'gemini-cli'),
    path.join(os.homedir(), '.nvm', 'versions', 'node'), // scanned below
  ];

  const dirsToSearch: string[] = [...wellKnownBases];

  // Also try resolving via PATH
  try {
    const { execSync } = require('child_process');
    const fullPath = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH ?? ''}`;
    const geminiPath = execSync(`PATH="${fullPath}" which gemini 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (geminiPath) {
      const realPath = fs.realpathSync(geminiPath);
      const binDir   = path.dirname(geminiPath);
      const realDir  = path.dirname(path.dirname(realPath));
      dirsToSearch.push(
        realDir,
        path.join(realDir, 'node_modules', '@google', 'gemini-cli'),
        path.join(binDir, '..', 'lib', 'node_modules', '@google', 'gemini-cli'),
        path.join(binDir, '..', 'node_modules', '@google', 'gemini-cli'),
      );
    }
  } catch {}

  const oauth2Paths = [
    'node_modules/@google/gemini-cli-core/dist/src/code_assist/oauth2.js',
    'node_modules/@google/gemini-cli-core/dist/code_assist/oauth2.js',
  ];

  for (const base of dirsToSearch) {
    for (const rel of oauth2Paths) {
      const p = path.join(base, rel);
      try {
        if (!fs.existsSync(p)) continue;
        const content = fs.readFileSync(p, 'utf-8');
        const idMatch     = content.match(/(\d+-[a-z0-9]+\.apps\.googleusercontent\.com)/);
        const secretMatch = content.match(/(GOCSPX-[A-Za-z0-9_-]+)/);
        if (idMatch) {
          return { clientId: idMatch[1], clientSecret: secretMatch?.[1] };
        }
      } catch {}
    }
  }
  return null;
}

function b64url(buf: Buffer) {
  return buf.toString('base64url');
}

async function startGeminiOAuth(session: Session, provider: 'gemini-cli' | 'gemini-antigravity') {
  // Resolve client ID: try to extract from installed CLI (for gemini-cli), else use known fallback
  let clientId   = FALLBACK_CLIENT_ID;
  let clientSecret: string | undefined;

  if (provider === 'gemini-cli') {
    // Try to extract real client credentials from installed binary — optional, falls back to known ID
    const extracted = extractGeminiCliCredentials();
    if (extracted) {
      clientId     = extracted.clientId;
      clientSecret = extracted.clientSecret;
    }
    // No binary required — the fallback FALLBACK_CLIENT_ID is always sufficient for the OAuth flow
  }
  // For antigravity: no binary required — use the known client ID directly

  const verifier   = b64url(crypto.randomBytes(32));
  const challenge  = b64url(crypto.createHash('sha256').update(verifier).digest());

  // Start local callback server on fixed port 8085 (matches Google's redirect URI allowlist)
  const server = http.createServer();

  await new Promise<void>((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port in use — still proceed; the existing listener may be from a previous flow
        resolve();
      } else {
        reject(err);
      }
    });
    server.listen(8085, 'localhost', () => resolve());
  });

  session.cleanup = () => { try { server.close(); } catch {} };

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id',             clientId);
  authUrl.searchParams.set('redirect_uri',          REDIRECT_URI);
  authUrl.searchParams.set('response_type',         'code');
  authUrl.searchParams.set('scope',                 GEMINI_SCOPES);
  authUrl.searchParams.set('code_challenge',        challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state',                 verifier);   // state = verifier (openclaw pattern)
  authUrl.searchParams.set('access_type',           'offline');
  authUrl.searchParams.set('prompt',                'consent');

  session.url     = authUrl.toString();
  session.message = 'Open the link above to sign in with Google';

  // Wait for OAuth callback
  const { code } = await new Promise<{ code: string }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Timed out (5 min). Try again.'));
    }, 5 * 60 * 1000);

    server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
      const u = new URL(req.url!, `http://localhost:8085`);
      if (u.pathname !== '/oauth2callback') {
        res.writeHead(404); res.end(); return;
      }

      const error = u.searchParams.get('error');
      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Authentication failed: ${error}`);
        clearTimeout(timeout); server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      const code  = u.searchParams.get('code');
      const state = u.searchParams.get('state');

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing code'); return;
      }
      if (state && state !== verifier) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('State mismatch'); return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="font-family:sans-serif;padding:48px;background:#09090b;color:#fafafa">
        <h2 style="color:#4ade80;font-size:1.5rem">✓ Signed in!</h2>
        <p style="color:#a1a1aa">You can close this tab and return to QueenBee.</p>
        <script>setTimeout(()=>window.close(),1500)</script>
      </body></html>`);

      clearTimeout(timeout);
      server.close();
      resolve({ code });
    });
  });

  session.message = 'Exchanging authorization code…';

  // Exchange code for tokens
  const tokenParams: Record<string, string> = {
    code,
    client_id:     clientId,
    redirect_uri:  REDIRECT_URI,
    grant_type:    'authorization_code',
    code_verifier: verifier,
  };
  if (clientSecret) tokenParams.client_secret = clientSecret;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Accept':       '*/*',
      'User-Agent':   'google-api-nodejs-client/9.15.1',
    },
    body: new URLSearchParams(tokenParams).toString(),
  });
  const tokens = await tokenRes.json() as any;

  if (!tokenRes.ok || !tokens.refresh_token) {
    session.status  = 'error';
    session.message = `Token exchange failed: ${tokens.error_description || tokens.error || JSON.stringify(tokens)}`;
    return;
  }

  session.message = 'Provisioning Google Cloud project…';

  // Discover / provision the free-tier Google Cloud project (antigravity)
  let projectId: string | undefined;
  try {
    projectId = await discoverProject(tokens.access_token);
    session.log.push(`Project: ${projectId}`);
  } catch (err: any) {
    // Non-fatal — credentials still usable without projectId
    session.log.push(`Project discovery skipped: ${err.message}`);
  }

  // Save credentials
  const credDir = path.dirname(OAUTH_CREDS_PATH);
  if (!fs.existsSync(credDir)) fs.mkdirSync(credDir, { recursive: true });

  const creds = {
    refresh_token: tokens.refresh_token,
    access_token:  tokens.access_token,
    token_type:    tokens.token_type ?? 'Bearer',
    expiry_date:   Date.now() + (tokens.expires_in ?? 3600) * 1000,
    ...(projectId ? { project_id: projectId } : {}),
  };

  if (provider === 'gemini-cli') {
    // Write to ~/.gemini/oauth_creds.json — used by GeminiCliProvider
    fs.writeFileSync(OAUTH_CREDS_PATH, JSON.stringify(creds, null, 2));
  } else {
    // Write to separate file for antigravity provider
    fs.writeFileSync(ANTIGRAVITY_CREDS_PATH, JSON.stringify(creds, null, 2));
  }

  session.status  = 'success';
  session.message = provider === 'gemini-antigravity'
    ? 'Gemini Free connected! Google account active.'
    : 'Gemini connected! Subscription active.';
}

// ── Google Code Assist project provisioning ───────────────────────────────────

function resolvePlatform(): 'WINDOWS' | 'MACOS' | 'PLATFORM_UNSPECIFIED' {
  if (process.platform === 'win32') return 'WINDOWS';
  if (process.platform === 'darwin') return 'MACOS';
  return 'PLATFORM_UNSPECIFIED';
}

async function discoverProject(accessToken: string): Promise<string> {
  const platform = resolvePlatform();
  const metadata = { ideType: 'ANTIGRAVITY', platform, pluginType: 'GEMINI' };
  const headers: Record<string, string> = {
    Authorization:    `Bearer ${accessToken}`,
    'Content-Type':   'application/json',
    'User-Agent':     'google-api-nodejs-client/9.15.1',
    'X-Goog-Api-Client': `gl-node/${process.versions.node}`,
    'Client-Metadata': JSON.stringify(metadata),
  };

  // Try loadCodeAssist on each endpoint
  let data: any = {};
  let activeEndpoint = CODE_ASSIST_ENDPOINTS[0];
  let loadError: Error | undefined;

  for (const endpoint of CODE_ASSIST_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(`${endpoint}/v1internal:loadCodeAssist`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({ metadata }),
      });
      if (!res.ok) {
        loadError = new Error(`loadCodeAssist ${res.status}`);
        continue;
      }
      data           = await res.json();
      activeEndpoint = endpoint;
      loadError      = undefined;
      break;
    } catch (err: any) {
      loadError = err;
    }
  }

  // If loadCodeAssist returned a project directly, use it
  if (data.cloudaicompanionProject) {
    const p = data.cloudaicompanionProject;
    if (typeof p === 'string' && p) return p;
    if (typeof p === 'object' && p?.id) return p.id;
  }

  if (loadError && !data.allowedTiers?.length) {
    throw loadError;
  }

  // Determine tier and onboard
  const TIER_FREE = 'free-tier';
  const TIER_LEGACY = 'legacy-tier';
  const allowedTiers: Array<{ id?: string; isDefault?: boolean }> = data.allowedTiers ?? [];
  const tier   = allowedTiers.find(t => t.isDefault) ?? { id: TIER_LEGACY };
  const tierId = tier.id || TIER_FREE;

  const onboardRes = await fetchWithTimeout(`${activeEndpoint}/v1internal:onboardUser`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ tierId, metadata }),
  });

  if (!onboardRes.ok) {
    throw new Error(`onboardUser ${onboardRes.status}`);
  }

  let lro = await onboardRes.json() as any;

  // Poll long-running operation if not done
  if (!lro.done && lro.name) {
    lro = await pollOperation(activeEndpoint, lro.name, headers);
  }

  const projectId = lro.response?.cloudaicompanionProject?.id;
  if (projectId) return projectId;

  throw new Error('Could not provision a Google Cloud project.');
}

async function pollOperation(
  endpoint: string,
  name: string,
  headers: Record<string, string>,
  maxAttempts = 24,
  intervalMs  = 5000,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    try {
      const res = await fetchWithTimeout(`${endpoint}/v1internal/${name}`, { headers });
      if (!res.ok) continue;
      const data = await res.json() as any;
      if (data.done) return data;
    } catch {}
  }
  throw new Error('Operation polling timed out.');
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
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
    session.status     = 'install_needed';
    session.message    = 'Claude CLI not found.';
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

  const urlRe   = /https?:\/\/[^\s\]"'>]+/g;
  let loggedIn  = false;

  const handleChunk = (chunk: Buffer) => {
    const text = chunk.toString();
    const line = text.trim();
    if (line) session.log.push(line);

    // Extract the first Anthropic/Claude URL from output
    const urls = text.match(urlRe) ?? [];
    for (const u of urls) {
      if (!session.url && (u.includes('anthropic') || u.includes('claude'))) {
        session.url     = u;
        session.message = 'Open the link above to sign in with Claude.ai';
      }
    }

    if (/login successful|successfully authenticated|logged in|auth.*success/i.test(text)) {
      loggedIn = true;
    }
  };

  proc.stdout?.on('data', handleChunk);
  proc.stderr?.on('data', handleChunk);

  // Poll for credentials (every 2s, up to 3 min)
  let polls = 0;
  const poller = setInterval(() => {
    polls++;
    if (claudeCredentialsExist()) {
      clearInterval(poller);
      proc.kill();
      session.status  = 'success';
      session.message = 'Claude connected! Subscription active.';
    } else if (polls >= 90) {
      clearInterval(poller);
      proc.kill();
      if (session.status !== 'success') {
        session.status  = 'error';
        session.message = 'Timed out. If you completed login, click "Check credentials".';
      }
    }
  }, 2000);

  proc.on('exit', () => {
    clearInterval(poller);
    if (loggedIn || claudeCredentialsExist()) {
      session.status  = 'success';
      session.message = 'Claude connected! Subscription active.';
    } else if (session.status === 'waiting') {
      session.status  = 'error';
      session.message = 'Authentication ended. If you completed login, click "Check credentials".';
    }
  });

  session.cleanup = () => {
    clearInterval(poller);
    try { proc.kill(); } catch {}
  };
}
