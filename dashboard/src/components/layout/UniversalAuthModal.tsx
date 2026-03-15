import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Key, Check, AlertCircle, Loader2, ChevronDown, ChevronRight,
  ExternalLink, Terminal, Cpu, Globe, Zap, Sparkles, Shield, LogIn, RefreshCw, Copy
} from 'lucide-react';
import { useAuthStore, AIProvider, ProviderGroup } from '../../store/useAuthStore';
import { API_BASE } from '../../services/api';

interface UniversalAuthModalProps {
  onComplete: () => void;
  /** When true, renders in onboarding style (full screen, no X button) */
  onboarding?: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  models?: string[];
  error?: string;
}

// ─── Group metadata ────────────────────────────────────────────────────────────
const GROUP_META: Record<ProviderGroup, { label: string; icon: React.ReactNode; desc: string }> = {
  subscription: {
    label: 'Subscription CLIs',
    icon: <Sparkles size={14} />,
    desc: 'Use an existing subscription — no extra API key needed',
  },
  hub: {
    label: 'Multi-Model Hubs',
    icon: <Globe size={14} />,
    desc: 'One key, hundreds of models',
  },
  flagship: {
    label: 'Flagship API Providers',
    icon: <Cpu size={14} />,
    desc: 'Direct access to the leading AI labs',
  },
  fast: {
    label: 'Fast Inference',
    icon: <Zap size={14} />,
    desc: 'Blazing fast, often with a generous free tier',
  },
  specialized: {
    label: 'Specialized Providers',
    icon: <Shield size={14} />,
    desc: 'Purpose-built for specific use cases',
  },
  local: {
    label: 'Local Models',
    icon: <Terminal size={14} />,
    desc: '100% private — no data leaves your machine',
  },
};

const GROUP_ORDER: ProviderGroup[] = ['subscription', 'hub', 'flagship', 'fast', 'specialized', 'local'];

