import React, { useState } from 'react';

const SourceControl = () => {
  const [commitMsg, setCommitMsg] = useState('feat(ui): implement Queen Bee command bar');
  const [isPushing, setIsPushing] = useState(false);

  return (
    <div className="mt-6 border-t border-slate-700 pt-4 px-4 bg-slate-900/50 rounded-b-xl pb-4">
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
        <span>Source Control</span>
        <span className="text-blue-400">main*</span>
      </div>

      {/* Changes List */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between items-center text-[11px] text-slate-300 hover:bg-slate-800 p-1 rounded cursor-pointer group">
          <span className="truncate">M Sidebar.tsx</span>
          <span className="text-blue-400 opacity-0 group-hover:opacity-100">diff</span>
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-300 hover:bg-slate-800 p-1 rounded cursor-pointer group">
          <span className="truncate">A GitWorkflow.md</span>
          <span className="text-green-400 opacity-0 group-hover:opacity-100">diff</span>
        </div>
      </div>

      {/* Commit Box */}
      <div className="space-y-2">
        <textarea 
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 focus:border-blue-500 outline-none resize-none h-16"
          placeholder="Commit message..."
        />
        <div className="flex gap-2">
          <button className="flex-1 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-500 transition-colors">
            Commit
          </button>
          <button 
            onClick={() => setIsPushing(true)}
            className="px-3 py-1.5 bg-slate-700 text-white text-[10px] font-bold rounded-lg hover:bg-slate-600 transition-colors"
          >
            {isPushing ? '...' : 'Push'}
          </button>
        </div>
      </div>
      
      {isPushing && (
        <div className="mt-3 text-[9px] text-green-400 animate-pulse font-mono">
          > git push origin main... SUCCESS
        </div>
      )}
    </div>
  );
};

export default SourceControl;
