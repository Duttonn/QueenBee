import React from 'react';
import { Sparkles, ArrowUp, Plus, Search, Layers, ShieldCheck, Mic, Loader2, ChevronDown, Zap, Play } from 'lucide-react';

export const ComposerBarUI: React.FC<{
  value?: string;
  isGenerating?: boolean;
  showPlanApproval?: boolean;
}> = ({ value = '', isGenerating = false, showPlanApproval = false }) => {
  return (
    <div className="absolute bottom-6 left-4 right-4 sm:left-0 sm:right-0 sm:mx-auto sm:w-full sm:max-w-3xl sm:px-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
        {/* Plan Approval Bar (when applicable) */}
        {showPlanApproval && (
          <div className="px-4 pt-3 pb-2 border-b border-amber-100 bg-amber-50/50 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap size={13} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-[9px] font-black text-amber-600/70 uppercase tracking-widest leading-none mb-0.5">Architect Plan Ready</div>
                  <div className="text-[11px] font-semibold text-zinc-600">Review and approve to launch workers</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-500 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all">Revise</button>
                <button className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md">
                  <span className="flex items-center gap-1.5"><Play size={10} fill="currentColor" />Approve & Launch</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 pt-3">
          <textarea
            className="w-full bg-transparent text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none min-h-[44px] text-sm leading-relaxed"
            placeholder="Ask Queen Bee anything, @ to add files, / for commands..."
            value={value}
            readOnly
          />
        </div>

        {/* Bottom Controls */}
        <div className="px-3 pb-3 pt-1 flex items-center justify-between bg-zinc-50 border-t border-zinc-100 rounded-b-3xl">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-600 transition-all" title="Attach Files">
              <Plus size={18} strokeWidth={1.5} />
            </button>

            <div className="w-px h-4 bg-zinc-200 mx-1"></div>

            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
              {['local', 'worktree', 'cloud'].map((m, i) => (
                <button key={m} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${i === 0 ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  {m}
                </button>
              ))}
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded-xl">
              <span>Claude 3.5</span>
              <ChevronDown size={10} className="text-zinc-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-xl transition-all ${isGenerating ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}>
              {isGenerating ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Mic size={18} strokeWidth={1.5} />}
            </button>
            <button
              className={`p-2.5 rounded-xl transition-all shadow-lg ${
                value || isGenerating
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95' 
                  : 'bg-zinc-100 text-zinc-300'
              }`}
            >
              {isGenerating ? (
                <div className="w-3 h-3 bg-white rounded-[2px]" />
              ) : (
                <ArrowUp size={18} fill="currentColor" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
