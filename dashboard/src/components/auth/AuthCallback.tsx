import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Github } from 'lucide-react';
import { API_BASE } from '../../store/useAppStore';

interface AuthCallbackProps {
    onSuccess: (data: any) => void;
    onError: (error: string) => void;
}

/**
 * Handles the GitHub OAuth callback
 * Exchanges the authorization code for user data
 */
const AuthCallback = ({ onSuccess, onError }: AuthCallbackProps) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Authenticating with GitHub...');
    const [userData, setUserData] = useState<any>(null);
    const processedRef = React.useRef(false);

    useEffect(() => {
        if (processedRef.current) return;

        const handleCallback = async () => {
            processedRef.current = true;

            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');
            const errorDescription = params.get('error_description');

            // Log everything for debugging
            console.log('Auth Callback Debug:', {
                href: window.location.href,
                search: window.location.search,
                code,
                error,
                hasAuthData: !!params.get('auth_data')
            });

            // 1. Handle OAuth Errors from GitHub/Backend
            if (error) {
                setStatus('error');
                setMessage(errorDescription || `GitHub returned an error: ${error}`);
                onError(errorDescription || error);
                return;
            }

            // 2. Check for missing data
            const authDataParam = params.get('auth_data');
            if (!code && !authDataParam) {
                setStatus('error');
                setMessage('No authorization code or data received');
                onError('No authorization code received');
                return;
            }

            // 3. Skip State Check for now (Local Dev issues)
            // const storedState = sessionStorage.getItem('oauth_state');
            // if (storedState && state !== storedState) ...

            try {
                // 4. Case A: Process Pre-Computed Data (Redirect from Backend)
                if (authDataParam) {
                    setMessage('Processing authentication data...');
                    const data = JSON.parse(decodeURIComponent(authDataParam));

                    if (!data.success) {
                        throw new Error(data.message || 'Authentication failed');
                    }

                    completeLogin(data);
                    return;
                }

                // 5. Case B: Process Authorization Code (Direct Callback)
                setMessage('Exchanging authorization code...');
                const response = await fetch(`${API_BASE}/api/auth/github/callback?code=${code}&state=${state}`);
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to authenticate');
                }

                completeLogin(data);

            } catch (err: any) {
                console.error('Auth Error:', err);
                setStatus('error');
                setMessage(err.message || 'Authentication failed');
                onError(err.message);
            }
        };

        const completeLogin = (data: any) => {
            setMessage('Authentication successful!');
            setUserData(data.user);
            setStatus('success');

            // Clear stored state
            sessionStorage.removeItem('oauth_state');

            // Clean URL
            try {
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                // Ignore history errors
            }

            // Proceed after delay
            setTimeout(() => {
                onSuccess(data);
            }, 500);
        };

        handleCallback();
    }, [onSuccess, onError]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md w-full text-center"
            >
                {/* Status Icon */}
                <div className="mb-6">
                    {status === 'loading' && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center"
                        >
                            <Loader2 className="text-[#3B82F6]" size={32} />
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center"
                        >
                            <CheckCircle2 className="text-[#22C55E]" size={32} />
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center"
                        >
                            <AlertCircle className="text-red-400" size={32} />
                        </motion.div>
                    )}
                </div>

                {/* User Info (on success) */}
                {status === 'success' && userData && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4"
                    >
                        <img
                            src={userData.avatarUrl}
                            alt={userData.name}
                            className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-green-500/50"
                        />
                        <h3 className="text-lg font-bold text-white">{userData.name}</h3>
                        <p className="text-sm text-slate-400">@{userData.login}</p>
                    </motion.div>
                )}

                {/* Message */}
                <h2 className={`text-xl font-semibold mb-2 ${status === 'error' ? 'text-red-400' :
                    status === 'success' ? 'text-[#22C55E]' :
                        'text-white'
                    }`}>
                    {status === 'loading' ? 'Connecting...' :
                        status === 'success' ? 'Welcome!' :
                            'Authentication Failed'}
                </h2>

                <p className="text-sm text-slate-400 mb-6">{message}</p>

                {/* Error Action */}
                {status === 'error' && (
                    <button
                        onClick={() => window.location.href = '/'}
                        className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Github size={16} />
                        Try Again
                    </button>
                )}
            </motion.div>
        </div>
    );
};

export default AuthCallback;
