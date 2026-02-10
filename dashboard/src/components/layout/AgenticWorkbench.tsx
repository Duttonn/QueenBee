import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import {
  Bot,
  User,
  Terminal,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  GitCommit,
  File,
  Check,
  Loader2,
  AlertCircle,
  Users,
  Plus,
  Sparkles,
  Copy,
  Layers,
  Eye,
  Monitor,
  X,
  Shield,
  TerminalSquare,
  ExternalLink,
  Code,
  FolderOpen,
  Command,
  LayoutTemplate,
  Columns,
  Rows,
  GitBranch
} from 'lucide-react';
import { type Message, type ToolCall, getGitBranches, executeCommand } from '../../services/api';
import { useHiveStore } from '../../store/useHiveStore';
import ToolCallViewer from '../agents/ToolCallViewer';
import AgentStepsPanel from '../agents/AgentStepsPanel';
import { ProjectOverview } from '../projects/ProjectOverview';

interface ToolCallSequenceProps {
  toolCalls: ToolCall[];
  socket: any;
  activeProject: any;
  activeThreadId: string | null;
}

const ToolCallSequence = ({ toolCalls, socket, activeProject, activeThreadId }: ToolCallSequenceProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 1. Filter out internal "backend" tools that don't need to be shown to the dev
  const visibleTools = toolCalls.filter(tc => 
    !['read_memory', 'write_memory', 'plan_tasks', 'add_task', 'claim_task', 'check_status', 'report_completion'].includes(tc.name)
  );

  if (visibleTools.length === 0) return null;

  // 2. Consolidate Explorations
  const explorations = visibleTools.filter(tc => ['read_file', 'list_directory', 'glob', 'search_file_content'].includes(tc.name));
  const explorationStats = {
    files: explorations.filter(e => e.name === 'read_file').length,
    searches: explorations.filter(e => e.name === 'search_file_content').length,
    lists: explorations.filter(e => ['list_directory', 'glob'].includes(e.name)).length
  };

  // 3. Consolidate Edits by File
  const editTools = visibleTools.filter(tc => ['write_file', 'replace', 'apply_patch'].includes(tc.name));
  const editsByFile: Record<string, { added: number, removed: number, name: string, type: 'Created' | 'Edited' }> = {};
  
  editTools.forEach(tc => {
    const path = tc.arguments?.path || tc.arguments?.file_path || 'unknown';
    const fileName = path.split('/').pop() || 'file';
    const isNew = tc.name === 'write_file' && (!tc.result?.stats || tc.result.stats.removed === 0);
    
    if (!editsByFile[path]) {
      editsByFile[path] = { added: 0, removed: 0, name: fileName, type: isNew ? 'Created' : 'Edited' };
    }
    
    if (tc.result?.stats) {
      editsByFile[path].added += tc.result.stats.added || 0;
      editsByFile[path].removed += tc.result.stats.removed || 0;
    } else if (tc.name === 'write_file') {
      const lineCount = (tc.arguments?.content || '').split('\n').length;
      editsByFile[path].added += lineCount;
    }
  });

  const anyRunning = visibleTools.some(tc => tc.status === 'running');
  const anyError = visibleTools.some(tc => tc.status === 'error');
  const anyPending = visibleTools.some(tc => tc.status === 'pending');

  return (
    <div className="my-2 space-y-1">
      <div className="flex flex-col gap-1">
        {/* Explorations Summary */}
        {(explorationStats.files > 0 || explorationStats.searches > 0 || explorationStats.lists > 0) && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors group/row"
          >
            <span>Explored</span>
            <div className="flex items-center gap-1.5">
              {explorationStats.files > 0 && <span className="text-zinc-600 font-bold">{explorationStats.files} files</span>}
              {explorationStats.searches > 0 && (
                <>
                  <span className="text-zinc-200">,</span>
                  <span className="text-zinc-600 font-bold">{explorationStats.searches} searches</span>
                </>
              )}
              {explorationStats.lists > 0 && (
                <>
                  <span className="text-zinc-200">,</span>
                  <span className="text-zinc-600 font-bold">{explorationStats.lists} lists</span>
                </>
              )}
            </div>
            <ChevronRight size={12} className={`text-zinc-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}

        {/* Edits Summary */}
        {Object.entries(editsByFile).map(([path, stats]) => (
          <button 
            key={path}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors group/row"
          >
            <span>{stats.type}</span>
            <span className="text-blue-600 font-bold truncate max-w-[200px] hover:underline">{stats.name}</span>
            
            {(stats.added > 0 || stats.removed > 0) && (
              <div className="flex items-center gap-1.5 ml-1 text-[10px] font-mono">
                {stats.added > 0 && <span className="text-emerald-600 font-bold">+{stats.added}</span>}
                {stats.added > 0 && stats.removed > 0 && <span className="text-zinc-300">|</span>}
                {stats.removed > 0 && <span className="text-rose-600 font-bold">-{stats.removed}</span>}
              </div>
            )}
            
            {anyPending && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1 animate-pulse" />}
            <ChevronRight size={12} className={`text-zinc-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        ))}

        {/* Other Tools (e.g. Shell) */}
        {visibleTools.filter(tc => !explorations.includes(tc) && !editTools.includes(tc)).map(tc => (
          <button 
            key={tc.id}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors group/row"
          >
            <span>Executed</span>
            <span className="text-zinc-600 font-mono font-bold truncate max-w-[200px]">
              {tc.arguments?.command || tc.name}
            </span>
            <ChevronRight size={12} className={`text-zinc-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-2 border border-zinc-100 rounded-2xl bg-zinc-50/30 space-y-1">
              {visibleTools.map((tool, tIdx) => (
                <ToolCallViewer
                  key={tool.id || tIdx}
                  toolName={tool.name}
                  args={tool.arguments}
                  status={tool.status}
                  result={tool.result}
                  error={tool.error}
                  onApprove={() => {
                    socket?.emit('TOOL_APPROVAL', {
                      projectId: activeProject?.id,
                      threadId: activeThreadId,
                      toolCallId: tool.id,
                      tool: tool.name,
                      args: tool.arguments,
                      projectPath: activeProject?.path,
                      approved: true
                    });
                  }}
                  onReject={() => {
                    socket?.emit('TOOL_APPROVAL', {
                      projectId: activeProject?.id,
                      threadId: activeThreadId,
                      toolCallId: tool.id,
                      tool: tool.name,
                      args: tool.arguments,
                      projectPath: activeProject?.path,
                      approved: false
                    });
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AgenticWorkbenchProps {
  messages: Message[];
  isLoading: boolean;
  streamError?: string | null;
  onClearError?: () => void;
  diffStats?: { added: number; removed: number; filesCount: number };
  changedFiles?: string[];
  mode: 'local' | 'worktree' | 'cloud';
  onModeChange: (mode: 'local' | 'worktree' | 'cloud') => void;
  activeProject: any;
  onToggleInspector: () => void;
  onToggleTerminal?: () => void;
  onToggleDiff?: () => void;
  onSendMessage: (content: string) => void;
  onClearThread: () => void;
  onRunCommand: (cmd: string) => void;
  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;
  onRun?: () => void;
  onCommit?: () => void;
  onBuild?: () => void;
  onAddThread?: () => void;
  onOpenIn?: (app: 'vscode' | 'finder' | 'terminal' | 'xcode') => void;
  onStop?: () => void;
  workbenchView: 'code' | 'chat' | 'plan';
  onViewChange: (view: 'code' | 'chat' | 'plan') => void;
}

  const MemoizedMarkdown = React.memo(({ content }: { content: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <div className="relative group my-4">
              <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                  className="p-1.5 bg-white hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-md transition-all border border-zinc-200 shadow-sm"
                  title="Copy code"
                >
                  <Copy size={14} />
                </button>
              </div>
              <pre className={`${className} !bg-zinc-50/50 !m-0 !rounded-2xl !p-5 border border-zinc-200 shadow-sm overflow-x-auto`}>
                <code {...props} className={`${className} !text-zinc-800`}>
                  {children}
                </code>
              </pre>
            </div>
          ) : (
            <code {...props} className={`${className} px-1.5 py-0.5 bg-zinc-100 text-zinc-800 rounded-md font-mono text-[0.9em]`}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mb-4 space-y-2 list-disc pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 space-y-2 list-decimal pl-5">{children}</ol>,
        li: ({ children }) => <li className="text-zinc-700">{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-zinc-900">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-zinc-900">{children}</h2>,
        h3: ({ children }) => <h3 className="text-md font-bold mb-2 text-zinc-900">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-zinc-200 pl-4 italic text-zinc-600 my-4">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  ));

  const MessageContent = ({ content, isAssistant }: { content: string | any[], isAssistant?: boolean }) => {
    if (typeof content === 'string') {
      if (!isAssistant) return <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{content}</p>;
      return (
        <div className="text-sm text-zinc-800 prose prose-sm max-w-none prose-zinc prose-pre:p-0 prose-pre:bg-transparent">
          <MemoizedMarkdown
            content={content
              .replace(/```thinking[\s\S]*?```/g, '')
              .replace(/Called \w+ → Success\n?/g, '')
              .trim()}
          />
        </div>
      );
    }

    if (Array.isArray(content)) {
      return (
        <div className="space-y-3">
          {content.map((part, idx) => {
            if (part.type === 'text') {
              return <MessageContent key={idx} content={part.text} isAssistant={isAssistant} />;
            }
            if (part.type === 'image_url') {
              return (
                <div key={idx} className="relative max-w-sm rounded-xl overflow-hidden border border-zinc-200 shadow-sm bg-white mt-2">
                  <img 
                    src={part.image_url.url} 
                    alt="User upload" 
                    className="w-full h-auto object-contain max-h-[300px]"
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    return null;
  };

  const AgenticWorkbench = ({  messages,
  isLoading,
  streamError,
  onClearError,
  diffStats = { added: 0, removed: 0, filesCount: 0 },
  changedFiles = [],
  mode,
  onModeChange,
  activeProject,
  onToggleInspector,
  onToggleTerminal,
  onToggleDiff,
  onSendMessage,
  onClearThread,
  onRunCommand,
  activeThreadId,
  setActiveThread,
  onRun,
  onCommit,
  onBuild,
  onAddThread,
  onOpenIn,
  onStop,
  workbenchView,
  onViewChange
}: AgenticWorkbenchProps) => {
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [isOpenMenuOpen, setIsOpenMenuOpen] = useState(false);
  const [showLiveEye, setShowLiveEye] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      const scrollHeight = textareaRef.current.scrollHeight;
      const initialHeight = 44; // Approx height for 1 line
      const maxHeight = initialHeight * 3;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);
  
  // Branch State
  const [branches, setBranches] = useState<{ current: string, all: string[] }>({ current: 'main', all: [] });
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

  // Tab State
  const [splitDirection, setSplitDirection] = useState<'vertical' | 'horizontal'>('horizontal');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { spawnAgent, socket, queenStatus, tasks } = useHiveStore();

  const hasPendingApproval = messages.some(m => m.toolCalls?.some(tc => tc.status === 'pending'));

  useEffect(() => {
    if (activeProject?.path) {
        getGitBranches(activeProject.path).then(data => {
            setBranches({ current: data.current, all: data.all });
        }).catch(console.error);
    }
  }, [activeProject?.path]);

  const handleBranchSwitch = async (branch: string) => {
      if (!activeProject?.path) return;
      try {
          // 1. Check for changes (simplified check, or just try stash)
          // We'll blindly try to stash. If nothing to stash, it says "No local changes to save".
          // Using 'executeCommand' which returns stdout/stderr.
          
          const stashRes = await executeCommand(`git stash push -m "Auto-stash before switch to ${branch}"`, activeProject.path);
          if (stashRes.stdout.includes('Saved working directory')) {
              console.log('[Git] Auto-stashed changes');
              // Ideally store this event to prompt user later
          }

          // 2. Checkout
          await executeCommand(`git checkout ${branch}`, activeProject.path);
          
          // 3. Refresh state
          const data = await getGitBranches(activeProject.path);
          setBranches({ current: data.current, all: data.all });
          setIsBranchMenuOpen(false);
          
          // Optional: Prompt to pop? For now, we just ensure the switch works.
          if (stashRes.stdout.includes('Saved working directory')) {
             // We could notify the user: "Changes stashed. Use 'git stash pop' to restore."
             // Or NativeService.notify...
          }
      } catch (e: any) {
          console.error("Failed to switch branch", e);
          alert(`Failed to switch branch: ${e.message || e.stderr}`);
      }
  };

  const handleAddAgent = (role: string) => {
    // ...
  };

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
            behavior: isLoading ? 'auto' : 'smooth',
            block: 'end' 
        });
    }
  }, [messages, expandedThinking, isLoading]);

  const toggleThinking = (index: number) => {
    setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }));
  };

      const handleCopyMessage = (content: string, index: number) => {
          const cleanContent = content.replace(/```thinking[\s\S]*?```/g, '').trim();
          navigator.clipboard.writeText(cleanContent);
          setCopiedIndex(index);
          setTimeout(() => setCopiedIndex(null), 2000);
      };
  
      const messagesList = (
        <div className="flex-1 flex overflow-hidden relative h-full">      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative h-full">
        <AnimatePresence>
          {hasPendingApproval && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-0 left-0 right-0 z-30 mb-4"
            >
              <div className="bg-orange-500 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center justify-between border border-orange-400">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Action Required — Agent is waiting for your approval</span>
                </div>
                <div className="text-[10px] font-bold opacity-80">Check message below</div>
              </div>
            </motion.div>
          )}
          {showLiveEye && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="sticky top-0 left-0 right-0 z-20 mb-4"
            >
              <div className="bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden">
                <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor size={14} className="text-blue-600" />
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Live Eye — Browser Stream</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">2 FPS</span>
                    </div>
                    <button onClick={() => setShowLiveEye(false)} className="text-zinc-400 hover:text-zinc-600">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="aspect-video bg-zinc-900 flex items-center justify-center group relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-[10px] font-medium text-white/70">Connecting to CDP Bridge...</p>
                  </div>
                  <div className="text-center">
                    <Bot size={32} className="text-zinc-700 mx-auto mb-2 animate-bounce" />
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Waiting for stream</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {messages.filter(m => m.role !== 'tool').map((msg, index, filteredMessages) => {
          const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
          const isGrouped = msg.role === 'assistant' && prevMsg?.role === 'assistant';

          return (
          <div key={index} className={isGrouped ? '-mt-1' : 'mt-4 first:mt-0'}>
                          {msg.role === 'user' && (
                            <div className="flex gap-3">
                              <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 border border-zinc-200 shadow-sm mt-1">
                                <User size={14} className="text-zinc-600" />
                              </div>
                              <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm overflow-hidden">
                                <MessageContent content={msg.content || ''} />
                              </div>
                            </div>
                          )}
            {msg.role === 'assistant' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 flex-shrink-0 flex flex-col items-center">
                  {!isGrouped && (
                    <>
                      <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center group relative shadow-lg shadow-black/20 mt-1">
                        <Bot size={14} className="text-white" />
                        {isLoading && index === messages.length - 1 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
                        )}
                      </div>
                      {/* Vertical line connector for groups */}
                      {(messages[index+1]?.role === 'assistant' || messages[index+1]?.role === 'tool') && (
                         <div className="w-px h-full bg-zinc-200 my-1 opacity-50" />
                      )}
                    </>
                  )}
                  {isGrouped && (
                      <div className="w-px h-full bg-zinc-200 opacity-50" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2 group/msg pt-1">
                                      {!isGrouped && (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Assistant</span>
                                            {((typeof msg.content === 'string' && msg.content?.includes('```thinking')) || (isLoading && index === messages.length - 1 && queenStatus === 'thinking')) && (
                                              <button
                                                onClick={() => toggleThinking(index)}
                                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                                              >
                                                <Sparkles size={10} className={isLoading && index === messages.length - 1 ? "animate-spin" : ""} />
                                                <span>{isLoading && index === messages.length - 1 && (typeof msg.content !== 'string' || !msg.content?.includes('```thinking')) ? 'Pondering...' : 'View Thoughts'}</span>
                                                {expandedThinking[index] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                              </button>
                                            )}
                                          </div>
                  
                                          {msg.content && typeof msg.content === 'string' && (
                                              <button 
                                                onClick={() => handleCopyMessage(msg.content as string, index)}
                                                className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all"
                                              >
                                                {copiedIndex === index ? (
                                                    <>
                                                        <Check size={10} className="text-emerald-500" />
                                                        <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={10} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Copy Response</span>
                                                    </>
                                                )}
                                              </button>
                                          )}
                                        </div>
                                      )}
                  <AnimatePresence>
                    {(expandedThinking[index] || (isLoading && index === messages.length - 1 && queenStatus === 'thinking' && !msg.content && !isGrouped)) && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                              >
                                                <div className="pl-4 border-l-2 border-blue-200 bg-blue-50/30 py-2 my-1 rounded-r-lg space-y-1">
                                                  {typeof msg.content === 'string' && msg.content?.includes('```thinking') ? (
                                                    msg.content
                                                      .match(/```thinking\n([\s\S]*?)```/)?.[1]                              ?.split('\n')
                              .filter(Boolean)
                              .map((line, i) => (
                                <p key={i} className="text-[11px] text-blue-700/70 font-mono leading-relaxed">{line}</p>
                              ))
                          ) : (
                            <div className="flex items-center gap-2 text-[11px] text-blue-400 font-mono italic animate-pulse">
                              <Loader2 size={10} className="animate-spin" />
                              Connecting to Hive Mind...
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {msg.toolCalls && (
                    <ToolCallSequence
                      toolCalls={msg.toolCalls}
                      socket={socket}
                      activeProject={activeProject}
                      activeThreadId={activeThreadId}
                    />
                  )}

                                      {msg.content ? (
                                        <div className="relative group/content">
                                          <MessageContent content={msg.content} isAssistant />
                                          
                                          {isLoading && index === messages.length - 1 && (
                                            <motion.span
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: [0, 1, 0] }}
                                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                              className="absolute bottom-1 inline-block w-1.5 h-4 bg-blue-500 ml-1 align-middle"
                                            />
                                          )}
                  
                                          {/* P6-09: Inline Review changes link */}                      {!isLoading && msg.role === 'assistant' && msg.toolCalls?.some(tc => 
                        ['write_file', 'replace', 'apply_patch', 'delete_file'].includes(tc.name) && tc.status === 'success'
                      ) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <GitCommit size={14} className="text-emerald-600" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Agent Modifications</div>
                              <div className="text-xs font-bold text-zinc-700">
                                Files modified in this step
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={onToggleDiff}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm group"
                          >
                            <span>Review Changes</span>
                            <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    isLoading && index === messages.length - 1 && !msg.toolCalls?.length ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-400 italic py-1">
                            <Loader2 size={12} className="animate-spin" />
                            <span>{queenStatus === 'thinking' ? 'Pondering...' : 'Synthesizing response...'}</span>
                        </div>
                    ) : null
                  )}

                                      {typeof msg.content === 'string' && msg.content?.startsWith('Error:') && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs mt-2">
                                          <AlertCircle size={12} />
                                          <span>Request failed</span>
                                        </div>
                                      )}                </div>
              </div>
            )}

            {msg.role === 'system' && (
              <div className="flex justify-center">
                <p className="text-[10px] font-black text-zinc-400 bg-zinc-50 px-3 py-1 rounded-full uppercase tracking-widest border border-zinc-100">
                  {msg.content}
                </p>
              </div>
            )}
          </div>
        );
        })}

        <div className="h-32 flex-shrink-0" /> {/* Spacer for floating composer bar */}
        <div ref={messagesEndRef} />

        {/* BP-08: Stream Error Banner */}
        <AnimatePresence>
          {streamError && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-4"
            >
              <div className="bg-white border border-rose-100 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                    <AlertCircle size={20} className="text-rose-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Connection Lost</div>
                    <div className="text-xs font-bold text-zinc-700 line-clamp-1">
                      {streamError}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClearError}
                    className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                                      <button
                                        onClick={() => {
                                          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                                          if (lastUserMsg) {
                                            onClearError?.();
                                            const content = typeof lastUserMsg.content === 'string' 
                                              ? lastUserMsg.content 
                                              : lastUserMsg.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
                                            onSendMessage(content);
                                          }
                                        }}
                                        className="px-4 py-2 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                                      >
                                        Retry
                                      </button>                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

              {/* BP-09: Agent Steps Sidebar */}
              {workbenchView !== 'plan' && (
                <div className="relative">
                  <AgentStepsPanel />
                </div>
              )}
            </div>
          );
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-zinc-100 flex items-center justify-between px-4 flex-shrink-0 bg-white">
        <div className="flex items-center gap-6">
          {/* Project Info & Tabs */}
          {activeProject && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100 shadow-sm">
                <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-[9px] text-white font-black uppercase">
                  {activeProject.name[0]}
                </div>
                <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-tight">{activeProject.name}</span>
              </div>

              {/* Branch Picker */}
              <div className="relative">
                  <button 
                    onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-zinc-50 text-[10px] font-medium text-zinc-500 transition-colors border border-transparent hover:border-zinc-100"
                  >
                    <GitBranch size={12} />
                    <span className="max-w-[100px] truncate">{branches.current}</span>
                    <ChevronDown size={10} className="opacity-50" />
                  </button>
                  
                  <AnimatePresence>
                    {isBranchMenuOpen && (
                        <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsBranchMenuOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 mt-1 w-48 bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden z-20 max-h-64 overflow-y-auto"
                        >
                            <div className="px-3 py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-50 bg-zinc-50/50 sticky top-0">
                                Switch Branch
                            </div>
                            {branches.all.map(branch => (
                                <button
                                    key={branch}
                                    onClick={() => handleBranchSwitch(branch)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                                        branch === branches.current 
                                        ? 'bg-blue-50 text-blue-600 font-bold' 
                                        : 'text-zinc-600 hover:bg-zinc-50'
                                    }`}
                                >
                                    <GitBranch size={12} className={branch === branches.current ? 'text-blue-500' : 'text-zinc-400'} />
                                    <span className="truncate">{branch}</span>
                                    {branch === branches.current && <Check size={12} className="ml-auto" />}
                                </button>
                            ))}
                        </motion.div>
                        </>
                    )}
                  </AnimatePresence>
              </div>

              {/* Workbench Tabs */}
              <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 shadow-inner">
                <button
                  onClick={() => onViewChange('code')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${workbenchView === 'code' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  <Code size={12} />
                  Code
                </button>
                <button
                  onClick={() => onViewChange('chat')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${workbenchView === 'chat' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  <Bot size={12} />
                  Chat
                </button>
                <button
                  onClick={() => onViewChange('plan')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${workbenchView === 'plan' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  <LayoutTemplate size={12} />
                  Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={onAddThread}
            className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-blue-500 transition-all"
            title="New Thread (Cmd+N)"
          >
            <Plus size={18} />
          </button>

          <div className="w-px h-6 bg-zinc-100 mx-1"></div>

          {/* View Controls (Split Toggle) */}
          {workbenchView === 'plan' && (
             <button
                onClick={() => setSplitDirection(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-zinc-900 transition-all"
                title={splitDirection === 'vertical' ? "Horizontal Split" : "Vertical Split"}
             >
                {splitDirection === 'vertical' ? <Columns size={16} /> : <Rows size={16} />}
             </button>
          )}

          <button
            onClick={() => setShowLiveEye(!showLiveEye)}
            className={`p-2 rounded-xl transition-all ${showLiveEye ? 'bg-blue-50 text-blue-600' : 'hover:bg-zinc-100 text-zinc-500 hover:text-blue-600'}`}
            title="Live Eye View (CDP Stream)"
          >
            <Eye size={18} />
          </button>

          <button
            onClick={onToggleInspector}
            className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-blue-600 transition-all"
            title="Deep Inspector (React Tree)"
          >
            <Layers size={18} />
          </button>

          <button
            onClick={onToggleDiff}
            className={`p-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-500 hover:text-blue-600`}
            title="Changes Viewer (Git Diff)"
          >
            <GitCommit size={18} />
          </button>

          <button
            onClick={onToggleTerminal}
            className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-zinc-700 transition-all"
            title="Toggle Terminal (Ctrl+`)"
          >
            <TerminalSquare size={18} />
          </button>

          {isLoading && onStop && (
            <button
              onClick={onStop}
              className="p-2 hover:bg-rose-100 rounded-xl text-rose-500 transition-all animate-pulse"
              title="Abort Agent"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}

          {/* Open In Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpenMenuOpen(!isOpenMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 text-[11px] font-black uppercase rounded-xl transition-all shadow-sm"
            >
              <Code size={14} className="text-blue-500" />
              <span>Open</span>
              <ChevronDown size={12} className="opacity-50" />
            </button>

            <AnimatePresence>
              {isOpenMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsOpenMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden z-20 p-1"
                  >
                    <div className="px-3 py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-50 mb-1">
                      Open in
                    </div>
                    <button
                      onClick={() => { onOpenIn?.('vscode'); setIsOpenMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all text-left"
                    >
                      <Code size={14} className="text-blue-500" />
                      <span>VS Code</span>
                    </button>
                    <button
                      onClick={() => { onOpenIn?.('finder'); setIsOpenMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all text-left"
                    >
                      <FolderOpen size={14} className="text-blue-400" />
                      <span>Finder</span>
                    </button>
                    <button
                      onClick={() => { onOpenIn?.('terminal'); setIsOpenMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all text-left"
                    >
                      <Terminal size={14} className="text-zinc-500" />
                      <span>Terminal</span>
                    </button>
                    <button
                      onClick={() => { onOpenIn?.('xcode'); setIsOpenMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all text-left"
                    >
                      <Command size={14} className="text-blue-600" />
                      <span>Xcode</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={onCommit}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-black uppercase rounded-xl transition-all shadow-xl shadow-black/10 active:scale-95"
          >
            <GitCommit size={14} />
            Commit
            {diffStats.filesCount > 0 && <span className="text-zinc-400 ml-1">{diffStats.filesCount} changed</span>}
            {diffStats.added > 0 && <span className="text-emerald-400 ml-1">+{diffStats.added}</span>}
            {diffStats.removed > 0 && <span className="text-rose-400">-{diffStats.removed}</span>}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {activeProject && messages.length === 0 && !isLoading && (workbenchView === 'chat' || workbenchView === 'code') && !activeThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-6">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                Let's build <span className="text-amber-600">{activeProject.name}</span>
              </h2>
              <p className="text-sm text-zinc-500 max-w-md mb-6">
                Start a conversation to plan, build, or debug your project with autonomous agents.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onAddThread || (() => {})}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg active:scale-95"
                >
                  New Thread
                </button>
                <button
                  onClick={() => onViewChange('plan')}
                  className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase rounded-xl transition-all"
                >
                  View Plan
                </button>
              </div>
            </div>
        ) : activeProject && messages.length === 0 && !isLoading && (workbenchView === 'chat' || workbenchView === 'code') ? (
            <ProjectOverview
                onNewThread={onAddThread || (() => {})}
                onStartPlanning={() => onViewChange('plan')}
                hasPlan={tasks.length > 0}
            />
        ) : workbenchView === 'plan' ? (
            <div className={`flex-1 flex overflow-hidden ${splitDirection === 'vertical' ? 'flex-row' : 'flex-col'}`}>
                <div className={`flex-1 overflow-hidden border-${splitDirection === 'vertical' ? 'r' : 'b'} border-zinc-200`}>
                    <ProjectOverview 
                        onNewThread={() => onViewChange('chat')} 
                        onStartPlanning={() => {}} 
                        hasPlan={tasks.length > 0}
                    />
                </div>
                <div className="flex-1 overflow-hidden relative bg-white border-l border-zinc-100">
                    {messagesList}
                </div>
            </div>
        ) : (
            messagesList
        )}
      </div>

      {/* Changed Files Panel */}
      {changedFiles.length > 0 && (
        <div className="border-t border-gray-100 p-3 bg-gray-50/50 flex-shrink-0">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Changed Files ({changedFiles.length})
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {changedFiles.map(file => (
              <div key={file} className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
                <File size={10} className="text-gray-400" />
                <span className="font-mono truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticWorkbench;