import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Sparkles, ArrowRight, Zap, Shield, GitBranch, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { SystemService } from '../../services/SystemService';
import { API_BASE } from '../../services/api';

interface LoginPageProps {
    onLoginComplete: (data: any) => void;
}

const LoginPage = ({ onLoginComplete }: LoginPageProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
    const [setupInstructions, setSetupInstructions] = useState<any>(null);
    const [isBackendOffline, setIsBackendOffline] = useState(false);

    const [deviceFlowData, setDeviceFlowData] = useState<any>(null);

    // Initial mount log
    React.useEffect(() => {
        SystemService.logs.log('info', 'LoginPage: Component Mounted');
    }, []);

    // Heartbeat for Loading State
    React.useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => {
            SystemService.logs.log('info', `LoginPage: Still loading... (State: ${waitingMessage ? 'Waiting for Browser' : 'Connecting to Backend'})`);
        }, 5000);
        return () => clearInterval(interval);
    }, [isLoading, waitingMessage]);

    // Listen for auth success from deep link (Electron)
    React.useEffect(() => {
        SystemService.logs.log('info', 'LoginPage: Registering onAuthSuccess listener');
        return SystemService.auth.onAuthSuccess((data: any) => {
            SystemService.logs.log('info', 'LoginPage: Received push auth data');
            onLoginComplete(data);
        });
    }, [onLoginComplete]);

    // Check for cached auth on mount (if push was missed)
    React.useEffect(() => {
        SystemService.logs.log('info', 'LoginPage: Checking for cached auth');
        SystemService.storage.getCachedAuth().then((data: any) => {
            if (data) {
                SystemService.logs.log('info', 'LoginPage: Found cached auth data');
                onLoginComplete(data);
            }
        });
    }, [onLoginComplete]);

    // Check backend status on mount and poll
    React.useEffect(() => {
        const checkBackend = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    setIsBackendOffline(false);
                } else {
                    setIsBackendOffline(true);
                }
            } catch (err) {
                setIsBackendOffline(true);
            }
        };

        checkBackend();
        const interval = setInterval(checkBackend, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleGitHubLogin = async () => {
        SystemService.logs.log('info', 'LoginPage: handleGitHubLogin clicked');
        setIsLoading(true);
        setError(null);
        setWaitingMessage(null);
        setSetupInstructions(null);
        setDeviceFlowData(null);

        try {
            SystemService.logs.log('info', `LoginPage: Fetching strategy from ${API_BASE}/api/auth/github`);
            
            // Detect Electron environment
            const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
            const mode = isElectron ? 'electron' : 'web';

            // Get Auth Strategy from backend
            const response = await fetch(`${API_BASE}/api/auth/github?mode=${mode}`);
            const data = await response.json();

            SystemService.logs.log('info', `LoginPage: Strategy received: ${data.type || 'web'}`);

            if (!response.ok) {
                if (data.setup) {
                    setSetupInstructions(data.setup);
                }
                throw new Error(data.message || 'Failed to initiate GitHub login');
            }

            if (data.type === 'device_flow') {
                // Handle Device Flow
                setDeviceFlowData(data);
                setIsLoading(false);
                startPolling(data.device_code, data.interval);
            } else {
                // Handle Web Flow
                sessionStorage.setItem('oauth_state', data.state);
                
                // Detect Electron environment
                const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;

                // If in Electron, open in external browser
                if (isElectron) {
                    if (data.url) {
                        SystemService.logs.log('info', `LoginPage: Opening URL: ${data.url.substring(0, 50)}...`);
                        SystemService.shell.openExternal(data.url);
                        setWaitingMessage('Please complete login in your browser...');
                    } else {
                        throw new Error('Backend did not return an authorization URL');
                    }
                    setIsLoading(false);
                } else {
                    window.location.href = data.url;
                }
            }

        } catch (err: any) {
            const message = err.message === 'Failed to fetch' 
                ? `Could not connect to Proxy Bridge (${API_BASE}). Is the backend running?`
                : err.message;
            
            SystemService.logs.log('error', `LoginPage: Login failed: ${message}`);
            
            setError(message);
            setIsLoading(false);
        }
    };

    const startPolling = async (deviceCode: string, interval: number) => {
        const pollInterval = (interval || 5) * 1000;

        const poll = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/auth/github/poll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_code: deviceCode })
                });

                const data = await res.json();

                if (data.status === 'complete') {
                    // Login successful!
                    onLoginComplete({
                        user: data.user,
                        accessToken: data.access_token
                    });
                } else if (data.error === 'expired_token') {
                    setError('Login session expired. Please try again.');
                    setDeviceFlowData(null);
                } else if (data.error === 'access_denied') {
                    setError('Access denied by user.');
                    setDeviceFlowData(null);
                } else {
                    // Continue polling
                    setTimeout(poll, pollInterval);
                }
            } catch (err) {
                console.error('Polling error:', err);
                // Don't stop polling on network hiccups unless fatal
                setTimeout(poll, pollInterval);
            }
        };

        // Start loop
        setTimeout(poll, pollInterval);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/5 via-transparent to-transparent rounded-full" />

                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo & Title */}
                <div className="text-center mb-10">
                    {isBackendOffline && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-left"
                        >
                            <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                            <div>
                                <p className="text-xs font-bold text-amber-500 uppercase">Proxy Bridge Offline</p>
                                <p className="text-[10px] text-amber-200/70">Start it with `npm run dev` in the proxy-bridge folder. Some features may be limited.</p>
                            </div>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/20"
                    >
                        <span className="text-4xl">🐝</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold text-white mb-2"
                    >
                        Queen Bee
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-400 text-sm"
                    >
                        AI-Powered Development Orchestration
                    </motion.p>
                </div>

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-[#0F172A]/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
                >
                    {/* Features List */}
                    <div className="space-y-3 mb-8">
                        <Feature icon={<Zap size={16} />} text="Multi-LLM support with automatic fallback" />
                        <Feature icon={<GitBranch size={16} />} text="Git worktree isolation for safe experimentation" />
                        <Feature icon={<Shield size={16} />} text="Secure API key management" />
                    </div>

                    {/* Device Flow UI */}
                    {waitingMessage ? (
                        <div className="py-10 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
                                <Loader2 className="text-[#3B82F6] animate-spin" size={32} />
                            </div>
                            <p className="text-sm text-slate-300 font-medium">{waitingMessage}</p>
                            <button 
                                onClick={() => setWaitingMessage(null)}
                                className="text-xs text-slate-500 hover:text-slate-400"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : deviceFlowData ? (
                        <div className="space-y-6 text-center">
                            <div className="p-6 bg-[#1E293B]/50 rounded-xl border border-white/10">
                                <h3 className="text-sm text-slate-400 mb-2">Device Activation Code</h3>
                                <div className="text-4xl font-mono font-bold text-amber-400 tracking-wider mb-4">
                                    {deviceFlowData.user_code}
                                </div>
                                <p className="text-xs text-slate-500 mb-6">
                                    Copy this code and paste it at the verification URL
                                </p>

                                <a
                                    href={deviceFlowData.verification_uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                                >
                                    Open GitHub Activation <ExternalLink size={16} />
                                </a>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                <Loader2 size={12} className="animate-spin" />
                                Waiting for you to authorize...
                            </div>
                        </div>
                    ) : setupInstructions ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
                                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                                    <Github size={16} />
                                    Setup GitHub Integration
                                </h3>
                                <p className="text-xs text-slate-400 mb-4">
                                    To connect your GitHub account, you need to create a GitHub App once.
                                    <a href="https://github.com/settings/applications/new" target="_blank" rel="noreferrer" className="text-[#3B82F6] hover:text-blue-300 ml-1 inline-flex items-center gap-0.5">
                                        Create App <ExternalLink size={10} />
                                    </a>
                                </p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Client ID</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                            placeholder="Ov23..."
                                            id="client_id"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Client Secret</label>
                                        <input
                                            type="password"
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                            placeholder="e4d2..."
                                            id="client_secret"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    const clientId = (document.getElementById('client_id') as HTMLInputElement).value;
                                    const clientSecret = (document.getElementById('client_secret') as HTMLInputElement).value;

                                    if (!clientId || !clientSecret) {
                                        setError('Please enter both Client ID and Client Secret');
                                        return;
                                    }

                                    setIsLoading(true);
                                    try {
                                        const res = await fetch(`${API_BASE}/api/auth/github/setup`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ clientId, clientSecret })
                                        });

                                        if (!res.ok) throw new Error('Failed to save credentials');

                                        // Retry login immediately
                                        handleGitHubLogin();
                                    } catch (err: any) {
                                        setError(err.message);
                                        setIsLoading(false);
                                    }
                                }}
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save & Connect'}
                            </button>

                            <div className="text-[10px] text-slate-500 text-center">
                                Credentials will be saved to your local .env file
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Error Display */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm text-red-300">{error}</p>
                                </div>
                            )}

                            {/* GitHub Login Button */}
                            <button
                                onClick={handleGitHubLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-white/5 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Connecting to GitHub...</span>
                                    </>
                                ) : (
                                    <>
                                        <Github size={20} />
                                        <span>Continue with GitHub</span>
                                        <ArrowRight size={16} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                                    </>
                                )}
                            </button>

                            {/* Google Login Button */}
                            <button
                                onClick={() => {
                                    const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
                                    const mode = isElectron ? 'electron' : 'web';
                                    window.location.href = `${API_BASE}/api/auth/login?provider=google&mode=${mode}`;
                                }}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-white/5 group mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="font-bold text-blue-500">G</span>
                                <span>Continue with Google</span>
                                <ArrowRight size={16} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                            </button>

                            {/* Dev Bypass Button */}
                            <button
                                onClick={() => onLoginComplete({
                                    user: {
                                        id: 'dev-user',
                                        name: 'Dev User',
                                        email: 'dev@example.com',
                                        avatarUrl: 'https://github.com/ghost.png',
                                        login: 'dev-user'
                                    },
                                    accessToken: 'mock-token'
                                })}
                                className="w-full flex items-center justify-center gap-3 bg-[#1E293B] hover:bg-slate-700 text-slate-300 font-semibold py-2 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-black/20 group mt-4 border border-white/5"
                            >
                                <Shield size={16} />
                                <span>Dev Bypass</span>
                            </button>

                            {/* Info */}
                            <p className="mt-4 text-xs text-center text-slate-500">
                                This will give Queen Bee access to your repositories
                            </p>
                        </>
                    )}
                </motion.div>

                {/* Footer Links */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex justify-center gap-6 mt-8"
                >
                    <a
                        href="https://github.com/settings/developers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                        <ExternalLink size={12} />
                        GitHub Developer Settings
                    </a>
                    <a
                        href="#"
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        Documentation
                    </a>
                </motion.div>
            </motion.div>
        </div>
    );
};

const Feature = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div className="flex items-center gap-3 text-slate-300">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-[#3B82F6]">
            {icon}
        </div>
        <span className="text-sm">{text}</span>
    </div>
);

export default LoginPage;
