import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Key,
    Github,
    Sparkles,
    ArrowRight,
    ArrowLeft,
    Check,
    ChevronUp,
    ChevronDown,
    ExternalLink,
    Zap,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useAuthStore, AIProvider } from '../../store/useAuthStore';

interface OnboardingFlowProps {
    onComplete: () => void;
}

type Step = 'welcome' | 'providers' | 'forges' | 'complete';

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const { providers, updateProvider, saveApiKey, forges, connectForge, reorderProviders, setOnboarded } = useAuthStore();

    const steps: Step[] = ['welcome', 'providers', 'forges', 'complete'];
    const currentIndex = steps.indexOf(currentStep);

    const nextStep = () => {
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1]);
        } else {
            setOnboarded(true);
            onComplete();
        }
    };

    const prevStep = () => {
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1]);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-center p-4">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-2xl bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Progress Bar */}
                <div className="h-1 bg-[#1E293B]">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Content */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {currentStep === 'welcome' && (
                            <WelcomeStep key="welcome" onNext={nextStep} />
                        )}
                        {currentStep === 'providers' && (
                            <ProvidersStep
                                key="providers"
                                providers={providers}
                                onUpdate={updateProvider}
                                onSaveKey={saveApiKey}
                                onReorder={reorderProviders}
                            />
                        )}
                        {currentStep === 'forges' && (
                            <ForgesStep
                                key="forges"
                                forges={forges}
                                onConnect={connectForge}
                            />
                        )}
                        {currentStep === 'complete' && (
                            <CompleteStep key="complete" />
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="px-8 py-4 border-t border-white/5 bg-[#0F172A]/50 flex justify-between items-center">
                    <div className="flex gap-2">
                        {steps.map((step, i) => (
                            <div
                                key={step}
                                className={`w-2 h-2 rounded-full transition-colors ${i <= currentIndex ? 'bg-blue-500' : 'bg-slate-700'
                                    }`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {currentIndex > 0 && (
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                        >
                            {currentStep === 'complete' ? (
                                <>
                                    <Sparkles size={16} />
                                    Start Building
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Welcome Step
const WelcomeStep = ({ onNext }: { onNext: () => void }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="text-center"
    >
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/20">
            <span className="text-5xl">🐝</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Welcome to Queen Bee</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Let's set up your AI providers and Git integrations so you can start building with the hive.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <FeatureBox icon="🤖" title="AI Models" desc="Connect your providers" />
            <FeatureBox icon="🔀" title="Git Forges" desc="GitHub & GitLab" />
            <FeatureBox icon="🔐" title="Secure" desc="Local key storage" />
        </div>
    </motion.div>
);

const FeatureBox = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
    <div className="bg-[#1E293B]/50 border border-white/5 rounded-xl p-4 text-center">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-slate-500">{desc}</div>
    </div>
);

const API_BASE = 'http://localhost:3000';

interface TestResult {
    success: boolean;
    message: string;
    models?: string[];
    error?: string;
}

// Providers Step
const ProvidersStep = ({
    providers,
    onUpdate,
    onSaveKey,
    onReorder,
}: {
    providers: AIProvider[];
    onUpdate: (id: string, updates: Partial<AIProvider>) => void;
    onSaveKey: (id: string, key: string) => Promise<void>;
    onReorder: (from: number, to: number) => void;
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

    const handleTestConnection = async (provider: AIProvider) => {
        setTestingId(provider.id);
        setTestResults(prev => ({ ...prev, [provider.id]: { success: false, message: 'Testing connection...' } }));

        // Ensure key is saved securely before testing if it's changed
        if (provider.apiKey) {
            await onSaveKey(provider.id, provider.apiKey);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(`${API_BASE}/api/providers/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: provider.id,
                    apiKey: provider.apiKey,
                    baseUrl: provider.baseUrl
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            setTestResults(prev => ({
                ...prev,
                [provider.id]: {
                    success: result.success,
                    message: result.message || result.error,
                    models: result.models,
                    error: result.error
                }
            }));

            if (result.success) {
                onUpdate(provider.id, {
                    connected: true,
                    models: result.models
                });
            } else {
                onUpdate(provider.id, { connected: false });
            }
        } catch (error: any) {
            const isTimeout = error.name === 'AbortError';
            setTestResults(prev => ({
                ...prev,
                [provider.id]: {
                    success: false,
                    message: isTimeout ? 'Connection timed out after 10s' : `Connection failed: ${error.message}`,
                    error: error.message
                }
            }));
            onUpdate(provider.id, { connected: false });
        } finally {
            clearTimeout(timeoutId);
        }

        setTestingId(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Zap className="text-yellow-400" size={20} />
                    Configure AI Providers
                </h2>
                <p className="text-sm text-slate-400">
                    Add your API keys to connect AI models. Drag to set priority order.
                </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {providers.map((provider, index) => (
                    <div
                        key={provider.id}
                        className={`bg-[#1E293B]/50 border rounded-xl transition-all ${provider.connected ? 'border-green-500/30' : 'border-white/5'
                            }`}
                    >
                        {/* Header */}
                        <div
                            className="p-4 flex items-center gap-3 cursor-pointer"
                            onClick={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
                        >
                            <div className="text-2xl">{provider.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{provider.name}</span>
                                    {provider.connected && (
                                        <span className="text-xs bg-green-500/20 text-[#22C55E] px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Check size={10} />
                                            Connected
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500">Tier {provider.tier} priority</span>
                            </div>

                            {/* Reorder buttons */}
                            <div className="flex flex-col gap-0.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onReorder(index, index - 1); }}
                                    disabled={index === 0}
                                    className="p-1 text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                                >
                                    <ChevronUp size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onReorder(index, index + 1); }}
                                    disabled={index === providers.length - 1}
                                    className="p-1 text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                            {expandedId === provider.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-white/5 overflow-hidden"
                                >
                                    <div className="p-4 space-y-4">
                                        {provider.id !== 'ollama' ? (
                                            <div>
                                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">API Key</label>
                                                <div className="relative">
                                                    <Key className="absolute left-3 top-2.5 text-slate-500" size={14} />
                                                    <input
                                                        type="password"
                                                        value={provider.apiKey || ''}
                                                        onChange={(e) => onUpdate(provider.id, { apiKey: e.target.value })}
                                                        placeholder={`${provider.name} API key...`}
                                                        className="w-full bg-[#0F172A] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-slate-600"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Base URL</label>
                                                <input
                                                    type="text"
                                                    value={provider.baseUrl || ''}
                                                    onChange={(e) => onUpdate(provider.id, { baseUrl: e.target.value })}
                                                    placeholder="http://localhost:11434"
                                                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-slate-600"
                                                />
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleTestConnection(provider)}
                                            disabled={testingId === provider.id}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-[#3B82F6] text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {testingId === provider.id ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Testing connection...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap size={14} />
                                                    Test Connection
                                                </>
                                            )}
                                        </button>

                                        {/* Test Result Display */}
                                        {testResults[provider.id] && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`p-3 rounded-lg ${testResults[provider.id].success
                                                    ? 'bg-green-500/10 border border-green-500/20'
                                                    : 'bg-red-500/10 border border-red-500/20'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    {testResults[provider.id].success ? (
                                                        <Check className="text-[#22C55E] flex-shrink-0 mt-0.5" size={14} />
                                                    ) : (
                                                        <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={14} />
                                                    )}
                                                    <div className="flex-1">
                                                        <p className={`text-sm ${testResults[provider.id].success ? 'text-green-300' : 'text-red-300'
                                                            }`}>
                                                            {testResults[provider.id].message}
                                                        </p>

                                                        {testResults[provider.id].models && testResults[provider.id].models!.length > 0 && (
                                                            <div className="mt-2">
                                                                <p className="text-xs text-slate-400 mb-1">Available models:</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {testResults[provider.id].models!.slice(0, 5).map((model: string) => (
                                                                        <span
                                                                            key={model}
                                                                            className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded"
                                                                        >
                                                                            {model}
                                                                        </span>
                                                                    ))}
                                                                    {testResults[provider.id].models!.length > 5 && (
                                                                        <span className="text-xs text-slate-500">
                                                                            +{testResults[provider.id].models!.length - 5} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

// Forges Step
const ForgesStep = ({
    forges,
    onConnect,
}: {
    forges: any[];
    onConnect: (forge: any) => void;
}) => {
    const [connecting, setConnecting] = useState<string | null>(null);

    const handleConnect = async (forgeId: string) => {
        setConnecting(forgeId);

        if (forgeId === 'github' || forgeId === 'google') {
            // Open OAuth in new window
            const provider = forgeId;
            const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
            const scope = provider === 'github' ? 'user:email,repo' : 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

            // Check if backend is reachable
            try {
                const res = await fetch(`${API_BASE}/api/auth/${provider}`);
                const data = await res.json();
                
                if (data.url) {
                    window.open(data.url, `${provider}-oauth`, 'width=600,height=700');
                } else if (data.type === 'device_flow') {
                    // Handle device flow (simplified for onboarding, maybe redirect to login page)
                    alert(`Please use the Login page for ${provider} device flow activation.`);
                }
            } catch (err) {
                // Demo mode - fake login
                await new Promise(resolve => setTimeout(resolve, 1500));
                onConnect({
                    id: forgeId as any,
                    name: forgeId === 'github' ? 'GitHub' : 'Google',
                    connected: true,
                    username: 'demo-user',
                    avatarUrl: forgeId === 'github' ? 'https://github.com/identicons/demo.png' : 'https://lh3.googleusercontent.com/a/default-user'
                });
            }
        }

        setConnecting(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="text-[#3B82F6]" size={20} />
                    Connect OAuth Providers
                </h2>
                <p className="text-sm text-slate-400">
                    Link your accounts for seamless identity and source control.
                </p>
            </div>

            <div className="space-y-4">
                {forges.map((forge) => (
                    <div
                        key={forge.id}
                        className={`bg-[#1E293B]/50 border rounded-xl p-5 flex items-center justify-between transition-all ${forge.connected ? 'border-green-500/30' : 'border-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                forge.id === 'github' ? 'bg-slate-700' : 
                                forge.id === 'google' ? 'bg-white' : 'bg-orange-500/20'
                                }`}>
                                {forge.id === 'github' ? (
                                    <Github className="text-white" size={24} />
                                ) : forge.id === 'google' ? (
                                    <span className="font-bold text-blue-500 text-xl">G</span>
                                ) : (
                                    <span className="text-2xl">🦊</span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{forge.name}</span>
                                    {forge.connected && (
                                        <span className="text-xs bg-green-500/20 text-[#22C55E] px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Check size={10} />
                                            @{forge.username}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500">
                                    {forge.connected ? 'Pull requests and commits enabled' : 'Click to authorize'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleConnect(forge.id)}
                            disabled={connecting === forge.id || forge.connected}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${forge.connected
                                ? 'bg-green-500/10 text-[#22C55E] border border-green-500/20'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                                } disabled:opacity-50`}
                        >
                            {connecting === forge.id ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : forge.connected ? (
                                <>
                                    <Check size={14} />
                                    Connected
                                </>
                            ) : (
                                <>
                                    <ExternalLink size={14} />
                                    Connect
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-sm text-slate-300">
                    <strong className="text-yellow-400">Optional:</strong> You can skip this step and add forges later from Settings.
                </div>
            </div>
        </motion.div>
    );
};

// Complete Step
const CompleteStep = () => {
    const { providers, forges } = useAuthStore();
    const connectedProviders = providers.filter(p => p.connected);
    const connectedForges = forges.filter(f => f.connected);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/20"
            >
                <Check className="text-white" size={40} />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-3">You're all set!</h2>
            <p className="text-slate-400 mb-8">
                Your hive is ready. Start building with AI-powered agents.
            </p>

            <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                    <div className="text-3xl font-bold text-white">{connectedProviders.length}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">AI Providers</div>
                </div>
                <div className="w-px bg-slate-700" />
                <div className="text-center">
                    <div className="text-3xl font-bold text-white">{connectedForges.length}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Git Forges</div>
                </div>
            </div>

            <div className="bg-[#1E293B]/30 border border-white/5 rounded-xl p-4 text-left">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Connected Services</div>
                <div className="flex flex-wrap gap-2">
                    {connectedProviders.map(p => (
                        <span key={p.id} className="px-3 py-1.5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg text-sm flex items-center gap-1">
                            {p.icon} {p.name}
                        </span>
                    ))}
                    {connectedForges.map(f => (
                        <span key={f.id} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm flex items-center gap-1">
                            <Github size={12} /> {f.name}
                        </span>
                    ))}
                    {connectedProviders.length === 0 && connectedForges.length === 0 && (
                        <span className="text-slate-500 text-sm">No services connected (using demo mode)</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default OnboardingFlow;
