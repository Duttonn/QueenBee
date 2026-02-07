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
  Hammer,
  GitCommit,
  File,
  Check,
  Loader2,
  AlertCircle,
  Users,
  Plus,
  Sparkles,
  Copy
} from 'lucide-react';
import { type Message, type ToolCall } from '../../services/api';
import { useHiveStore } from '../../store/useHiveStore';
import ToolCallViewer from '../agents/ToolCallViewer';

interface AgenticWorkbenchProps {
  messages: Message[];
  isLoading?: boolean;
  diffStats?: { added: number; removed: number };
  changedFiles?: string[];
  mode: 'local' | 'worktree' | 'cloud';
  onModeChange: (mode: 'local' | 'worktree' | 'cloud') => void;
  activeProject?: any;
}

const AgenticWorkbench = ({
  messages,
  isLoading = false,
  diffStats = { added: 0, removed: 0 },
  changedFiles = [],
  mode,
  onModeChange,
  activeProject
}: AgenticWorkbenchProps) => {
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { spawnAgent, socket, activeThreadId, setActiveThread, queenStatus } = useHiveStore();

  const handleAddAgent = (role: string) => {
    if (!activeProject) return;
    spawnAgent(activeProject.id, {
      id: Date.now().toString(),
      name: `${role} Bee`,
      role: role,
      status: 'idle',
      avatar: '🐝'
    });
    setIsAgentMenuOpen(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleThinking = (index: number) => {
    setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (!activeProject && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-zinc-500">
        <div className="text-center">
          <Bot size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-xs font-bold uppercase tracking-widest">Select a thread to start building</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Header */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0 bg-zinc-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Project Title */}
          {activeProject && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 shadow-sm">
                <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[10px] text-white font-black">
                  {activeProject.name[0]}
                </div>
                <span className="text-[11px] font-bold text-zinc-200 tracking-tight">{activeProject.name}</span>
              </div>
              <button
                onClick={() => setActiveThread(null)}
                className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-zinc-200 transition-all"
                title="New Thread"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Agent Assignment Button */}
          <div className="relative">
            <button
              onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-bold tracking-tight ${activeProject?.agents?.length > 0
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : 'bg-white/5 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                }`}
            >
              <Users size={14} />
              <span>{activeProject?.agents?.length || 0} Agents</span>
              <ChevronDown size={10} className="opacity-50" />
            </button>

            <AnimatePresence>
              {isAgentMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsAgentMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 w-60 bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl overflow-hidden z-20 p-1 backdrop-blur-2xl"
                  >
                    <div className="px-3 py-2 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                      Assigned Agents
                    </div>
                    <div className="max-h-48 overflow-y-auto mb-1">
                      {activeProject?.agents?.length > 0 ? (
                        activeProject.agents.map((agent: any) => (
                          <div key={agent.id} className="flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-bold text-zinc-200">
                            <span className="text-lg">{agent.avatar || '🐝'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="truncate tracking-tight">{agent.name}</p>
                              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{agent.role}</p>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-[10px] text-zinc-500 font-bold italic">
                          No agents active
                        </div>
                      )}
                    </div>
                    <div className="border-t border-white/5 pt-1 mt-1">
                      <div className="px-3 py-2 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Spawn New</div>
                      <button
                        onClick={() => handleAddAgent('Architect')}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-colors text-left"
                      >
                        <Sparkles size={12} className="text-purple-400" />
                        <span>Architect Bee</span>
                      </button>
                      <button
                        onClick={() => handleAddAgent('Developer')}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-colors text-left"
                      >
                        <Terminal size={12} className="text-blue-400" />
                        <span>Developer Bee</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-white/5 mx-1"></div>

          <button className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-xl transition-all">
            <Play size={16} />
          </button>
          <button className="p-2 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all">
            <Hammer size={16} />
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-950 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all hover:bg-white scale-100 hover:scale-[1.02] active:scale-[0.98]">
            <GitCommit size={14} />
            Commit
            {diffStats.added > 0 && <span className="text-green-600 ml-1">+{diffStats.added}</span>}
            {diffStats.removed > 0 && <span className="text-red-600">-{diffStats.removed}</span>}
          </button>
        </div>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {msg.role === 'user' && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User size={16} className="text-zinc-400" />
                </div>
                <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                  <p className="text-sm text-zinc-200 font-medium leading-relaxed whitespace-pre-wrap">{msg.content || ''}</p>
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 group relative shadow-lg shadow-white/5">
                  <Bot size={16} className="text-zinc-950" />
                  {isLoading && index === messages.length - 1 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-zinc-950 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Queen Bee</span>
                    {((msg.content?.includes('```thinking')) || (isLoading && index === messages.length - 1 && queenStatus === 'thinking')) && (
                      <button
                        onClick={() => toggleThinking(index)}
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-[10px] font-black text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20"
                      >
                        <Sparkles size={11} className={isLoading && index === messages.length - 1 ? "animate-spin" : ""} />
                        <span className="uppercase tracking-widest">{isLoading && index === messages.length - 1 && !msg.content?.includes('```thinking') ? 'Pondering...' : 'Insights'}</span>
                        {expandedThinking[index] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      </button>
                    )}
                  </div>

                  {/* Thought Process Dropdown */}
                  <AnimatePresence>
                    {(expandedThinking[index] || (isLoading && index === messages.length - 1 && queenStatus === 'thinking' && !msg.content)) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 border-l-2 border-blue-500/30 bg-blue-500/5 py-3 my-2 rounded-r-2xl space-y-2 backdrop-blur-sm">
                          {msg.content?.includes('```thinking') ? (
                            msg.content
                              .match(/```thinking\n([\s\S]*?)```/)?.[1]
                              ?.split('\n')
                              .filter(Boolean)
                              .map((line, i) => (
                                <p key={i} className="text-[11px] text-blue-400/80 font-mono leading-relaxed tracking-tight">{line}</p>
                              ))
                          ) : (
                            <div className="flex items-center gap-3 text-[11px] text-blue-400/60 font-mono italic animate-pulse">
                              <Loader2 size={12} className="animate-spin" />
                              Synchronizing with Hive Mind...
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Render tool calls if present */}
                  {msg.toolCalls && msg.toolCalls.map((tool, tIdx) => (
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
                          toolCallId: tool.id || tool.name, 
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
                          toolCallId: tool.id || tool.name, 
                          tool: tool.name,
                          args: tool.arguments,
                          projectPath: activeProject?.path,
                          approved: false 
                        });
                      }}
                    />
                  ))}

                  {/* Main content (filter out thinking blocks) */}
                  {msg.content && (
                    <div className="text-sm text-zinc-100 prose prose-invert prose-zinc max-w-none prose-pre:p-0 prose-pre:bg-transparent leading-relaxed">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          pre: ({node, children, ...props}) => <>{children}</>,
                          code: (props: any) => {
                            const {node, inline, className, children, ...rest} = props;
                            const match = /language-(\w+)/.exec(className || '');
                            const lang = match ? match[1] : '';
                            const [copied, setCopied] = useState(false);

                            const handleCopy = () => {
                              navigator.clipboard.writeText(String(children));
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            };

                            const content = String(children);
                            const isShort = content.length < 40 && !content.includes('\n');

                            if (inline) {
                              return (
                                <code className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px] border border-white/5" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            if (isShort && !lang) {
                              return (
                                <code className="block my-3 px-4 py-3 rounded-xl bg-white/5 text-zinc-300 font-mono text-[12px] border border-white/5" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <div className="my-6 rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden shadow-2xl group animate-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between px-5 py-2.5 bg-white/5 border-b border-white/5">
                                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{lang || 'code'}</span>
                                  <button 
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-white transition-all"
                                  >
                                    {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                                    <span className="uppercase tracking-widest">{copied ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>
                                <div className="p-6 overflow-x-auto bg-transparent">
                                  <code className={`${className} font-mono text-[12px] leading-relaxed !bg-transparent !p-0`} {...props}>
                                    {children}
                                  </code>
                                </div>
                              </div>
                            );
                          }
                        }}
                      >
                        {msg.content
                          .replace(/```thinking[\s\S]*?```/g, '')
                          .replace(/Called \w+ → Success\n?/g, '')
                          .trim()}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Error styling for error messages */}
                  {msg.content?.startsWith('Error:') && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mt-3">
                      <AlertCircle size={14} />
                      <span>Request failed</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.role === 'system' && (
              <div className="flex justify-center">
                <p className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  {msg.content}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <Loader2 size={14} className="text-white animate-spin" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div className="h-32 flex-shrink-0" /> {/* Spacer for floating composer bar */}
        <div ref={messagesEndRef} />
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
