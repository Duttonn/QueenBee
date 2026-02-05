import React, { useState } from 'react';

/**
 * AuthProviderCard - A visually appealing card for individual AI providers
 */
const AuthProviderCard = ({ name, icon, status, onConnect }: any) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
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
      onClick={onConnect}
      className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold group-hover:bg-blue-600 transition-colors"
    >
      {status === 'connected' ? 'Configure' : 'Connect'}
    </button>
  </div>
);

/**
 * UniversalAuthModal - The pretty UI replacement for command-line auth
 */
const UniversalAuthModal = () => {
  const [step, setStep] = useState('grid'); // 'grid' | 'oauth' | 'apikey'
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  const providers = [
    { id: 'google', name: 'Google Gemini', icon: '💎', status: 'connected' },
    { id: 'nvidia', name: 'NVIDIA NIM', icon: '🟢', status: 'disconnected' },
    { id: 'anthropic', name: 'Anthropic Claude', icon: '🏮', status: 'disconnected' },
    { id: 'ollama', name: 'Ollama (Local)', icon: '🦙', status: 'connected' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-50 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 bg-white border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-900">Intelligence Hub</h2>
          <p className="text-slate-500 text-sm">Manage your AI providers and authentication profiles.</p>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          {step === 'grid' && (
            <div className="grid grid-cols-2 gap-4">
              {providers.map(p => (
                <AuthProviderCard 
                  key={p.id} 
                  {...p} 
                  onConnect={() => {
                    setSelectedProvider(p);
                    setStep(p.id === 'google' ? 'oauth' : 'apikey');
                  }} 
                />
              ))}
            </div>
          )}

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
                <button onClick={() => setStep('grid')} className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl">Back</button>
                <button className="flex-2 py-3 bg-blue-600 text-white font-bold rounded-xl px-10">Open Browser</button>
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