// ─── Main Modal ────────────────────────────────────────────────────────────────
const UniversalAuthModal = ({ onComplete, onboarding = false }: UniversalAuthModalProps) => {
  const { providers, updateProvider, saveApiKey } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [activeGroup, setActiveGroup] = useState<ProviderGroup>('subscription');

  // Auto-detect CLI providers on open
  useEffect(() => {
    ['claude-code', 'gemini-cli', 'ollama', 'lmstudio'].forEach(id => {
      handleDetect(id);
    });
  }, []); // eslint-disable-line

  const connectedCount = providers.filter(p => p.connected).length;

  const handleDetect = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/providers/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id }),
      });
      const result: TestResult & { success: boolean } = await res.json();
      setTestResults(prev => ({ ...prev, [id]: result }));
      if (result.success) {
        updateProvider(id, { connected: true, models: result.models });
      }
    } catch {
      // silent — local providers just won't show as detected
    } finally {
      setTestingId(null);
    }
  };

  const handleTest = async (provider: AIProvider) => {
    const key = keyInputs[provider.id] ?? provider.apiKey ?? '';
    setTestingId(provider.id);
    setTestResults(prev => ({ ...prev, [provider.id]: { success: false, message: 'Testing…' } }));

    try {
      const res = await fetch(`${API_BASE}/api/providers/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: key || undefined,
          baseUrl: provider.baseUrl,
        }),
      });
      const result: TestResult & { success: boolean } = await res.json();
      setTestResults(prev => ({ ...prev, [provider.id]: result }));

      if (result.success) {
        await saveApiKey(provider.id, key);
        updateProvider(provider.id, { connected: true, models: result.models ?? provider.models });
      } else {
        updateProvider(provider.id, { connected: false });
      }
    } catch (e: any) {
      setTestResults(prev => ({
        ...prev,
        [provider.id]: { success: false, message: `Network error: ${e.message}` },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    updateProvider(id, { connected: false });
    localStorage.removeItem(`queen-bee-sec-${id}`);
    try {
      await fetch(`${API_BASE}/api/providers/save`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id }),
      });
    } catch {}
    setTestResults(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const grouped = GROUP_ORDER.reduce<Record<ProviderGroup, AIProvider[]>>((acc, g) => {
    acc[g] = providers.filter(p => p.group === g);
    return acc;
  }, {} as any);

  const content = (
    <div className={onboarding ? '' : 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 ${
          onboarding ? 'w-full' : 'w-full max-w-2xl max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">AI Providers</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {connectedCount === 0
                ? 'Connect at least one provider to start'
                : `${connectedCount} provider${connectedCount !== 1 ? 's' : ''} connected`}
            </p>
          </div>
          {!onboarding && (
            <button onClick={onComplete} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
              <X size={18} className="text-zinc-400" />
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Group sidebar */}
          <div className="w-44 flex-shrink-0 border-r border-zinc-100 bg-zinc-50/50 py-2">
            {GROUP_ORDER.map(g => {
              const meta = GROUP_META[g];
              const groupProviders = grouped[g] ?? [];
              const connectedInGroup = groupProviders.filter(p => p.connected).length;
              return (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors text-xs font-semibold ${
                    activeGroup === g
                      ? 'bg-white text-zinc-900 shadow-sm border-r-2 border-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/80'
                  }`}
                >
                  <span className="opacity-70">{meta.icon}</span>
                  <span className="flex-1 truncate">{meta.label}</span>
                  {connectedInGroup > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                      {connectedInGroup}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Provider list */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <p className="text-[11px] text-zinc-400 mb-3 font-medium">
                {GROUP_META[activeGroup].desc}
              </p>
              <div className="space-y-2">
                {(grouped[activeGroup] ?? []).map(provider => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    expanded={expandedId === provider.id}
                    onToggle={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
                    keyValue={keyInputs[provider.id] ?? ''}
                    onKeyChange={v => setKeyInputs(prev => ({ ...prev, [provider.id]: v }))}
                    testing={testingId === provider.id}
                    testResult={testResults[provider.id]}
                    onTest={() => handleTest(provider)}
                    onDetect={() => handleDetect(provider.id)}
                    onDisconnect={() => handleDisconnect(provider.id)}
                    onUrlChange={v => updateProvider(provider.id, { baseUrl: v })}
                    onAuthSuccess={(models) => {
                      updateProvider(provider.id, { connected: true, ...(models ? { models } : {}) });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 flex-shrink-0 bg-zinc-50/30">
          <p className="text-xs text-zinc-400">
            Keys are encrypted and stored locally. Never sent to external servers.
          </p>
          <button
            onClick={onComplete}
            disabled={connectedCount === 0 && onboarding}
            className="px-5 py-2 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {onboarding ? (connectedCount > 0 ? 'Continue →' : 'Connect a provider first') : 'Done'}
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (onboarding) return content;
  return <AnimatePresence>{content}</AnimatePresence>;
};

// ─── CLI Auth Flow ─────────────────────────────────────────────────────────────

const CliAuthFlow: React.FC<{
  provider: AIProvider;
  onSuccess: (models?: string[]) => void;
  onDetect: () => void;
}> = ({ provider, onSuccess, onDetect }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'success' | 'error' | 'install_needed'>('idle');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [installCmd, setInstallCmd] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const evtRef = useRef<EventSource | null>(null);

  const openUrl = (url: string) => {
    // Electron shell or browser
    const w = window as any;
    if (w.electron?.shell?.openExternal) {
      w.electron.shell.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const copyText = (text: string) => { try { navigator.clipboard.writeText(text); } catch {} };

  const startAuth = () => {
    setStatus('connecting');
    setAuthUrl(null);
    setLog([]);
    setMessage('');

    const es = new EventSource(`${API_BASE}/api/auth/cli-login-stream?provider=${provider.id}`);
    evtRef.current = es;

    // Use POST via fetch + ReadableStream instead of EventSource (EventSource doesn't support POST)
    es.close();
    evtRef.current = null;

    fetch(`${API_BASE}/api/auth/cli-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: provider.id }),
    }).then(async (res) => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            handleEvent(ev);
          } catch {}
        }
      }
      if (status !== 'success' && status !== 'error') setStatus('error');
    }).catch(err => {
      setMessage(`Connection error: ${err.message}`);
      setStatus('error');
    });
  };

  const handleEvent = (ev: any) => {
    switch (ev.type) {
      case 'status':
        setStatus('waiting');
        setMessage(ev.message);
        break;
      case 'url':
        setAuthUrl(ev.url);
        setStatus('waiting');
        // Auto-open
        openUrl(ev.url);
        break;
      case 'output':
        setLog(prev => [...prev.slice(-30), ev.text.trim()].filter(Boolean));
        break;
      case 'install_needed':
        setInstallCmd(ev.installCmd);
        setStatus('install_needed');
        setMessage(ev.message);
        break;
      case 'success':
        setStatus('success');
        setMessage(ev.message);
        onSuccess();
        break;
      case 'error':
        setStatus('error');
        setMessage(ev.message);
        break;
    }
  };

  if (status === 'idle') {
    return (
      <button
        onClick={startAuth}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
      >
        <LogIn size={13} /> Connect with {provider.id === 'claude-code' ? 'Claude.ai' : 'Google'}
      </button>
    );
  }

  if (status === 'install_needed') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <p>{message} Install it first:</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2">
          <code className="text-[11px] text-green-400 font-mono flex-1">{installCmd}</code>
          <button onClick={() => copyText(installCmd)} className="text-zinc-400 hover:text-zinc-200 flex-shrink-0">
            <Copy size={11} />
          </button>
        </div>
        <button
          onClick={onDetect}
          className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
        >
          <RefreshCw size={12} /> Check again after installing
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs">
        <Check size={13} className="flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Auth URL */}
      {authUrl && (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-500">A browser window should have opened. If not:</p>
          <button
            onClick={() => openUrl(authUrl)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink size={12} /> Open authentication page
          </button>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {status === 'connecting' || status === 'waiting' ? (
          <Loader2 size={12} className="animate-spin flex-shrink-0 text-zinc-400" />
        ) : status === 'error' ? (
          <AlertCircle size={12} className="flex-shrink-0 text-red-400" />
        ) : null}
        <span>{message || 'Starting…'}</span>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-zinc-950 rounded-xl p-3 max-h-28 overflow-y-auto">
          {log.map((l, i) => (
            <div key={i} className="text-[10px] font-mono text-zinc-400 leading-relaxed">{l}</div>
          ))}
        </div>
      )}

      {/* Error actions */}
      {status === 'error' && (
        <div className="flex gap-2">
          <button
            onClick={startAuth}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800"
          >
            <RefreshCw size={11} /> Retry
          </button>
          <button
            onClick={onDetect}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200"
          >
            <Check size={11} /> Check credentials
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Provider Card ─────────────────────────────────────────────────────────────
interface ProviderCardProps {
  provider: AIProvider;
  expanded: boolean;
  onToggle: () => void;
  keyValue: string;
  onKeyChange: (v: string) => void;
  testing: boolean;
  testResult?: TestResult;
  onTest: () => void;
  onDetect: () => void;
  onDisconnect: () => void;
  onUrlChange: (v: string) => void;
  onAuthSuccess: (models?: string[]) => void;
}

const ProviderCard = ({
  provider, expanded, onToggle, keyValue, onKeyChange,
  testing, testResult, onTest, onDetect, onDisconnect, onUrlChange, onAuthSuccess,
}: ProviderCardProps) => {
  const isCli = provider.authType === 'cli';
  const isLocal = provider.authType === 'none';
  const needsKey = provider.authType === 'api_key';

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      provider.connected ? 'border-emerald-200 bg-emerald-50/30' : 'border-zinc-200 bg-white'
    }`}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-50/50 transition-colors"
      >
        <span className="text-xl w-8 text-center flex-shrink-0">{provider.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 truncate">{provider.name}</span>
            {provider.connected && (
              <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                <Check size={9} /> Connected
              </span>
            )}
            {isCli && (
              <span className="flex-shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                CLI Auth
              </span>
            )}
            {isLocal && (
              <span className="flex-shrink-0 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                Local
              </span>
            )}
          </div>
          {!expanded && provider.description && (
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{provider.description}</p>
          )}
        </div>
        <span className="text-zinc-300 flex-shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-100">
              {provider.description && (
                <p className="text-xs text-zinc-500 pt-3">{provider.description}</p>
              )}

              {/* CLI / subscription providers — in-app auth flow */}
              {isCli && !provider.connected && (
                <CliAuthFlow
                  provider={provider}
                  onSuccess={onAuthSuccess}
                  onDetect={onDetect}
                />
              )}

              {/* Local providers */}
              {isLocal && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Server URL</label>
                  <input
                    type="text"
                    value={provider.baseUrl || ''}
                    onChange={e => onUrlChange(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder={provider.id === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
                  />
                </div>
              )}

              {/* API key providers */}
              {needsKey && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Key size={10} /> API Key
                  </label>
                  <input
                    type="password"
                    value={keyValue}
                    onChange={e => onKeyChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onTest(); }}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder={provider.keyPlaceholder || 'API key…'}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Test result */}
              {testResult && (
                <div className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
                  testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {testResult.success
                    ? <Check size={13} className="flex-shrink-0 mt-0.5" />
                    : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-medium">{testResult.message}</p>
                    {testResult.models && testResult.models.length > 0 && (
                      <p className="text-[10px] mt-0.5 opacity-70">
                        Models: {testResult.models.slice(0, 4).join(', ')}{testResult.models.length > 4 ? ` +${testResult.models.length - 4} more` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isLocal ? (
                  <button
                    onClick={onDetect}
                    disabled={testing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Terminal size={12} />}
                    {testing ? 'Detecting…' : 'Detect'}
                  </button>
                ) : isCli ? null : (
                  <button
                    onClick={onTest}
                    disabled={testing || (!keyValue && !provider.apiKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  >
                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {testing ? 'Testing…' : (provider.connected ? 'Re-test' : 'Test & Save')}
                  </button>
                )}

                {provider.connected && (
                  <button
                    onClick={onDisconnect}
                    className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                )}

                {provider.docsUrl && (
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    Get key <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Connected models preview */}
              {provider.connected && provider.models && provider.models.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {provider.models.slice(0, 6).map(m => (
                    <span key={m} className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-mono">
                      {m.split('/').pop()}
                    </span>
                  ))}
                  {provider.models.length > 6 && (
                    <span className="text-[10px] text-zinc-400">+{provider.models.length - 6} more</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UniversalAuthModal;
