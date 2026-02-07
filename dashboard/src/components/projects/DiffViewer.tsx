import React, { useState, useEffect, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { getGitDiff, type DiffStats } from '../../services/api';
import { parseDiff } from '../../services/diffParser';

const DiffLine = ({ type, content, lineNo, side }: { type: 'add' | 'del' | 'neutral', content: string, lineNo?: number, side: 'left' | 'right' }) => {
  const isAdd = type === 'add';
  const isDel = type === 'del';
  
  const bgColor = isAdd ? 'bg-green-500/10' : isDel ? 'bg-red-500/10' : 'bg-zinc-800/20';
  const prefix = isAdd ? '+' : isDel ? '-' : ' ';
  const prefixColor = isAdd ? 'text-green-400' : isDel ? 'text-red-400' : 'text-zinc-500';
  const lineNoColor = 'text-zinc-600';

  if (side === 'left' && isAdd) {
    return <div className="flex font-mono text-xs py-0.5 bg-zinc-800/20"><div className="w-10 text-right pr-4 select-none text-zinc-700"></div><div className="w-6 flex-shrink-0"></div><div className="text-zinc-800/10 break-all">-</div></div>;
  }
  if (side === 'right' && isDel) {
    return <div className="flex font-mono text-xs py-0.5 bg-zinc-800/20"><div className="w-10 text-right pr-4 select-none text-zinc-700"></div><div className="w-6 flex-shrink-0"></div><div className="text-zinc-800/10 break-all">-</div></div>;
  }

  return (
    <div className={`flex font-mono text-xs py-0.5 ${bgColor}`}>
      <div className={`w-10 text-right pr-4 select-none ${lineNoColor}`}>{lineNo}</div>
      <div className={`w-6 flex-shrink-0 font-bold ${prefixColor}`}>{prefix}</div>
      <div className="text-zinc-300 break-all">{content}</div>
    </div>
  );
};

interface DiffViewerProps {
  projectPath: string;
  filePath: string;
}

const DiffViewer = ({ projectPath, filePath }: DiffViewerProps) => {
  const [diff, setDiff] = useState<DiffStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const diffData = await getGitDiff(projectPath, filePath);
        setDiff(diffData);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchDiff();
  }, [projectPath, filePath]);

  const handleScroll = (pane: 'left' | 'right') => (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (pane === 'left' && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = target.scrollTop;
    } else if (pane === 'right' && leftPaneRef.current) {
      leftPaneRef.current.scrollTop = target.scrollTop;
    }
  };

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  if (!diff) {
    return <div>Loading diff...</div>;
  }

  const fileDiff = diff.files[0];
  if (!fileDiff) {
    return <div>No changes for this file.</div>;
  }
  
  const { leftLines, rightLines } = parseDiff(fileDiff.hunks);

  return (
    <div className="bg-zinc-950/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-4xl my-8 animate-fade-in">
      <div className="bg-zinc-900/50 px-5 py-3 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <span className="text-blue-400">📄</span>
          </div>
          <div>
            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">File Diff</div>
            <div className="text-[13px] font-bold text-zinc-200 tracking-tight">{filePath}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
            <span className="text-[11px] font-black text-green-500 font-mono">+{fileDiff.stats.added}</span>
            <div className="w-px h-3 bg-white/10"></div>
            <span className="text-[11px] font-black text-red-500 font-mono">-{fileDiff.stats.removed}</span>
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <div className="mb-6 bg-blue-500/5 border-l-2 border-blue-500/30 rounded-r-xl p-4 backdrop-blur-sm">
          <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Queen Bee Note</div>
          <div className="text-[12px] text-blue-200/80 font-medium leading-relaxed italic">
            "Enhanced visualization of changes using the Cupertino Flux architecture."
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 overflow-hidden bg-black/20 h-[500px]">
          <Allotment>
            <Allotment.Pane>
              <div ref={leftPaneRef} onScroll={handleScroll('left')} className="overflow-auto h-full scrollbar-none">
                <div className="p-2">
                  {leftLines.map((d: any, i: number) => (
                    <DiffLine key={i} type={d.type} content={d.content} lineNo={d.line} side="left" />
                  ))}
                </div>
              </div>
            </Allotment.Pane>
            <Allotment.Pane>
              <div ref={rightPaneRef} onScroll={handleScroll('right')} className="overflow-auto h-full border-l border-white/5 scrollbar-none">
                <div className="p-2">
                  {rightLines.map((d: any, i: number) => (
                    <DiffLine key={i} type={d.type} content={d.content} lineNo={d.line} side="right" />
                  ))}
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>

      <div className="bg-zinc-900/30 p-4 flex justify-end gap-3 border-t border-white/5">
        <button className="px-5 py-2 bg-zinc-800 text-zinc-400 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/5 hover:text-zinc-200 transition-all border border-white/5">Discard</button>
        <button className="px-5 py-2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">Stage Changes</button>
      </div>
    </div>
  );
};

export default DiffViewer;
