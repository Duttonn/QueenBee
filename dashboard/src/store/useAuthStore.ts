import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NativeService } from '../services/NativeService';
import { API_BASE } from '../services/api';

export interface GitForge {
    id: 'github' | 'gitlab' | 'google';
    name: string;
    connected: boolean;
    username?: string;
    avatarUrl?: string;
    accessToken?: string;
    repositories?: any[];
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    plan: 'free' | 'pro' | 'enterprise';
}

interface AuthState {
    // User Profile
    user: UserProfile | null;
    isAuthenticated: boolean;
    isOnboarded: boolean;

    // AI Providers
    providers: AIProvider[];
    activeProviderId: string | null;

    // Git Forges
    forges: GitForge[];

    // Actions
    login: (user: UserProfile) => void;
    logout: () => void;
    setOnboarded: (value: boolean) => void;

    // Provider Actions
    addProvider: (provider: AIProvider) => void;
    updateProvider: (id: string, updates: Partial<AIProvider>) => void;
    removeProvider: (id: string) => void;
    setActiveProvider: (id: string) => void;
    reorderProviders: (fromIndex: number, toIndex: number) => void;
    saveApiKey: (id: string, key: string) => Promise<void>;
    loadApiKeys: () => Promise<void>;

    // Forge Actions
    connectForge: (forge: GitForge) => void;
    disconnectForge: (id: string) => void;
}

export type ProviderGroup = 'subscription' | 'hub' | 'flagship' | 'fast' | 'specialized' | 'local';

export interface AIProvider {
    id: string;
    name: string;
    icon: string;
    apiKey?: string;
    baseUrl?: string;
    connected: boolean;
    tier: number;
    models?: string[];
    authType: 'api_key' | 'oauth' | 'cli' | 'none';
    group: ProviderGroup;
    description?: string;
    keyPlaceholder?: string;
    docsUrl?: string;
}

