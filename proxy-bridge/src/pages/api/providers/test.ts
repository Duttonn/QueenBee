import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

type Provider = string; // now open-ended

interface TestRequest {
    provider: Provider;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

interface TestResult {
    success: boolean;
    provider: string;
    message: string;
    models?: string[];
    error?: string;
    details?: any;
}

/**
 * REAL AI Provider Connection Test
 * Validates API keys by making actual requests to each provider
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // CORS is handled by middleware.ts — no manual headers here

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { provider, apiKey, baseUrl, model } = req.body as TestRequest;

    if (!provider) {
        return res.status(400).json({
            success: false,
            error: 'Provider is required',
            message: 'Please specify which AI provider to test'
        });
    }

    console.log(`[Provider Test] Testing ${provider}...`);

    try {
        let result: TestResult;

        switch (provider) {
            case 'openai':
                result = await testOpenAI(apiKey);
                break;

            case 'anthropic':
                result = await testAnthropic(apiKey);
                break;

            case 'gemini':
                result = await testGemini(apiKey, baseUrl);
                break;

            case 'nvidia':
                result = await testNvidia(apiKey);
                break;

            case 'ollama':
                result = await testOllama(baseUrl);
                break;

            case 'azure':
                result = await testAzure(apiKey, baseUrl);
                break;

            case 'mistral':
                result = await testOpenAICompat(provider, apiKey, 'https://api.mistral.ai/v1',
                    ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'mistral-nemo']);
                break;

            case 'openrouter':
                result = await testOpenRouter(apiKey);
                break;

            case 'groq':
                result = await testOpenAICompat(provider, apiKey, 'https://api.groq.com/openai/v1',
                    ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it']);
                break;

            case 'xai':
                result = await testOpenAICompat(provider, apiKey, 'https://api.x.ai/v1',
                    ['grok-3', 'grok-3-mini', 'grok-3-fast', 'grok-2-1212']);
                break;

            case 'deepseek':
                result = await testOpenAICompat(provider, apiKey, 'https://api.deepseek.com/v1',
                    ['deepseek-chat', 'deepseek-reasoner']);
                break;

            case 'together':
                result = await testOpenAICompat(provider, apiKey, 'https://api.together.xyz/v1',
                    ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                     'Qwen/Qwen2.5-Coder-32B-Instruct', 'deepseek-ai/DeepSeek-V3']);
                break;

            case 'perplexity':
                result = await testOpenAICompat(provider, apiKey, 'https://api.perplexity.ai',
                    ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning']);
                break;

            case 'cohere':
                result = await testOpenAICompat(provider, apiKey, 'https://api.cohere.com/compatibility/v1',
                    ['command-r-plus', 'command-r', 'command-r-08-2024']);
                break;

            case 'cerebras':
                result = await testOpenAICompat(provider, apiKey, 'https://api.cerebras.ai/v1',
                    ['llama3.1-70b', 'llama3.1-8b', 'llama-3.3-70b']);
                break;

            case 'fireworks':
                result = await testOpenAICompat(provider, apiKey, 'https://api.fireworks.ai/inference/v1',
                    ['accounts/fireworks/models/llama-v3p3-70b-instruct',
                     'accounts/fireworks/models/deepseek-v3',
                     'accounts/fireworks/models/qwen2p5-coder-32b-instruct']);
                break;

            case 'sambanova':
                result = await testOpenAICompat(provider, apiKey, 'https://api.sambanova.ai/v1',
                    ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-R1', 'QwQ-32B']);
                break;

            case 'hyperbolic':
                result = await testOpenAICompat(provider, apiKey, 'https://api.hyperbolic.xyz/v1',
                    ['Qwen/Qwen2.5-Coder-32B-Instruct', 'meta-llama/Llama-3.3-70B-Instruct',
                     'deepseek-ai/DeepSeek-V3']);
                break;

            case 'moonshot':
                result = await testOpenAICompat(provider, apiKey, 'https://api.moonshot.cn/v1',
                    ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']);
                break;

            case 'qwen':
                result = await testOpenAICompat(provider, apiKey,
                    'https://dashscope.aliyuncs.com/compatible-mode/v1',
                    ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen2.5-coder-32b-instruct']);
                break;

            case 'lmstudio':
                result = await testOllama(baseUrl || 'http://localhost:1234');
                break;

            case 'claude-code':
                result = testClaudeCode();
                break;

            case 'gemini-cli':
                result = testGeminiCli();
                break;

            case 'gemini-antigravity':
                result = testGeminiAntigravity();
                break;

            case 'custom':
                result = await testCustom(apiKey, baseUrl, model);
                break;

            default:
                // Try as generic OpenAI-compatible if baseUrl provided
                if (baseUrl) {
                    result = await testCustom(apiKey, baseUrl, model);
                } else {
                    return res.status(400).json({
                        success: false,
                        error: `Unknown provider: ${provider}`,
                        message: 'Unknown provider. If using a custom OpenAI-compatible endpoint, include baseUrl.'
                    });
                }
        }

        console.log(`[Provider Test] ${provider}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        // Always return 200 for test results — the body's `success` field indicates pass/fail.
        // Returning 400 for a failed test confused frontends into treating it as a request error.
        return res.status(200).json(result);

    } catch (error: any) {
        console.error(`[Provider Test] ${provider} error:`, error);
        return res.status(500).json({
            success: false,
            provider,
            error: 'connection_failed',
            message: error.message || 'Failed to connect to provider'
        });
    }
}

async function testOpenAI(apiKey?: string): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false,
            provider: 'openai',
            error: 'missing_api_key',
            message: 'OpenAI API key is required. Get one at https://platform.openai.com/api-keys'
        };
    }

    if (!apiKey.startsWith('sk-')) {
        return {
            success: false,
            provider: 'openai',
            error: 'invalid_format',
            message: 'OpenAI API keys should start with "sk-"'
        };
    }

    try {
        const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': 'QueenBee-Dashboard'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                provider: 'openai',
                error: data.error?.type || 'api_error',
                message: data.error?.message || 'Failed to authenticate with OpenAI'
            };
        }

        const gptModels = data.data?.filter((m: any) =>
            m.id.includes('gpt-4') || m.id.includes('gpt-3.5')
        ).map((m: any) => m.id).slice(0, 10);

        return {
            success: true,
            provider: 'openai',
            message: `Connected! Found ${gptModels.length} GPT models available.`,
            models: gptModels
        };
    } catch (error: any) {
        return {
            success: false,
            provider: 'openai',
            error: error.name === 'AbortError' ? 'timeout' : 'network_error',
            message: error.name === 'AbortError' ? 'Connection timed out.' : `Network error: ${error.message}`
        };
    }
}

async function testAnthropic(apiKey?: string): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false,
            provider: 'anthropic',
            error: 'missing_api_key',
            message: 'Anthropic API key is required. Get one at https://console.anthropic.com/'
        };
    }

    if (!apiKey.startsWith('sk-ant-')) {
        return {
            success: false,
            provider: 'anthropic',
            error: 'invalid_format',
            message: 'Anthropic API keys should start with "sk-ant-"'
        };
    }

    try {
        // Anthropic doesn't have a models endpoint, so we make a minimal request
        const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }]
            })
        });

        if (response.ok) {
            return {
                success: true,
                provider: 'anthropic',
                message: 'Connected! Claude models are available.',
                models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022']
            };
        }

        const data = await response.json();
        return {
            success: false,
            provider: 'anthropic',
            error: data.error?.type || 'api_error',
            message: data.error?.message || 'Failed to authenticate with Anthropic'
        };
    } catch (error: any) {
        return {
            success: false,
            provider: 'anthropic',
            error: error.name === 'AbortError' ? 'timeout' : 'network_error',
            message: error.name === 'AbortError' ? 'Connection timed out.' : `Network error: ${error.message}`
        };
    }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const GEMINI_API_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;

/** fetch() wrapper with a timeout — rejects with AbortError on timeout */
function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = DEFAULT_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function testGemini(apiKey?: string, baseUrl?: string): Promise<TestResult> {
    console.log('[Gemini Test] Starting test...');
    if (!apiKey) {
        return {
            success: false,
            provider: 'gemini',
            error: 'missing_api_key',
            message: 'Google AI API key is required. Get one at https://aistudio.google.com/apikey'
        };
    }

    // Allow custom base URL (e.g. for proxied endpoints)
    const geminiBaseUrl = baseUrl
        ? baseUrl.replace(/\/+$/, '')
        : 'https://generativelanguage.googleapis.com/v1beta';

    try {
        console.log(`[Gemini Test] Fetching models from ${geminiBaseUrl}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GEMINI_API_TIMEOUT_MS);

        const response = await fetch(
            `${geminiBaseUrl}/models?key=${apiKey}`,
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        console.log(`[Gemini Test] Response status: ${response.status}`);

        let data: any;
        try {
            data = await response.json();
        } catch {
            console.error('[Gemini Test] Failed to parse JSON response');
            return {
                success: false,
                provider: 'gemini',
                error: 'invalid_response',
                message: 'Received non-JSON response from Gemini API. Check your API key or base URL.'
            };
        }

        if (!response.ok) {
            console.error('[Gemini Test] API error:', data);
            return {
                success: false,
                provider: 'gemini',
                error: data.error?.status || 'api_error',
                message: data.error?.message || 'Failed to authenticate with Google AI'
            };
        }

        const geminiModels = data.models
            ? data.models
                .map((m: any) => m.name.replace('models/', ''))
                .filter((name: string) => name.toLowerCase().includes('gemini'))
                .sort((a: string, b: string) => {
                    // Sort newest/best models first: 2.5 > 2.0 > 1.5 > 1.0, then pro > flash > lite
                    const version = (s: string) => {
                        const m = s.match(/gemini-(\d+)\.(\d+)/);
                        return m ? parseFloat(`${m[1]}.${m[2]}`) : 0;
                    };
                    const vDiff = version(b) - version(a);
                    if (vDiff !== 0) return vDiff;
                    // Within same version: pro > flash-thinking > flash-preview > flash > lite
                    const rank = (s: string) => {
                        if (s.includes('thinking')) return 4;
                        if (s.includes('pro')) return 3;
                        if (s.includes('preview') || s.includes('exp')) return 2;
                        if (s.includes('flash')) return 1;
                        return 0;
                    };
                    return rank(b) - rank(a);
                })
                .slice(0, 30)
            : [];

        const totalCount = data.models?.filter((m: any) => m.name.toLowerCase().includes('gemini')).length ?? 0;
        console.log(`[Gemini Test] Found ${geminiModels.length} models (showing top ${geminiModels.length} of ${totalCount})`);

        return {
            success: true,
            provider: 'gemini',
            message: `Connected! Found ${totalCount} Gemini models.`,
            models: geminiModels
        };
    } catch (error: any) {
        console.error('[Gemini Test] Fetch error:', error);
        if (error.name === 'AbortError') {
            return {
                success: false,
                provider: 'gemini',
                error: 'timeout',
                message: 'Connection to Google AI timed out. Check your network connection.'
            };
        }
        return {
            success: false,
            provider: 'gemini',
            error: 'network_error',
            message: `Network error: ${error.message}`
        };
    }
}

async function testNvidia(apiKey?: string): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false,
            provider: 'nvidia',
            error: 'missing_api_key',
            message: 'NVIDIA API key is required. Get one at https://build.nvidia.com/'
        };
    }

    if (!apiKey.startsWith('nvapi-')) {
        return {
            success: false,
            provider: 'nvidia',
            error: 'invalid_format',
            message: 'NVIDIA API keys should start with "nvapi-"'
        };
    }

    try {
        const response = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': 'QueenBee-Dashboard'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const models = data.data?.map((m: any) => m.id).slice(0, 15) || [];

            return {
                success: true,
                provider: 'nvidia',
                message: `Connected! Found ${models.length} NVIDIA NIM models.`,
                models
            };
        }

        const data = await response.json();
        return {
            success: false,
            provider: 'nvidia',
            error: 'api_error',
            message: data.error?.message || 'Invalid NVIDIA API key'
        };
    } catch (error: any) {
        return {
            success: false,
            provider: 'nvidia',
            error: error.name === 'AbortError' ? 'timeout' : 'network_error',
            message: error.name === 'AbortError' ? 'Connection timed out.' : `Network error: ${error.message}`
        };
    }
}

async function testOllama(baseUrl?: string): Promise<TestResult> {
    const url = baseUrl || 'http://localhost:11434';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${url}/api/tags`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                success: false,
                provider: 'ollama',
                error: 'server_error',
                message: `Ollama server returned status ${response.status}`
            };
        }

        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];

