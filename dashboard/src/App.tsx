import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import CodexLayout from './components/layout/CodexLayout';
import LoginPage from './components/auth/LoginPage';
import AuthCallback from './components/auth/AuthCallback';
import OnboardingFlow from './components/auth/OnboardingFlow';
import { useAuthStore } from './store/useAuthStore';
import { useHiveStore } from './store/useHiveStore';
import { useSocketEvents } from './hooks/useSocketEvents'; // Added for TASK-03
import { useDebugLogger } from './hooks/useDebugLogger';
import { SystemService } from './services/SystemService';

function App() {
  const { isAuthenticated, isOnboarded, login, setOnboarded, connectForge, forges, loadApiKeys } = useAuthStore();
  const { initSocket, fetchProjects } = useHiveStore(); // Destructure initSocket and fetchProjects
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCallback, setIsCallback] = useState(false);

  useDebugLogger();

  // Load secure API keys once on mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  // Initialize Socket.io connection if authenticated and onboarded
  useEffect(() => {
    if (isAuthenticated && isOnboarded) {
      initSocket().then(() => {
        fetchProjects();
      });
    }
  }, [isAuthenticated, isOnboarded]);

      // Global Log Relay to Backend
      const { socket } = useHiveStore();
      useEffect(() => {
        if (!socket || (window as any).__QUEEN_BEE_LOGS_PATCHED__) return;
  
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalDebug = console.debug;
        
        (window as any).__QUEEN_BEE_LOGS_PATCHED__ = true;
        let isRelaying = false;
  
        const relay = (type: string, args: any[]) => {
          if (isRelaying) return;
          
          // BP-16: Log Noise Filter
          const messageStr = args.map(arg => String(arg)).join(' ');
          const noisePatterns = [
            'Rendering:', 
            'Fetching tasks', 
            'Projects loaded', 
            'Socket connected', 
            'Setting activeThreadId',
            'heartbeat',
            'Checking if target directory',
            'Encountered two children with the same key'
          ];
          
          if (noisePatterns.some(p => messageStr.includes(p))) return;

          isRelaying = true;
          try {
            socket.emit('LOG_RELAY', {
              type,
              message: args.map(arg => {
                try {
                  return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                } catch (e) {
                  return '[Unserializable Object]';
                }
              }).join(' '),
              timestamp: new Date().toISOString()
            });
          } finally {
            isRelaying = false;
          }
        };
    console.log = (...args) => {
      relay('info', args);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      relay('error', args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      relay('warn', args);
      originalWarn.apply(console, args);
    };

    console.log('[App] Log relay initialized');

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [socket]);

  // Hook into socket events
  useSocketEvents(); // Added for TASK-03

  // Check if this is an OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const authData = params.get('auth_data');

    if (code || authData) {
      setIsCallback(true);
    }
  }, []);

  const handleLoginComplete = useCallback((data: any) => {
    SystemService.logs.log('info', `App: handleLoginComplete started for ${data.user?.login}`);

    // Save user data to store
    login({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl,
      plan: 'pro'
    });

    // Connect GitHub forge with the received token
    connectForge({
      id: 'github',
      name: 'GitHub',
      connected: true,
      username: data.user.login,
      avatarUrl: data.user.avatarUrl,
      accessToken: data.accessToken,
      repositories: data.repositories
    });

    // Show onboarding for AI provider setup
    setShowOnboarding(true);
    setIsCallback(false);

    SystemService.logs.log('info', 'App: handleLoginComplete finished');
  }, [login, connectForge]);

  const handleAuthError = useCallback((error: string) => {
    console.error('Auth error:', error);
    // Do not redirect automatically, allow AuthCallback to show the error
    // window.location.href = '/';
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    setOnboarded(true);
  }, [setOnboarded]);

  // Show OAuth callback handler
  if (isCallback) {
    return (
      <AuthCallback
        onSuccess={handleLoginComplete}
        onError={handleAuthError}
      />
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage onLoginComplete={handleLoginComplete} />
    );
  }

  // Show onboarding if authenticated but not onboarded
  if (showOnboarding || !isOnboarded) {
    return (
      <OnboardingFlow onComplete={handleOnboardingComplete} />
    );
  }

  // Show main dashboard
  return (
    <AnimatePresence mode="wait">
      <CodexLayout />
    </AnimatePresence>
  );
}

export default App;
