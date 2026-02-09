import React, { useState, useEffect } from 'react';
import { getGitDiff, type DiffStats, API_BASE } from '../../services/api';
import { parseDiff } from '../../services/diffParser';
import { File, Check, Minus, Plus, ChevronDown, ChevronRight, LayoutTemplate, Search, GitBranch, MessageSquare, Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const DiffLine = ({ 
  type, 
  content, 
  lineNo, 
  selected, 
  onClick 
}: { 
  type: 'add' | 'del' | 'neutral' | 'empty', 
  content: string, 
  lineNo?: number, 
  selected: boolean, 
  onClick: () => void 
}) => {
  const isAdd = type === 'add';
  const isDel = type === 'del';
  const isEmpty = type === 'empty';

  const bgColor = selected 
    ? 'bg-blue-100' 
    : isAdd ? 'bg-emerald-50' : isDel ? 'bg-rose-50' : isEmpty ? 'bg-zinc-50/50' : 'bg-white';
  
  const textColor = isAdd ? 'text-emerald-900' : isDel ? 'text-rose-900' : 'text-zinc-600';
  const prefix = isAdd ? '+' : isDel ? '-' : ' ';
  const prefixColor = isAdd ? 'text-emerald-600' : isDel ? 'text-rose-600' : 'text-zinc-300';
  const lineNoColor = isAdd ? 'text-emerald-600/50' : isDel ? 'text-rose-600/50' : 'text-zinc-300';

  return (
    <div 
      onClick={!isEmpty ? onClick : undefined}
      className={`flex font-mono text-[11px] leading-5 min-h-[20px] ${bgColor} border-b border-transparent group hover:bg-opacity-80 transition-colors cursor-pointer select-text`}
    >
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
  onStartThread?: (prompt: string) => void;
  onClose?: () => void;
}

const DiffViewer = ({ projectPath, filePath: initialFilePath, onStartThread, onClose }: DiffViewerProps) => {
  const [diff, setDiff] = useState<DiffStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFilePath || null);
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  
  // Interactive Lines State
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set()); // Format: "filename:lineNo"
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

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

  const toggleLine = (file: string, lineNo: number) => {
    const key = `${file}:${lineNo}`;
    const newSelected = new Set(selectedLines);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedLines(newSelected);
  };

  const handleStageLines = async () => {
    if (selectedLines.size === 0 || !activeDiff) return;

    try {
        // Construct a Unified Diff Patch for the selected lines
        // Header
        let patch = `--- a/${activeDiff.path}\n+++ b/${activeDiff.path}\n`;
        
        activeDiff.hunks.forEach((hunk: any) => {
            const hunkHeader = hunk.header; // e.g. "@@ -1,3 +1,4 @@"
            
            // Filter lines in this hunk that are selected or are context
            // A simplified patch construction: include context, but only include changes if they are selected
            const patchLines: string[] = [];
            
            let oldStart = 0;
            let oldCount = 0;
            let newStart = 0;
            let newCount = 0;

            // Parse hunk header to get start positions
            const headerMatch = hunkHeader.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (headerMatch) {
                oldStart = parseInt(headerMatch[1]);
                newStart = parseInt(headerMatch[3]);
            }

            let currentOldLine = oldStart;
            let currentNewLine = newStart;

            hunk.lines.forEach((line: string) => {
                if (line.startsWith(' ')) {
                    patchLines.push(line);
                    currentOldLine++;
                    currentNewLine++;
                    oldCount++;
                    newCount++;
                } else if (line.startsWith('-')) {
                    const isSelected = selectedLines.has(`${activeDiff.path}:${currentOldLine}`);
                    if (isSelected) {
                        patchLines.push(line);
                        oldCount++;
                    } else {
                        // Include unselected deletions as context (neutral) so they stay unchanged in index
                        patchLines.push(' ' + line.substring(1));
                        oldCount++;
                        newCount++;
                    }
                    currentOldLine++;
                } else if (line.startsWith('+')) {
                    const isSelected = selectedLines.has(`${activeDiff.path}:${currentNewLine}`);
                    if (isSelected) {
                        patchLines.push(line);
                        newCount++;
                    } else {
                        // Omit unselected additions
                    }
                    currentNewLine++;
                }
            });

            if (patchLines.length > 0) {
                patch += `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n`;
                patch += patchLines.join('\n') + '\n';
            }
        });

        const res = await fetch(`${API_BASE}/api/git/stage-lines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                path: projectPath, 
                patch 
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.details || 'Failed to stage lines');
        }

        setSelectedLines(new Set());
        fetchDiff(); // Refresh to show updated diff
        alert('Successfully staged selected lines!');

    } catch (err: any) {
        console.error('Partial staging failed:', err);
        alert(`Failed to stage lines: ${err.message}`);
    }
  };

  const handleComment = () => {
    setIsCommentModalOpen(true);
  };

  const submitComment = () => {
    if (!onStartThread || selectedLines.size === 0) return;

    // Construct prompt
    const linesDetails = Array.from(selectedLines).map(key => {
        const [file, line] = key.split(':');
        // Find content (inefficient but works for prototype)
        const diffFile = diff?.files.find(f => f.path === file);
        // This is tricky because we need the content. 
        // For now, let's just pass line numbers and file.
        // Or we can try to extract content if we have access to the parsed lines easily.
        return `File: ${file}, Line: ${line}`;
    }).join('\n');

    const prompt = `I have a request regarding the following code:\n\n${linesDetails}\n\nMy Comment: ${commentText}\n\nPlease analyze the file and fix the issue or address my comment.`;
    
    onStartThread(prompt);
    setIsCommentModalOpen(false);
    setCommentText('');
    setSelectedLines(new Set());
  };

  const toggleStage = async (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isStaging = !stagedFiles.has(path);
    
    try {
        const endpoint = isStaging ? '/api/git/stage' : '/api/git/unstage';
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: projectPath, file: path })
        });

        if (res.ok) {
            const newStaged = new Set(stagedFiles);
            if (isStaging) newStaged.add(path);
            else newStaged.delete(path);
            setStagedFiles(newStaged);
            fetchDiff(); // Refresh diff to show updated state
        }
    } catch (err) {
        console.error("Failed to toggle stage", err);
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
    <div className="flex h-full bg-zinc-50 overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl relative">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="relative flex-1 mr-2">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
            <input 
              type="text"
              placeholder="Filter files..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={16} />
            </button>
          )}
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
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
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
                  {stagedFiles.has(activeDiff.path) ? 'Unstage' : 'Stage File'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white pb-20">
                <div className="min-w-full">
                  {pairedLines.map((pair, i) => (
                    <div key={i} className="grid grid-cols-2 group hover:bg-zinc-50/30 transition-colors border-b border-zinc-50/50 last:border-0">
                      <div className="border-r border-zinc-100">
                        <DiffLine 
                            type={pair.left.type} 
                            content={pair.left.content} 
                            lineNo={pair.left.line} 
                            selected={pair.left.line !== undefined && selectedLines.has(`${activeDiff.path}:${pair.left.line}`)}
                            onClick={() => pair.left.line !== undefined && toggleLine(activeDiff.path, pair.left.line)}
                        />
                      </div>
                      <div>
                        <DiffLine 
                            type={pair.right.type} 
                            content={pair.right.content} 
                            lineNo={pair.right.line} 
                            selected={pair.right.line !== undefined && selectedLines.has(`${activeDiff.path}:${pair.right.line}`)}
                            onClick={() => pair.right.line !== undefined && toggleLine(activeDiff.path, pair.right.line)}
                        />
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

      {/* Floating Action Bar for Selected Lines */}
      <AnimatePresence>
        {selectedLines.size > 0 && (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white p-2 rounded-2xl shadow-2xl flex items-center gap-2 z-50 border border-zinc-800"
            >
                <div className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-r border-zinc-700">
                    {selectedLines.size} Lines
                </div>
                <button 
                    onClick={handleStageLines}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 rounded-xl transition-all text-[11px] font-bold"
                >
                    <Check size={14} className="text-emerald-500" />
                    Stage Lines
                </button>
                <button 
                    onClick={handleComment}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all text-[11px] font-bold shadow-lg shadow-blue-500/20"
                >
                    <MessageSquare size={14} />
                    Ask Agent to Fix
                </button>
                <button 
                    onClick={() => setSelectedLines(new Set())}
                    className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all"
                >
                    <Plus className="rotate-45" size={14} />
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Modal */}
      <AnimatePresence>
        {isCommentModalOpen && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
                >
                    <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                        <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Instruct Agent</h3>
                        <button onClick={() => setIsCommentModalOpen(false)}><Plus className="rotate-45 text-zinc-400" size={16} /></button>
                    </div>
                    <div className="p-4">
                        <textarea 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="What should the agent do with these lines?"
                            className="w-full h-32 bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                            autoFocus
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button 
                                onClick={() => setIsCommentModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitComment}
                                className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 flex items-center gap-2"
                            >
                                <Send size={12} />
                                Spawn Thread
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiffViewer;
