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
  AlertCircle,
  X
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >

        {/* Header */}
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 backdrop-blur-md flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2 uppercase tracking-tight">
              <ShieldCheck className="text-blue-500" />
              Vault Identity
            </h2>
            <p className="text-xs text-zinc-500 mt-1 font-medium">Configure your AI stack and Forge identities.</p>
          </div>
          <div className="flex bg-zinc-100 rounded-xl p-1 gap-1 border border-zinc-200 shadow-inner">
            <TabButton active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} icon={<Cpu size={14} />} label="Identity" />
            <TabButton active={activeTab === 'forges'} onClick={() => setActiveTab('forges')} icon={<Github size={14} />} label="Forges" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
          <AnimatePresence mode="wait">

            {activeTab === 'identity' && (
              <motion.div
                key="identity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* API Key Section */}
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block ml-1">Master API Key</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-3 text-zinc-400" size={16} />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-12 pr-4 text-sm text-zinc-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-zinc-300 shadow-sm"
                    />
                    {apiKey.length > 10 && (
                      <div className="absolute right-4 top-3 text-emerald-500 animate-in zoom-in duration-300">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Preference Stack */}
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 block ml-1">Model Preference Tiering</label>
                  <div className="space-y-2">
                    {models.map((model, idx) => (
                      <div key={model.id} className="flex items-center gap-3 bg-white border border-zinc-200 p-3 rounded-2xl group hover:border-zinc-300 hover:shadow-sm transition-all">
                        <div className="text-zinc-300 cursor-grab active:cursor-grabbing hover:text-zinc-500 transition-colors">
                          <GripVertical size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-zinc-800 truncate">{model.name}</div>
                          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{model.tier}</div>
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => moveModel(idx, 'up')} 
                            disabled={idx === 0} 
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 disabled:opacity-20 transition-all"
                          >
                            <ChevronDown className="rotate-180" size={14} />
                          </button>
                          <button 
                            onClick={() => moveModel(idx, 'down')} 
                            disabled={idx === models.length - 1} 
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 disabled:opacity-20 transition-all"
                          >
                            <ChevronDown size={14} />
                          </button>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <ForgeCard
                  name="GitHub"
                  icon={<Github size={20} />}
                  description="Access private repositories and auto-PR workflows."
                  connected={false}
                />
                <ForgeCard
                  name="GitLab"
                  icon={<Gitlab size={20} className="text-orange-500" />}
                  description="Enterprise self-hosted CI/CD integration."
                  connected={true}
                  details="gitlab.company.com"
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 bg-white flex justify-between items-center">
          <button className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors uppercase tracking-widest">Skip for now</button>
          <button
            onClick={onComplete}
            className="px-8 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-black/10 transition-all flex items-center gap-2 active:scale-95"
          >
            Deploy Identity
          </button>
        </div>

      </motion.div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-400 hover:text-zinc-600'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const ForgeCard = ({ name, icon, description, connected, details }: any) => (
  <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex items-center justify-between hover:border-zinc-300 hover:shadow-sm transition-all group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-900 border border-zinc-100 group-hover:bg-white transition-colors shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-zinc-900 text-sm truncate">{name}</h4>
          {connected ? (
            <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">Connected</span>
          ) : (
            <span className="text-[8px] font-black bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 uppercase tracking-widest">Offline</span>
          )}
        </div>
        <p className="text-[11px] text-zinc-400 font-medium mt-0.5 truncate">{details || description}</p>
      </div>
    </div>
    <button className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${connected
        ? 'bg-zinc-100 text-rose-500 hover:bg-rose-50'
        : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-black/10'
      }`}>
      {connected ? 'Drop' : 'Link'}
    </button>
  </div>
);

const ChevronDown = ({ size, className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

export default UniversalAuthModal;