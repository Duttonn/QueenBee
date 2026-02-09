import React, { useState, useEffect } from 'react';
import { getGitDiff, type DiffStats, API_BASE } from '../../services/api';
import { parseDiff } from '../../services/diffParser';
import { File, Check, Minus, Plus, ChevronDown, ChevronRight, LayoutTemplate, Search, GitBranch } from 'lucide-react';

const DiffLine = ({ type, content, lineNo }: { type: 'add' | 'del' | 'neutral' | 'empty', content: string, lineNo?: number }) => {
  const isAdd = type === 'add';
  const isDel = type === 'del';
  const isEmpty = type === 'empty';

  const bgColor = isAdd ? 'bg-emerald-50' : isDel ? 'bg-rose-50' : isEmpty ? 'bg-zinc-50/50' : 'bg-white';
  const textColor = isAdd ? 'text-emerald-900' : isDel ? 'text-rose-900' : 'text-zinc-600';
  const prefix = isAdd ? '+' : isDel ? '-' : ' ';
  const prefixColor = isAdd ? 'text-emerald-600' : isDel ? 'text-rose-600' : 'text-zinc-300';
  const lineNoColor = isAdd ? 'text-emerald-600/50' : isDel ? 'text-rose-600/50' : 'text-zinc-300';

  return (
    <div className={`flex font-mono text-[11px] leading-5 min-h-[20px] ${bgColor} border-b border-transparent group hover:bg-opacity-80 transition-colors`}>
      <div className={`w-10 text-right pr-3 select-none flex-shrink-0 ${lineNoColor} border-r border-zinc-100 mr-2 bg-zinc-50/30`}>
        {lineNo}
      </div>
      <div className={`w-3 flex-shrink-0 font-bold ${prefixColor} select-none`}>
        {!isEmpty && prefix}
      </div>
      <div className={`flex-1 min-w-0 break-all whitespace-pre-wrap ${textColor}`}>
        {content || (isEmpty ? '' : ' ')}
      </div>
    </div>
  );
};

interface DiffViewerProps {
  projectPath: string;
  filePath?: string;
}

const DiffViewer = ({ projectPath, filePath: initialFilePath }: DiffViewerProps) => {
  const [diff, setDiff] = useState<DiffStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFilePath || null);
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const fetchDiff = async () => {
    try {
      const diffData = await getGitDiff(projectPath);
      setDiff(diffData);
      if (!selectedFile && diffData.files.length > 0) {
        setSelectedFile(diffData.files[0].path);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchDiff();
  }, [projectPath]);

  const toggleStage = async (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newStaged = new Set(stagedFiles);
    if (newStaged.has(path)) {
      newStaged.delete(path);
    } else {
      newStaged.add(path);
    }
    setStagedFiles(newStaged);
    
    try {
        await fetch(`${API_BASE}/api/git/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: projectPath, file: path })
        });
    } catch (err) {
        console.error("Failed to stage", err);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-white rounded-2xl border border-zinc-200">
        <div className="text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-2">
           <LayoutTemplate size={16} />
           <span>Failed to load diff: {error}</span>
        </div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 bg-white rounded-2xl border border-zinc-200">
        <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-3"></div>
        <div className="text-xs font-medium uppercase tracking-widest">Analyzing changes...</div>
      </div>
    );
  }

  const filteredFiles = diff.files.filter(f => f.path.toLowerCase().includes(filter.toLowerCase()));
  const activeDiff = diff.files.find(f => f.path === selectedFile);
  const { leftLines, rightLines } = activeDiff ? parseDiff(activeDiff.hunks) : { leftLines: [], rightLines: [] };
  const pairedLines = leftLines.map((left, i) => ({ left, right: rightLines[i] }));

  return (
    <div className="flex h-full bg-zinc-50 overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-3 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
            <input 
              type="text"
              placeholder="Filter files..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredFiles.map(file => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file.path)}
              className={`w-full group flex flex-col p-3 rounded-xl transition-all ${selectedFile === file.path ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-zinc-50 border border-transparent'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <File size={14} className={selectedFile === file.path ? 'text-blue-500' : 'text-zinc-400'} />
                <span className={`text-[11px] font-bold truncate flex-1 text-left ${selectedFile === file.path ? 'text-blue-900' : 'text-zinc-700'}`}>
                  {file.path.split('/').pop()}
                </span>
                <div className="flex items-center gap-1 text-[9px] font-mono font-bold">
                  <span className="text-emerald-600">+{file.stats.added}</span>
                  <span className="text-rose-600">-{file.stats.removed}</span>
                </div>
              </div>
              <div className="text-[9px] text-zinc-400 truncate text-left ml-5 font-medium">{file.path}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeDiff ? (
          <>
            <div className="h-14 border-b border-zinc-100 px-6 flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <span>DIFF VIEW</span>
                <ChevronRight size={14} />
                <span className="text-zinc-900">{activeDiff.path}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {activeDiff.stats.added} additions
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-600">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    {activeDiff.stats.removed} deletions
                  </div>
                </div>
                <button
                  onClick={() => toggleStage(activeDiff.path)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${stagedFiles.has(activeDiff.path) ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                >
                  {stagedFiles.has(activeDiff.path) ? 'Unstage' : 'Stage'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white">
                <div className="min-w-full">
                  {pairedLines.map((pair, i) => (
                    <div key={i} className="grid grid-cols-2 group hover:bg-zinc-50/30 transition-colors border-b border-zinc-50/50 last:border-0">
                      <div className="border-r border-zinc-100">
                        <DiffLine type={pair.left.type} content={pair.left.content} lineNo={pair.left.line} />
                      </div>
                      <div>
                        <DiffLine type={pair.right.type} content={pair.right.content} lineNo={pair.right.line} />
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-300">
            <LayoutTemplate size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">Select a file to review changes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffViewer;
