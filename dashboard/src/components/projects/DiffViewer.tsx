import React, { useState, useEffect } from 'react';
import { getGitDiff, type DiffStats, API_BASE } from '../../services/api';
import { parseDiff } from '../../services/diffParser';
import { File, Check, Minus, Plus, ChevronDown, ChevronRight, LayoutTemplate } from 'lucide-react';

const DiffLine = ({ type, content, lineNo }: { type: 'add' | 'del' | 'neutral' | 'empty', content: string, lineNo?: number }) => {
  const isAdd = type === 'add';
  const isDel = type === 'del';
  const isEmpty = type === 'empty';

  const bgColor = isAdd ? 'bg-emerald-500/10' : isDel ? 'bg-rose-500/10' : isEmpty ? 'bg-zinc-50/50' : 'bg-white';
  const textColor = isAdd ? 'text-emerald-900' : isDel ? 'text-rose-900' : 'text-zinc-600';
  const prefix = isAdd ? '+' : isDel ? '-' : ' ';
  const prefixColor = isAdd ? 'text-emerald-600' : isDel ? 'text-rose-600' : 'text-zinc-300';
  const lineNoColor = isAdd ? 'text-emerald-600/50' : isDel ? 'text-rose-600/50' : 'text-zinc-300';

  return (
    <div className={`flex font-mono text-[11px] leading-5 min-h-[20px] ${bgColor} border-b border-transparent`}>
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
  const [isChangesCollapsed, setIsChangesCollapsed] = useState(false);
  const [isStagedCollapsed, setIsStagedCollapsed] = useState(false);

  const fetchDiff = async () => {
    try {
      const diffData = await getGitDiff(projectPath);
      setDiff(diffData);
      // Auto-select first file if none selected
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
      // In a real app, we'd call git reset here
    } else {
      newStaged.add(path);
      // In a real app, we'd call git add here
    }
    setStagedFiles(newStaged);
    
    // Simulate backend call
    try {
        await fetch(`${API_BASE}/api/git/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: projectPath, file: path })
        });
    } catch (err) {
        console.error("Failed to stage/unstage", err);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-2">
           <LayoutTemplate size={16} />
           <span>Failed to load diff: {error}</span>
        </div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
        <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-3"></div>
        <div className="text-xs font-medium uppercase tracking-widest">Loading Changes...</div>
      </div>
    );
  }

  const activeDiff = diff.files.find(f => f.path === selectedFile);
  const { leftLines, rightLines } = activeDiff ? parseDiff(activeDiff.hunks) : { leftLines: [], rightLines: [] };
  const pairedLines = leftLines.map((left, i) => ({ left, right: rightLines[i] }));

  const stagedList = diff.files.filter(f => stagedFiles.has(f.path));
  const changesList = diff.files.filter(f => !stagedFiles.has(f.path));

  return (
    <div className="flex h-full bg-zinc-50/50">
      {/* Sidebar: Source Control */}
      <div className="w-80 bg-white border-r border-zinc-200 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
        <div className="h-12 border-b border-zinc-100 flex items-center px-4 bg-white">
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Source Control</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                {diff.files.length} pending
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
            {/* Staged Changes Section */}
            {stagedList.length > 0 && (
                <div className="mb-4">
                    <button 
                        onClick={() => setIsStagedCollapsed(!isStagedCollapsed)}
                        className="flex items-center gap-1 w-full text-left px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                    >
                        {isStagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        Staged Changes
                    </button>
                    {!isStagedCollapsed && (
                        <div className="mt-1 space-y-0.5">
                            {stagedList.map(file => (
                                <div 
                                    key={file.path}
                                    onClick={() => setSelectedFile(file.path)}
                                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${selectedFile === file.path ? 'bg-blue-50/50' : 'hover:bg-zinc-50'}`}
                                >
                                    <div 
                                        onClick={(e) => toggleStage(file.path, e)}
                                        className="flex-shrink-0 w-4 h-4 rounded border border-zinc-300 bg-white flex items-center justify-center hover:border-blue-400 transition-colors"
                                    >
                                        <Check size={10} className="text-blue-600" />
                                    </div>
                                    <File size={13} className="text-zinc-400" />
                                    <span className={`text-xs truncate flex-1 ${selectedFile === file.path ? 'text-zinc-900 font-medium' : 'text-zinc-600'}`}>
                                        {file.path}
                                    </span>
                                    <span className="text-[9px] text-zinc-400 font-mono flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        M
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Changes Section */}
            <div>
                <button 
                    onClick={() => setIsChangesCollapsed(!isChangesCollapsed)}
                    className="flex items-center gap-1 w-full text-left px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                >
                    {isChangesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    Changes
                </button>
                {!isChangesCollapsed && (
                    <div className="mt-1 space-y-0.5">
                        {changesList.map(file => (
                            <div 
                                key={file.path}
                                onClick={() => setSelectedFile(file.path)}
                                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${selectedFile === file.path ? 'bg-blue-50/50' : 'hover:bg-zinc-50'}`}
                            >
                                <div 
                                    onClick={(e) => toggleStage(file.path, e)}
                                    className="flex-shrink-0 w-4 h-4 rounded border border-zinc-300 bg-white hover:border-zinc-400 transition-colors"
                                />
                                <File size={13} className="text-zinc-400" />
                                <span className={`text-xs truncate flex-1 ${selectedFile === file.path ? 'text-zinc-900 font-medium' : 'text-zinc-600'}`}>
                                    {file.path}
                                </span>
                                <div className="flex items-center gap-1 text-[9px] font-mono opacity-60">
                                    <span className="text-emerald-600">+{file.stats.added}</span>
                                    <span className="text-rose-600">-{file.stats.removed}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Main: Diff View */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {activeDiff ? (
          <>
            {/* Diff Header */}
            <div className="h-12 border-b border-zinc-200 bg-white px-5 flex items-center justify-between flex-shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-500">
                        <File size={14} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-zinc-900">{activeDiff.path}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toggleStage(activeDiff.path)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                            stagedFiles.has(activeDiff.path)
                            ? 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                            : 'bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800 shadow-sm'
                        }`}
                    >
                        {stagedFiles.has(activeDiff.path) ? 'Unstage File' : 'Stage File'}
                    </button>
                </div>
            </div>

            {/* Split View Header */}
            <div className="grid grid-cols-2 border-b border-zinc-200 bg-zinc-50/50 text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex-shrink-0">
                <div className="px-4 py-2 border-r border-zinc-200 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Original
                </div>
                <div className="px-4 py-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Modified
                </div>
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent bg-white">
                <div className="min-w-full">
                  {pairedLines.map((pair, i) => (
                    <div key={i} className="grid grid-cols-2 group hover:bg-zinc-50/30 transition-colors">
                      <div className="border-r border-zinc-200 overflow-hidden">
                        <DiffLine type={pair.left.type} content={pair.left.content} lineNo={pair.left.line} />
                      </div>
                      <div className="overflow-hidden">
                        <DiffLine type={pair.right.type} content={pair.right.content} lineNo={pair.right.line} />
                      </div>
                    </div>
                  ))}
                  
                  {pairedLines.length === 0 && (
                      <div className="p-8 text-center text-zinc-400 text-xs italic">
                          No changes detected in this file (or binary file).
                      </div>
                  )}
                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-300">
            <LayoutTemplate size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">Select a file to view diff</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffViewer;

export default DiffViewer;
