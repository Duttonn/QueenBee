import React from 'react';

const AtlasCodeBridge = () => {
  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code Connect</span>
        <button className="text-[10px] text-blue-600 font-bold">Inspect</button>
      </div>

      <div className="flex-1 p-4 font-mono text-[11px] overflow-auto">
        <div className="text-slate-400 mb-2">React • src/components/Card.tsx</div>
        <pre className="text-slate-800">
          {`<Progress 
  percentage="58"
  label="1,100"
  showLabel={true}
/>`}
        </pre>
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="text-[10px] font-black text-slate-400 uppercase mb-3">Layer Properties</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div className="text-[8px] text-slate-400 uppercase">Width</div>
            <div className="text-xs font-bold text-slate-700">80px</div>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div className="text-[8px] text-slate-400 uppercase">Padding</div>
            <div className="text-xs font-bold text-slate-700">12px 16px</div>
          </div>
        </div>
      </div>
      
      <div className="p-4 mt-auto">
        <button className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200">
          Apply Fix to Worktree
        </button>
      </div>
    </div>
  );
};

export default AtlasCodeBridge;
