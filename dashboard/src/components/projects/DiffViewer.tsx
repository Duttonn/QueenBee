import React from 'react';

const DiffLine = ({ type, content, lineNo }: any) => {
  const bgColor = type === 'add' ? 'bg-green-500/20' : type === 'del' ? 'bg-red-500/20' : '';
  const prefix = type === 'add' ? '+' : type === 'del' ? '-' : ' ';
  const prefixColor = type === 'add' ? 'text-green-400' : type === 'del' ? 'text-red-400' : 'text-slate-500';

  return (
    <div className={`flex font-mono text-xs py-0.5 ${bgColor} border-l-4 ${type === 'add' ? 'border-green-500' : type === 'del' ? 'border-red-500' : 'border-transparent'}`}>
      <div className="w-10 text-right pr-4 text-slate-600 select-none">{lineNo}</div>
      <div className={`w-6 flex-shrink-0 font-bold ${prefixColor}`}>{prefix}</div>
      <div className="text-slate-300 break-all">{content}</div>
    </div>
  );
};

const DiffViewer = () => {
  const mockDiff = [
    { line: 40, type: 'neutral', content: '  const handleAuth = () => {' },
    { line: 41, type: 'del', content: '    console.log("Starting Auth...");' },
    { line: 42, type: 'add', content: '    logger.info("Initiating secure OAuth flow...");' },
    { line: 43, type: 'neutral', content: '    openBrowser(url);' },
  ];

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 w-full max-w-4xl">
      <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">📄</span>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Sidebar.tsx</span>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      
      <div className="p-4 bg-[#0d1117]">
        <div className="mb-4 bg-blue-500/10 border-l-2 border-blue-500 p-2 text-[10px] text-blue-300 italic">
          "Queen Bee: Swapped console.log for a structured logger for better production tracking."
        </div>
        <div className="rounded-lg border border-slate-800/50 overflow-hidden">
          {mockDiff.map((d, i) => (
            <DiffLine key={i} type={d.type} content={d.content} lineNo={d.line} />
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 p-3 flex justify-end gap-3 border-t border-slate-800">
        <button className="px-4 py-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg hover:text-white transition-colors">Discard</button>
        <button className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-500 transition-all">Stage Changes</button>
      </div>
    </div>
  );
};

export default DiffViewer;
