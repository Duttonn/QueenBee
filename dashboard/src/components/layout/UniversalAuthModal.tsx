import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Github,
  Gitlab,
  Cpu,
  ShieldCheck,
  GripVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const UniversalAuthModal = ({ onComplete }: { onComplete: () => void }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'forges'>('identity');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState([
    { id: 'gpt4', name: 'OpenAI GPT-4', tier: 'Tier 1: High Reasoning', active: true },
    { id: 'claude3', name: 'Claude 3 Opus', tier: 'Tier 1: Fallback', active: true },
    { id: 'gemini', name: 'Gemini 1.5 Pro', tier: 'Tier 2: Fast', active: true },
    { id: 'local', name: 'Ollama (Llama 3)', tier: 'Tier 3: Local', active: true },
  ]);

  const moveModel = (index: number, direction: 'up' | 'down') => {
    const newModels = [...models];
    if (direction === 'up' && index > 0) {
      [newModels[index], newModels[index - 1]] = [newModels[index - 1], newModels[index]];
    } else if (direction === 'down' && index < newModels.length - 1) {
      [newModels[index], newModels[index + 1]] = [newModels[index + 1], newModels[index]];
    }
    setModels(newModels);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >

        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-[#0F172A]/50 backdrop-blur-md flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-blue-500" />
              Universal Identity
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Configure your AI models and Source Control identities.</p>
          </div>
          <div className="flex bg-zinc-950/50 rounded-lg p-1 gap-1 border border-white/5">
            <TabButton active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} icon={<Cpu size={14} />} label="Identity" />
            <TabButton active={activeTab === 'forges'} onClick={() => setActiveTab('forges')} icon={<Github size={14} />} label="Forges" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0F172A]/30">
          <AnimatePresence mode="wait">

            {activeTab === 'identity' && (
              <motion.div
                key="identity"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* API Key Section */}
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">OpenAI API Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-zinc-700"
                    />
                    {apiKey.length > 10 && (
                      <div className="absolute right-3 top-2.5 text-green-500">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Preference Stack */}
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Model Preference Stack (Tiering)</label>
                  <div className="space-y-2">
                    {models.map((model, idx) => (
                      <div key={model.id} className="flex items-center gap-3 bg-zinc-950/50 border border-white/5 p-3 rounded-lg group hover:border-white/10 transition-colors shadow-sm">
                        <div className="text-zinc-600 cursor-grab active:cursor-grabbing hover:text-zinc-400 transition-colors">
                          <GripVertical size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-zinc-200">{model.name}</div>
                          <div className="text-[10px] text-zinc-500">{model.tier}</div>
                        </div>

                        {/* Reorder Buttons (Mock) */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveModel(idx, 'up')} disabled={idx === 0} className="text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">▲</button>
                          <button onClick={() => moveModel(idx, 'down')} disabled={idx === models.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">▼</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'forges' && (
              <motion.div
                key="forges"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <ForgeCard
                  name="GitHub"
                  icon={<Github size={24} />}
                  description="Connect to access private repositories and PRs."
                  connected={false}
                />
                <ForgeCard
                  name="GitLab"
                  icon={<Gitlab size={24} className="text-orange-500" />}
                  description="Enterprise self-hosted instance."
                  connected={true}
                  details="https://gitlab.internal.com"
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#0F172A]/50 backdrop-blur-md flex justify-end gap-3">
          <button className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">Skip for now</button>
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 active:scale-95"
          >
            Save & Continue
          </button>
        </div>

      </motion.div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${active ? 'bg-blue-600 text-white shadow shadow-blue-900/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const ForgeCard = ({ name, icon, description, connected, details }: any) => (
  <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors shadow-sm">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-[#0F172A] rounded-full flex items-center justify-center text-white border border-white/5">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-zinc-200">{name}</h4>
          {connected ? (
            <span className="text-[10px] bg-green-900/20 text-[#22C55E] px-1.5 py-0.5 rounded border border-green-900/30">Connected</span>
          ) : (
            <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-white/5">Not Connected</span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{details || description}</p>
      </div>
    </div>
    <button className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${connected
        ? 'border-red-900/30 text-red-400 hover:bg-red-900/20'
        : 'border-blue-600/50 text-[#3B82F6] hover:bg-blue-900/20 hover:border-blue-500'
      }`}>
      {connected ? 'Disconnect' : 'Connect'}
    </button>
  </div>
);

export default UniversalAuthModal;
