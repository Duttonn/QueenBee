import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import CodexLayout from './components/layout/CodexLayout';
import LoginPage from './components/auth/LoginPage';
import AuthCallback from './components/auth/AuthCallback';
import OnboardingFlow from './components/auth/OnboardingFlow';
import { useAuthStore } from './store/useAuthStore';
import { useHiveStore } from './store/useHiveStore';
import { useSocketEvents } from './hooks/useSocketEvents';

function App() {
  const { isAuthenticated, isOnboarded, login, setOnboarded, connectForge, forges } = useAuthStore();
  const { initSocket } = useHiveStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCallback, setIsCallback] = useState(false);

  // Initialize Socket.io connection
  useEffect(() => {
    if (isAuthenticated && isOnboarded) {
      initSocket();
    }
  }, [isAuthenticated, isOnboarded, initSocket]);

  // Hook into socket events
  useSocketEvents();

  // Check if this is an OAuth callback  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const authData = params.get('auth_data');

    if (code || authData) {
      setIsCallback(true);
    }
  }, []);

  const handleLoginComplete = useCallback((data: any) => {
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