const defaultProviders: AIProvider[] = [
    // ── Subscription CLIs (no API key — uses local CLI auth) ──────────────────
    {
        id: 'claude-code', name: 'Claude (Subscription)', icon: '🟣', group: 'subscription',
        connected: false, tier: 1, authType: 'cli',
        models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
        description: 'Use your Claude.ai Pro/Team subscription. Requires the claude CLI.',
        docsUrl: 'https://claude.ai/download'
    },
    {
        id: 'gemini-cli', name: 'Gemini (Subscription)', icon: '🔵', group: 'subscription',
        connected: false, tier: 2, authType: 'cli',
        models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
        description: 'Use your Google AI Pro subscription. Requires the Gemini CLI.',
        docsUrl: 'https://github.com/google-gemini/gemini-cli'
    },
    {
        id: 'gemini-antigravity', name: 'Google Antigravity', icon: '🌐', group: 'subscription',
        connected: false, tier: 3, authType: 'cli',
        models: ['gemini-3.1-pro-high', 'gemini-3.1-pro-low', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'claude-sonnet-4-6', 'claude-opus-4-6-thinking', 'gpt-oss-120b-medium'],
        description: 'Free-tier Gemini + Claude via Google account — no API key or CLI needed.',
        docsUrl: 'https://ai.google.dev/gemini-api/docs/oauth'
    },

    // ── Multi-model hubs ───────────────────────────────────────────────────────
    {
        id: 'openrouter', name: 'OpenRouter', icon: '🔀', group: 'hub',
        connected: false, tier: 3, authType: 'api_key',
        models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4-6', 'google/gemini-2.5-pro',
                 'meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-r1'],
        description: '200+ models with one key — GPT-4o, Claude, Gemini, Llama & more.',
        keyPlaceholder: 'sk-or-...', docsUrl: 'https://openrouter.ai/keys'
    },

    // ── Flagship API providers ─────────────────────────────────────────────────
    {
        id: 'openai', name: 'OpenAI', icon: '⚫', group: 'flagship',
        connected: false, tier: 4, authType: 'api_key',
        models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1', 'o3'],
        description: 'GPT-4o, o3, o1 and more.',
        keyPlaceholder: 'sk-...', docsUrl: 'https://platform.openai.com/api-keys'
    },
    {
        id: 'anthropic', name: 'Anthropic (API)', icon: '🧠', group: 'flagship',
        connected: false, tier: 5, authType: 'api_key',
        models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
        description: 'Direct Anthropic API. Billed separately from Claude.ai.',
        keyPlaceholder: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/'
    },
    {
        id: 'gemini', name: 'Google Gemini (API)', icon: '✨', group: 'flagship',
        connected: false, tier: 6, authType: 'api_key',
        models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
        description: 'Gemini API via Google AI Studio. Free tier available.',
        keyPlaceholder: 'AIza...', docsUrl: 'https://aistudio.google.com/apikey'
    },
    {
        id: 'mistral', name: 'Mistral AI', icon: '🌬️', group: 'flagship',
        connected: false, tier: 7, authType: 'api_key',
        models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'mistral-nemo'],
        description: 'European AI. Codestral is great for code generation.',
        keyPlaceholder: '...', docsUrl: 'https://console.mistral.ai/api-keys'
    },

    // ── Fast inference ─────────────────────────────────────────────────────────
    {
        id: 'groq', name: 'Groq', icon: '⚡', group: 'fast',
        connected: false, tier: 8, authType: 'api_key',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        description: 'Ultra-fast inference, generous free tier. 500+ req/day free.',
        keyPlaceholder: 'gsk_...', docsUrl: 'https://console.groq.com/keys'
    },
    {
        id: 'deepseek', name: 'DeepSeek', icon: '🌊', group: 'fast',
        connected: false, tier: 9, authType: 'api_key',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        description: 'DeepSeek V3 & R1 reasoning. Very low cost.',
        keyPlaceholder: 'sk-...', docsUrl: 'https://platform.deepseek.com/api_keys'
    },
    {
        id: 'cerebras', name: 'Cerebras', icon: '🧪', group: 'fast',
        connected: false, tier: 10, authType: 'api_key',
        models: ['llama3.1-70b', 'llama3.1-8b', 'llama-3.3-70b'],
        description: 'World\'s fastest inference. 2000+ tokens/sec.',
        keyPlaceholder: 'csk-...', docsUrl: 'https://cloud.cerebras.ai/platform'
    },

    // ── Specialized ────────────────────────────────────────────────────────────
    {
        id: 'xai', name: 'xAI (Grok)', icon: '𝕏', group: 'specialized',
        connected: false, tier: 11, authType: 'api_key',
        models: ['grok-3', 'grok-3-mini', 'grok-3-fast'],
        description: 'Grok 3 by xAI. Real-time X/Twitter data access.',
        keyPlaceholder: 'xai-...', docsUrl: 'https://console.x.ai/'
    },
    {
        id: 'perplexity', name: 'Perplexity', icon: '🔍', group: 'specialized',
        connected: false, tier: 12, authType: 'api_key',
        models: ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning'],
        description: 'Real-time web search + LLM. Great for research tasks.',
        keyPlaceholder: 'pplx-...', docsUrl: 'https://www.perplexity.ai/settings/api'
    },
    {
        id: 'cohere', name: 'Cohere', icon: '🔗', group: 'specialized',
        connected: false, tier: 13, authType: 'api_key',
        models: ['command-r-plus', 'command-r', 'command-r-08-2024'],
        description: 'Command R+ excels at RAG and enterprise use cases.',
        keyPlaceholder: '...', docsUrl: 'https://dashboard.cohere.com/api-keys'
    },
    {
        id: 'together', name: 'Together AI', icon: '🤝', group: 'specialized',
        connected: false, tier: 14, authType: 'api_key',
        models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'deepseek-ai/DeepSeek-V3',
                 'Qwen/Qwen2.5-Coder-32B-Instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
        description: 'Open-weight models at low cost. Great for fine-tuned models.',
        keyPlaceholder: '...', docsUrl: 'https://api.together.ai/settings/api-keys'
    },
    {
        id: 'fireworks', name: 'Fireworks AI', icon: '🎆', group: 'specialized',
        connected: false, tier: 15, authType: 'api_key',
        models: ['accounts/fireworks/models/llama-v3p3-70b-instruct',
                 'accounts/fireworks/models/deepseek-v3',
                 'accounts/fireworks/models/qwen2p5-coder-32b-instruct'],
        description: 'Fast serving of open-weight models.',
        keyPlaceholder: 'fw_...', docsUrl: 'https://fireworks.ai/account/api-keys'
    },
    {
        id: 'nvidia', name: 'NVIDIA NIM', icon: '🟢', group: 'specialized',
        connected: false, tier: 16, authType: 'api_key',
        models: ['meta/llama-3.3-70b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct'],
        description: 'NVIDIA optimized inference for Llama and more.',
        keyPlaceholder: 'nvapi-...', docsUrl: 'https://build.nvidia.com/'
    },

    // ── Local (no auth, no data leaves machine) ────────────────────────────────
    {
        id: 'ollama', name: 'Ollama (Local)', icon: '🦙', group: 'local',
        connected: false, tier: 17, authType: 'none',
        baseUrl: 'http://localhost:11434',
        models: ['llama3.3', 'mistral', 'codellama', 'qwen2.5-coder', 'deepseek-coder-v2'],
        description: 'Run any model locally. 100% private. Install at ollama.com.',
        docsUrl: 'https://ollama.com'
    },
    {
        id: 'lmstudio', name: 'LM Studio (Local)', icon: '🖥️', group: 'local',
        connected: false, tier: 18, authType: 'none',
        baseUrl: 'http://localhost:1234',
        models: ['local-model'],
        description: 'Run GGUF models locally with a GUI. Private and offline.',
        docsUrl: 'https://lmstudio.ai'
    },
];