        if (models.length === 0) {
            return {
                success: true,
                provider: 'ollama',
                message: 'Connected to Ollama, but no models installed. Run `ollama pull llama3` to install a model.',
                models: []
            };
        }

        return {
            success: true,
            provider: 'ollama',
            message: `Connected! Found ${models.length} local models.`,
            models
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return {
                success: false,
                provider: 'ollama',
                error: 'timeout',
                message: 'Connection timed out. Make sure Ollama is running (`ollama serve`).'
            };
        }

        return {
            success: false,
            provider: 'ollama',
            error: 'connection_failed',
            message: `Cannot connect to Ollama at ${url}. Is it running?`
        };
    }
}

async function testAzure(apiKey?: string, baseUrl?: string): Promise<TestResult> {
    if (!apiKey || !baseUrl) {
        return {
            success: false,
            provider: 'azure',
            error: 'missing_credentials',
            message: 'Azure OpenAI requires both API key and endpoint URL'
        };
    }

    try {
        const response = await fetchWithTimeout(`${baseUrl}/openai/models?api-version=2024-02-01`, {
            headers: {
                'api-key': apiKey,
                'User-Agent': 'QueenBee-Dashboard'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const models = data.data?.map((m: any) => m.id) || [];

            return {
                success: true,
                provider: 'azure',
                message: `Connected to Azure OpenAI! Found ${models.length} deployed models.`,
                models
            };
        }

        const data = await response.json();
        return {
            success: false,
            provider: 'azure',
            error: 'api_error',
            message: data.error?.message || 'Failed to connect to Azure OpenAI'
        };
    } catch (error: any) {
        return {
            success: false,
            provider: 'azure',
            error: error.name === 'AbortError' ? 'timeout' : 'network_error',
            message: error.name === 'AbortError' ? 'Connection timed out.' : `Network error: ${error.message}`
        };
    }
}

/** Generic OpenAI-compatible test: tries /models then falls back to /chat/completions */
async function testOpenAICompat(
    provider: string,
    apiKey?: string,
    defaultBaseUrl?: string,
    defaultModels?: string[]
): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false, provider,
            error: 'missing_api_key',
            message: `${provider} API key is required.`
        };
    }
    const baseUrl = defaultBaseUrl || 'https://api.openai.com/v1';
    try {
        const r = await fetchWithTimeout(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'User-Agent': 'QueenBee' }
        });
        if (r.ok) {
            const data = await r.json();
            const models: string[] = data.data?.map((m: any) => m.id).slice(0, 15) || defaultModels || [];
            return { success: true, provider, message: `Connected! ${models.length} models available.`, models };
        }
        // 404 on /models is normal for some providers — try a tiny completion
        const cr = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: defaultModels?.[0] || 'default', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 })
        });
        if (cr.ok) {
            return { success: true, provider, message: 'Connected!', models: defaultModels || [] };
        }
        const err = await cr.json().catch(() => ({}));
        return { success: false, provider, error: 'api_error', message: err?.error?.message || `${provider}: auth failed` };
    } catch (e: any) {
        return { success: false, provider, error: e.name === 'AbortError' ? 'timeout' : 'network_error',
            message: e.name === 'AbortError' ? 'Connection timed out.' : e.message };
    }
}

