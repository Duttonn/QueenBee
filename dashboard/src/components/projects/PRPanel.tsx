import React, { useState } from 'react';

const PRPanel = ({ projectName }: any) => {
  const [prTitle, setPrTitle] = useState('feat(ui): integrated source control and PR management');
  const [status, setStatus] = useState('draft'); // draft | submitted | checks_passing | merged

  return (
    <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-black text-slate-900 uppercase">Prepare Pull Request</h3>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">GH-CLI</span>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">PR Title</label>
          <input 
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-medium text-slate-700 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
          <div className="text-[9px] font-bold text-blue-500 uppercase mb-1">Queen Bee Summary</div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            This PR implements the Git workflow layer for the Codex Hive. 
            Includes the SourceControl component, GitHub CLI integration, and PR drafting logic.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          {status === 'draft' && (
            <button 
              onClick={() => setStatus('submitted')}
              className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all"
            >
              Create Pull Request
            </button>
          )}
          {status === 'submitted' && (
            <div className="w-full flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-500">CI CHECKS RUNNING...</span>
              </div>
              <button onClick={() => setStatus('checks_passing')} className="text-[9px] text-blue-500 underline">Refresh</button>
            </div>
          )}
          {status === 'checks_passing' && (
            <button 
              onClick={() => setStatus('merged')}
              className="w-full py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-500 transition-all shadow-lg shadow-green-100"
            >
              Merge Pull Request (All Checks Passed)
            </button>
          )}
          {status === 'merged' && (
            <div className="w-full py-2 bg-purple-100 text-purple-700 text-xs font-bold rounded-xl text-center">
              💜 Merged into main
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PRPanel;