const defaultForges: GitForge[] = [
    { id: 'github', name: 'GitHub', connected: false },
    { id: 'gitlab', name: 'GitLab', connected: false },
    { id: 'google', name: 'Google', connected: false },
];

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isOnboarded: false,
            providers: defaultProviders,
            activeProviderId: null,
            forges: defaultForges,

            login: (user) => set({ user, isAuthenticated: true }),

            logout: () => set({
                user: null,
                isAuthenticated: false,
                isOnboarded: false,
                providers: defaultProviders.map(p => ({ ...p, connected: false, apiKey: undefined })),
                forges: defaultForges.map(f => ({ ...f, connected: false, accessToken: undefined })),
                activeProviderId: null,
            }),

            setOnboarded: (value) => set({ isOnboarded: value }),

            addProvider: (provider) => set((state) => ({
                providers: [...state.providers, provider],
            })),

            updateProvider: (id, updates) => set((state) => ({
                providers: state.providers.map((p) =>
                    p.id === id ? { ...p, ...updates } : p
                ),
                activeProviderId: updates.connected === true && !state.activeProviderId
                    ? id
                    : state.activeProviderId,
            })),

            removeProvider: (id) => set((state) => ({
                providers: state.providers.filter((p) => p.id !== id),
                activeProviderId: state.activeProviderId === id
                    ? state.providers.find(p => p.id !== id && p.connected)?.id || null
                    : state.activeProviderId,
            })),

            setActiveProvider: (id) => set({ activeProviderId: id }),

            reorderProviders: (fromIndex, toIndex) => set((state) => {
                const newProviders = [...state.providers];
                const [removed] = newProviders.splice(fromIndex, 1);
                newProviders.splice(toIndex, 0, removed);
                return {
                    providers: newProviders.map((p, i) => ({ ...p, tier: i + 1 })),
                };
            }),

            saveApiKey: async (id, key) => {
                // 1. Encrypt + store locally
                const encrypted = await NativeService.storage.encrypt(key);
                localStorage.setItem(`queen-bee-sec-${id}`, encrypted);
                // 2. Persist to backend (auth-profile-store + hot-register in UnifiedLLMService)
                const provider = get().providers.find(p => p.id === id);
                try {
                    await fetch(`${API_BASE}/api/providers/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ provider: id, apiKey: key, baseUrl: provider?.baseUrl }),
                    });
                } catch (e) {
                    console.warn('[AuthStore] Backend persist failed (non-fatal):', e);
                }
                set((state) => ({
                    providers: state.providers.map(p => p.id === id ? { ...p, apiKey: key, connected: true } : p)
                }));
            },

            loadApiKeys: async () => {
                const { providers } = get();
                const updatedProviders = await Promise.all(providers.map(async (p) => {
                    const encrypted = localStorage.getItem(`queen-bee-sec-${p.id}`);
                    if (encrypted) {
                        try {
                            const decrypted = await NativeService.storage.decrypt(encrypted);
                            return { ...p, apiKey: decrypted, connected: true };
                        } catch (e) {
                            console.error(`Failed to decrypt key for ${p.id}`, e);
                        }
                    }
                    return p;
                }));
                set({ providers: updatedProviders });
            },

            connectForge: (forge) => set((state) => ({
                forges: state.forges.map((f) =>
                    f.id === forge.id ? { ...f, ...forge, connected: true } : f
                ),
            })),

            disconnectForge: (id) => set((state) => ({
                forges: state.forges.map((f) =>
                    f.id === id ? { ...f, connected: false, accessToken: undefined, username: undefined, avatarUrl: undefined } : f
                ),
            })),
        }),
        {
            name: 'queen-bee-auth',
            version: 14, // v14: restore gemini-2.5-{pro,flash,lite} to antigravity model list
            migrate: (persisted: any, version: number) => {
                const state = persisted as any;
                if (state?.providers) {
                    // Add any new providers missing from persisted state
                    const existingIds = new Set(state.providers.map((p: any) => p.id));
                    const newOnes = defaultProviders.filter(p => !existingIds.has(p.id));
                    if (newOnes.length > 0) {
                        state.providers = [...state.providers, ...newOnes];
                    }
                    // Always sync models for these providers from defaultProviders (IDs were wrong before v13)
                    const ALWAYS_SYNC = new Set(['gemini-antigravity', 'gemini-cli']);
                    state.providers = state.providers.map((p: any) => {
                        const def = defaultProviders.find(d => d.id === p.id);
                        if (!def?.models) return p;
                        if (ALWAYS_SYNC.has(p.id)) {
                            return { ...p, models: def.models };
                        }
                        // For other providers: merge (add new, keep existing)
                        const existing = new Set(p.models || []);
                        const merged = [...(p.models || []), ...def.models.filter((m: string) => !existing.has(m))];
                        return { ...p, models: merged };
                    });
                }
                return state;
            },
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                isOnboarded: state.isOnboarded,
                providers: state.providers.map(p => {
                    const { apiKey, ...rest } = p;
                    return rest;
                }),
                forges: state.forges,
                activeProviderId: state.activeProviderId,
            }),
        }
    )
);