/** OpenRouter: has its own /models endpoint returning all available models */
async function testOpenRouter(apiKey?: string): Promise<TestResult> {
    if (!apiKey) {
        return { success: false, provider: 'openrouter', error: 'missing_api_key',
            message: 'OpenRouter API key required. Get one free at https://openrouter.ai/keys' };
    }
    try {
        const r = await fetchWithTimeout('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://queenbee.dev' }
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            return { success: false, provider: 'openrouter', error: 'api_error',
                message: err?.error?.message || 'Invalid OpenRouter key' };
        }
        const data = await r.json();
        const models: string[] = (data.data || [])
            .filter((m: any) => !m.id.includes(':nitro') && !m.id.includes(':extended'))
            .map((m: any) => m.id)
            .slice(0, 30);
        return { success: true, provider: 'openrouter',
            message: `Connected! Access to ${data.data?.length || models.length}+ models.`, models };
    } catch (e: any) {
        return { success: false, provider: 'openrouter', error: e.name === 'AbortError' ? 'timeout' : 'network_error',
            message: e.name === 'AbortError' ? 'Connection timed out.' : e.message };
    }
}

/** Claude Code — check if `claude` binary is installed and authenticated */
function testClaudeCode(): TestResult {
    // Claude Code stores credentials in ~/.config/claude/ (config.json with OAuth tokens)
    // Older versions / API-key flow used ~/.config/anthropic/
    const configDirs = [
        path.join(os.homedir(), '.config', 'claude'),
        path.join(os.homedir(), '.config', 'anthropic'),
    ];
    const hasConfig = configDirs.some(dir => {
        try {
            if (!fs.existsSync(dir)) return false;
            return fs.readdirSync(dir).some(f => {
                try { return fs.statSync(path.join(dir, f)).size > 0; } catch { return false; }
            });
        } catch { return false; }
    });

    // Check binary — search extended PATH so homebrew/npm-global are found
    const extPath = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH ?? ''}`;
    const binaryCheck = spawnSync('which', ['claude'], { encoding: 'utf-8', env: { ...process.env, PATH: extPath } });
    const hasBinary = binaryCheck.status === 0;

    if (!hasConfig && !hasBinary) {
        return { success: false, provider: 'claude-code', error: 'not_installed',
            message: 'Claude CLI not found. Use the Connect button to authenticate.' };
    }
    if (!hasConfig) {
        return { success: false, provider: 'claude-code', error: 'not_authenticated',
            message: 'Claude CLI found but not authenticated. Use the Connect button to sign in.' };
    }
    return { success: true, provider: 'claude-code',
        message: 'Claude CLI authenticated. Subscription active.',
        models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] };
}

/** Gemini CLI — check if OAuth creds file exists */
function testGeminiCli(): TestResult {
    const credsPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
    if (!fs.existsSync(credsPath)) {
        return { success: false, provider: 'gemini-cli', error: 'not_authenticated',
            message: 'Not signed in. Use the Connect button to authenticate with your Google account.' };
    }
    try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        const hasToken = !!(creds.refresh_token || creds.refreshToken || creds.token?.refresh_token);
        if (!hasToken) {
            return { success: false, provider: 'gemini-cli', error: 'invalid_creds',
                message: 'Gemini credentials file found but refresh token missing. Run: gemini auth' };
        }
        return { success: true, provider: 'gemini-cli',
            message: 'Gemini CLI OAuth credentials detected. Subscription active.',
            models: ['gemini-3.1-pro-preview', 'gemini-3.1-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] };
    } catch {
        return { success: false, provider: 'gemini-cli', error: 'invalid_creds',
            message: 'Could not read Gemini credentials. Run: gemini auth' };
    }
}

/** Gemini Antigravity (free tier) — check if in-app OAuth creds file exists */
function testGeminiAntigravity(): TestResult {
    const credsPath = path.join(os.homedir(), '.gemini', 'queenbee_antigravity_creds.json');
    if (!fs.existsSync(credsPath)) {
        return { success: false, provider: 'gemini-antigravity', error: 'not_authenticated',
            message: 'Not signed in. Use the Connect button to sign in with your Google account.' };
    }
    try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        const hasToken = !!(creds.refresh_token || creds.refreshToken);
        if (!hasToken) {
            return { success: false, provider: 'gemini-antigravity', error: 'invalid_creds',
                message: 'Credentials file found but refresh token missing. Reconnect via the Connect button.' };
        }
        return { success: true, provider: 'gemini-antigravity',
            message: 'Gemini Free credentials detected. Google account active.',
            models: ['gemini-3.1-pro-preview', 'gemini-3.1-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] };
    } catch {
        return { success: false, provider: 'gemini-antigravity', error: 'invalid_creds',
            message: 'Could not read credentials. Reconnect via the Connect button.' };
    }
}

async function testCustom(apiKey?: string, baseUrl?: string, model?: string): Promise<TestResult> {
    if (!baseUrl) {
        return {
            success: false,
            provider: 'custom',
            error: 'missing_url',
            message: 'Custom provider requires a base URL (OpenAI-compatible endpoint)'
        };
    }

    try {
        // Try to list models first
        const modelsUrl = baseUrl.endsWith('/') ? `${baseUrl}v1/models` : `${baseUrl}/v1/models`;

        const headers: Record<string, string> = {
            'User-Agent': 'QueenBee-Dashboard'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetchWithTimeout(modelsUrl, { headers });

        if (response.ok) {
            const data = await response.json();
            const models = data.data?.map((m: any) => m.id) || [];

            return {
                success: true,
                provider: 'custom',
                message: `Connected to custom endpoint! Found ${models.length} models.`,
                models: models.slice(0, 20)
            };
        }

        // If models endpoint fails, try a simple completion
        const completionUrl = baseUrl.endsWith('/') ? `${baseUrl}v1/chat/completions` : `${baseUrl}/v1/chat/completions`;

        const completionResponse = await fetchWithTimeout(completionUrl, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'default',
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 1
            })
        });

        if (completionResponse.ok) {
            return {
                success: true,
                provider: 'custom',
                message: 'Connected to custom endpoint! Completion API is working.',
                models: model ? [model] : []
            };
        }

        return {
            success: false,
            provider: 'custom',
            error: 'connection_failed',
            message: 'Could not connect to custom endpoint. Check URL and credentials.'
        };
    } catch (error: any) {
        return {
            success: false,
            provider: 'custom',
            error: error.name === 'AbortError' ? 'timeout' : 'network_error',
            message: error.name === 'AbortError' ? 'Connection timed out.' : `Network error: ${error.message}`
        };
    }
}
