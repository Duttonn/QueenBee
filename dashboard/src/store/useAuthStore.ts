import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NativeService } from '../services/NativeService';

export interface AIProvider {
    id: string;
    name: string;
    icon: string;
    apiKey?: string;
    baseUrl?: string;
    connected: boolean;
    tier: number;
    models?: string[];
}

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

const defaultProviders: AIProvider[] = [
    { id: 'openai', name: 'OpenAI', icon: '🤖', connected: false, tier: 1, models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🧠', connected: false, tier: 2, models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
    { id: 'gemini', name: 'Google Gemini', icon: '✨', connected: false, tier: 3, models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
    { id: 'ollama', name: 'Ollama (Local)', icon: '🦙', connected: false, tier: 4, baseUrl: 'http://localhost:11434', models: ['llama3', 'mistral', 'codellama'] },
    { id: 'nvidia', name: 'NVIDIA NIM', icon: '🟢', connected: false, tier: 5, models: ['meta/llama3-70b-instruct'] },
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
                const encrypted = await NativeService.storage.encrypt(key);
                localStorage.setItem(`queen-bee-sec-${id}`, encrypted);
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
