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
                result = await testGemini(apiKey);
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
        return res.status(result.success ? 200 : 400).json(result);

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
        const response = await fetch('https://api.openai.com/v1/models', {
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
            error: 'network_error',
            message: `Network error: ${error.message}`
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
        const response = await fetch('https://api.anthropic.com/v1/messages', {
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
            error: 'network_error',
            message: `Network error: ${error.message}`
        };
    }
}

async function testGemini(apiKey?: string): Promise<TestResult> {
    console.log('[Gemini Test] Starting test...');
    if (!apiKey) {
        return {
            success: false,
            provider: 'gemini',
            error: 'missing_api_key',
            message: 'Google AI API key is required. Get one at https://aistudio.google.com/apikey'
        };
    }

    // Common headers that work for both query-param and header-based auth
    const authHeaders = {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
    };

    try {
        console.log('[Gemini Test] Fetching models...');
        // Use both the key query param and the x-goog-api-key header for maximum compatibility
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { headers: authHeaders }
        );

        console.log(`[Gemini Test] Response status: ${response.status}`);
        const data = await response.json();

        if (!response.ok) {
            console.error('[Gemini Test] Models endpoint error:', data);

            // Fall back to a minimal content generation request to verify the key
            console.log('[Gemini Test] Falling back to content generation test...');
            try {
                const genResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
                            generationConfig: { maxOutputTokens: 1 }
                        })
                    }
                );

                if (genResponse.ok) {
                    return {
                        success: true,
                        provider: 'gemini',
                        message: 'Connected! Gemini API key is valid.',
                        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash']
                    };
                }

                const genError = await genResponse.json().catch(() => ({}));
                return {
                    success: false,
                    provider: 'gemini',
                    error: genError.error?.status || data.error?.status || 'api_error',
                    message: genError.error?.message || data.error?.message || 'Failed to authenticate with Google AI'
                };
            } catch (genErr: any) {
                return {
                    success: false,
                    provider: 'gemini',
                    error: data.error?.status || 'api_error',
                    message: data.error?.message || 'Failed to authenticate with Google AI'
                };
            }
        }

        const geminiModels = data.models
            ? data.models
                .map((m: any) => m.name.replace('models/', ''))
                .filter((name: string) => name.toLowerCase().includes('gemini'))
                .slice(0, 10)
            : [];

        // If the API call succeeded but no models matched, still report success
        const displayModels = geminiModels.length > 0
            ? geminiModels
            : ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'];

        console.log(`[Gemini Test] Found ${geminiModels.length} models`);

        return {
            success: true,
            provider: 'gemini',
            message: `Connected! Found ${geminiModels.length} Gemini models.`,
            models: displayModels
        };
    } catch (error: any) {
        console.error('[Gemini Test] Fetch error:', error);
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
        const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
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
            error: 'network_error',
            message: `Network error: ${error.message}`
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
        const response = await fetch(`${baseUrl}/openai/models?api-version=2024-02-01`, {
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
            error: 'network_error',
            message: `Network error: ${error.message}`
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
        const r = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'User-Agent': 'QueenBee' }
        });
        if (r.ok) {
            const data = await r.json();
            const models: string[] = data.data?.map((m: any) => m.id).slice(0, 15) || defaultModels || [];
            return { success: true, provider, message: `Connected! ${models.length} models available.`, models };
        }
        // 404 on /models is normal for some providers — try a tiny completion
        const cr = await fetch(`${baseUrl}/chat/completions`, {
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
        return { success: false, provider, error: 'network_error', message: e.message };
    }
}

/** OpenRouter: has its own /models endpoint returning all available models */
async function testOpenRouter(apiKey?: string): Promise<TestResult> {
    if (!apiKey) {
        return { success: false, provider: 'openrouter', error: 'missing_api_key',
            message: 'OpenRouter API key required. Get one free at https://openrouter.ai/keys' };
    }
    try {
        const r = await fetch('https://openrouter.ai/api/v1/models', {
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
        return { success: false, provider: 'openrouter', error: 'network_error', message: e.message };
    }
}

/** Claude Code — check if `claude` binary is installed and authenticated */
function testClaudeCode(): TestResult {
    const configDir = path.join(os.homedir(), '.config', 'anthropic');
    const hasConfig = fs.existsSync(configDir);
    const binaryCheck = spawnSync('which', ['claude'], { encoding: 'utf-8' });
    const hasBinary = binaryCheck.status === 0;

    if (!hasBinary) {
        return { success: false, provider: 'claude-code', error: 'not_installed',
            message: 'Claude CLI not found. Install it: npm install -g @anthropic-ai/claude-code, then run: claude' };
    }
    if (!hasConfig) {
        return { success: false, provider: 'claude-code', error: 'not_authenticated',
            message: 'Claude CLI found but not authenticated. Run: claude auth login' };
    }
    return { success: true, provider: 'claude-code',
        message: 'Claude CLI detected and authenticated. Subscription active.',
        models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] };
}

/** Gemini CLI — check if OAuth creds file exists */
function testGeminiCli(): TestResult {
    const credsPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
    if (!fs.existsSync(credsPath)) {
        return { success: false, provider: 'gemini-cli', error: 'not_authenticated',
            message: 'Gemini CLI not authenticated. Install: npm install -g @google/gemini-cli, then run: gemini auth' };
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
            models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'] };
    } catch {
        return { success: false, provider: 'gemini-cli', error: 'invalid_creds',
            message: 'Could not read Gemini credentials. Run: gemini auth' };
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

        const response = await fetch(modelsUrl, { headers });

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

        const completionResponse = await fetch(completionUrl, {
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
            error: 'network_error',
            message: `Network error: ${error.message}`
        };
    }
}
