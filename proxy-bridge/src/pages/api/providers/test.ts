import type { NextApiRequest, NextApiResponse } from 'next';

type Provider = 'openai' | 'anthropic' | 'gemini' | 'nvidia' | 'ollama' | 'azure' | 'custom';

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

            case 'custom':
                result = await testCustom(apiKey, baseUrl, model);
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: `Unknown provider: ${provider}`,
                    message: 'Supported providers: openai, anthropic, gemini, nvidia, ollama, azure, custom'
                });
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

    try {
        console.log('[Gemini Test] Fetching models...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        console.log(`[Gemini Test] Response status: ${response.status}`);
        const data = await response.json();

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
                .slice(0, 10)
            : [];

        console.log(`[Gemini Test] Found ${geminiModels.length} models`);

        return {
            success: true,
            provider: 'gemini',
            message: `Connected! Found ${geminiModels.length} Gemini models.`,
            models: geminiModels
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
