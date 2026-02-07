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
  Copy,
  Layers
} from 'lucide-react';
import { type Message, type ToolCall } from '../../services/api';
import { useHiveStore } from '../../store/useHiveStore';
import ToolCallViewer from '../agents/ToolCallViewer';

interface AgenticWorkbenchProps {
  messages: Message[];
  isLoading: boolean;
  diffStats?: { added: number; removed: number };
  changedFiles?: string[];
  mode: 'local' | 'worktree' | 'cloud';
  onModeChange: (mode: 'local' | 'worktree' | 'cloud') => void;
  activeProject: any;
  onToggleInspector: () => void;
  onSendMessage: (content: string) => void;
  onClearThread: () => void;
  onRunCommand: (cmd: string) => void;
  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;
  onRun?: () => void;
  onCommit?: () => void;
  onBuild?: () => void;
  onAddThread?: () => void;
}

const AgenticWorkbench = ({
  messages,
  isLoading,
  diffStats = { added: 0, removed: 0 },
  changedFiles = [],
  mode,
  onModeChange,
  activeProject,
  onToggleInspector,
  onSendMessage,
  onClearThread,
  onRunCommand,
  activeThreadId,
  setActiveThread,
  onRun,
  onCommit,
  onBuild,
  onAddThread
}: AgenticWorkbenchProps) => {
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { spawnAgent, socket, queenStatus } = useHiveStore();

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
      <div className="flex-1 flex items-center justify-center bg-white text-zinc-400">
        <div className="text-center">
          <Bot size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">Select a thread or repository to start building</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          {/* Project Title */}
          {activeProject && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-100">
                <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                  {activeProject.name[0]}
                </div>
                <span className="text-xs font-semibold text-zinc-700">{activeProject.name}</span>
              </div>
              <button
                onClick={onAddThread}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${activeProject?.agents?.length > 0
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Users size={14} />
              <span>{activeProject?.agents?.length || 0} Agents</span>
              <ChevronDown size={12} className="opacity-50" />
            </button>

            <AnimatePresence>
              {isAgentMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsAgentMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-20 p-1"
                  >
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Assigned Agents
                    </div>
                    <div className="max-h-40 overflow-y-auto mb-1">
                      {activeProject?.agents?.length > 0 ? (
                        activeProject.agents.map((agent: any) => (
                          <div key={agent.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-700">
                            <span className="text-base">{agent.avatar || '🐝'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{agent.name}</p>
                              <p className="text-[10px] text-zinc-400">{agent.role}</p>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-center text-[11px] text-zinc-400 italic">
                          No agents active
                        </div>
                      )}
                    </div>
                    <div className="border-t border-zinc-50 pt-1">
                      <div className="px-2 py-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Spawn New</div>
                      <button
                        onClick={() => handleAddAgent('Architect')}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <Sparkles size={12} className="text-purple-500" />
                        <span>Architect Bee</span>
                      </button>
                      <button
                        onClick={() => handleAddAgent('Developer')}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <Terminal size={12} className="text-blue-500" />
                        <span>Developer Bee</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-gray-100 mx-1"></div>

          <button
            onClick={onToggleInspector}
            className="p-2 hover:bg-gray-100 rounded-lg text-zinc-500 hover:text-blue-600 transition-colors"
            title="Deep Inspector"
          >
            <Layers size={16} />
          </button>

          <button
            onClick={onRun}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            title="Run Project"
          >
            <Play size={16} />
          </button>
          <button
            onClick={onBuild}
            className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors"
            title="Build Project"
          >
            <Hammer size={16} />
          </button>
          <button
            onClick={onCommit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <GitCommit size={12} />
            Commit
            {diffStats.added > 0 && <span className="text-[#22C55E] ml-1">+{diffStats.added}</span>}
            {diffStats.removed > 0 && <span className="text-red-400">-{diffStats.removed}</span>}
          </button>
        </div>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index}>
            {msg.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-gray-600" />
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content || ''}</p>
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 group relative">
                  <Bot size={14} className="text-white" />
                  {isLoading && index === messages.length - 1 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assistant</span>
                    {((msg.content?.includes('```thinking')) || (isLoading && index === messages.length - 1 && queenStatus === 'thinking')) && (
                      <button
                        onClick={() => toggleThinking(index)}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        <Sparkles size={10} className={isLoading && index === messages.length - 1 ? "animate-spin" : ""} />
                        <span>{isLoading && index === messages.length - 1 && !msg.content?.includes('```thinking') ? 'Pondering...' : 'View Thoughts'}</span>
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
                        <div className="pl-4 border-l-2 border-blue-200 bg-blue-50/30 py-2 my-1 rounded-r-lg space-y-1">
                          {msg.content?.includes('```thinking') ? (
                            msg.content
                              .match(/```thinking\n([\s\S]*?)```/)?.[1]
                              ?.split('\n')
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

                  {/* Render legacy tool calls (placeholders) */}
                  {msg.content?.includes('Called ') && !msg.toolCalls && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 my-2">
                      <Terminal size={12} className="text-gray-400" />
                      <span className="font-mono">
                        {msg.content.match(/Called (\w+)/)?.[0]}
                      </span>
                      <span className="text-gray-300">→</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <Check size={10} />
                        Success
                      </span>
                    </div>
                  )}

                  {/* Main content (filter out thinking blocks) */}
                  {msg.content && (
                    <div className="text-sm text-zinc-800 prose prose-sm max-w-none prose-zinc prose-pre:p-0 prose-pre:bg-transparent">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          pre: ({ node, children, ...props }) => <>{children}</>,
                          code: (props: any) => {
                            const { node, inline, className, children, ...rest } = props;
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
                                <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-900 font-mono text-[11px] border border-zinc-200" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            if (isShort && !lang) {
                              return (
                                <code className="block my-2 px-3 py-2 rounded-lg bg-zinc-50 text-zinc-700 font-mono text-[12px] border border-zinc-200" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <div className="my-4 rounded-xl border border-zinc-200 bg-[#fbfcfd] overflow-hidden shadow-sm group">
                                <div className="flex items-center justify-between px-4 py-2 bg-zinc-50/80 border-b border-zinc-100">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{lang || 'code'}</span>
                                  <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-blue-600 transition-colors"
                                  >
                                    {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                                    <span>{copied ? 'Copied!' : 'Copy code'}</span>
                                  </button>
                                </div>
                                <div className="p-5 overflow-x-auto bg-white/50">
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
                    <div className="flex items-center gap-2 text-red-500 text-xs mt-2">
                      <AlertCircle size={12} />
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
