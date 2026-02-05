import React, { useState } from 'react';

/**
 * AuthProviderCard - A visually appealing card for individual AI providers
 */
const AuthProviderCard = ({ name, icon, status, onConnect }: any) => (
  <div onClick={onConnect} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
    <div className="flex items-center justify-between mb-4">
      <div className="text-2xl">{icon}</div>
      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
      }`}>
        {status === 'connected' ? '● CONNECTED' : 'DISCONNECTED'}
      </div>
    </div>
    <h4 className="font-bold text-slate-800 text-lg">{name}</h4>
    <p className="text-xs text-slate-500 mb-4">Connect via OAuth or API Key to enable agents.</p>
    <button 
      className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold group-hover:bg-blue-600 transition-colors"
    >
      {status === 'connected' ? 'Configure' : 'Connect'}
    </button>
  </div>
);

/**
 * UniversalAuthModal - The pretty UI replacement for command-line auth
 */
const UniversalAuthModal = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState('github'); // 'github' | 'llm-selection' | 'oauth' | 'apikey'
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  const providers = [
    { id: 'google', name: 'Google Gemini', icon: '💎', status: 'disconnected' },
    { id: 'openai', name: 'OpenAI GPT-4', icon: '🤖', status: 'disconnected' },
    { id: 'anthropic', name: 'Anthropic Claude', icon: '🏮', status: 'disconnected' },
    { id: 'ollama', name: 'Ollama (Local)', icon: '🦙', status: 'connected' },
  ];

  const handleGitHubLogin = () => {
    // Simulate GitHub OAuth delay
    setTimeout(() => {
      setStep('llm-selection');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-50 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 bg-white border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-900">
            {step === 'github' ? 'Welcome to Queen Bee' : 'Configure Intelligence'}
          </h2>
          <p className="text-slate-500 text-sm">
            {step === 'github' ? 'Please sign in to access your repositories and workspace.' : 'Select your primary LLM agent backend.'}
          </p>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          
          {/* STEP 1: GitHub Login */}
          {step === 'github' && (
            <div className="flex flex-col items-center py-10">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-3xl text-white mb-6">
                🐙
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Connect to GitHub</h3>
              <p className="text-center text-slate-500 text-sm mb-8 max-w-xs">
                We need access to your repositories to manage worktrees and pull requests.
              </p>
              <button 
                onClick={handleGitHubLogin}
                className="flex items-center gap-3 bg-[#24292F] text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
              >
                <span>Continue with GitHub</span>
              </button>
            </div>
          )}

          {/* STEP 2: LLM Selection */}
          {step === 'llm-selection' && (
            <div className="grid grid-cols-2 gap-4">
              {providers.map(p => (
                <AuthProviderCard 
                  key={p.id} 
                  {...p} 
                  onConnect={() => {
                    setSelectedProvider(p);
                    setStep('oauth');
                  }} 
                />
              ))}
            </div>
          )}

          {/* STEP 3: OAuth Flow */}
          {step === 'oauth' && (
            <div className="flex flex-col items-center py-10 text-center animate-in fade-in zoom-in duration-300">
              <div className="text-5xl mb-6">🔗</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Connect {selectedProvider.name}</h3>
              <p className="text-slate-500 text-sm mb-8 max-w-sm">
                We'll open a secure window for you to authorize Codex Hive.
              </p>
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 mb-6 text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">VPS REDIRECT MODE</div>
                <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-600 break-all border border-slate-100">
                  http://localhost:1/?state=...
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setStep('llm-selection')} className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl">Back</button>
                <button 
                  onClick={() => onComplete()}
                  className="flex-2 py-3 bg-blue-600 text-white font-bold rounded-xl px-10 hover:bg-blue-500"
                >
                  Authorize & Complete
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold tracking-widest uppercase">
          Codex Security Protocol v1.0 • AES-256 Encrypted
        </div>
      </div>
    </div>
  );
};

export default UniversalAuthModal;
