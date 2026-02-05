import React, { useState, useRef, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { type Message } from '../../services/api';

interface AgenticWorkbenchProps {
  messages: Message[];
  isLoading?: boolean;
  diffStats?: { added: number; removed: number };
  changedFiles?: string[];
  mode: 'local' | 'worktree' | 'cloud';
  onModeChange: (mode: 'local' | 'worktree' | 'cloud') => void;
}

const AgenticWorkbench = ({
  messages,
  isLoading = false,
  diffStats = { added: 0, removed: 0 },
  changedFiles = [],
  mode,
  onModeChange
}: AgenticWorkbenchProps) => {
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleThinking = (index: number) => {
    setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          {/* Mode Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['local', 'worktree', 'cloud'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === m
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
            <Play size={16} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors">
            <Hammer size={16} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors">
            <GitCommit size={12} />
            Commit
            {diffStats.added > 0 && <span className="text-green-400 ml-1">+{diffStats.added}</span>}
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
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  {/* Check if content has thinking block markers */}
                  {msg.content.includes('```thinking') && (
                    <>
                      <button
                        onClick={() => toggleThinking(index)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandedThinking[index] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span>Thinking...</span>
                      </button>
                      {expandedThinking[index] && (
                        <div className="pl-4 border-l-2 border-gray-200 space-y-1">
                          {msg.content
                            .match(/```thinking\n([\s\S]*?)```/)?.[1]
                            ?.split('\n')
                            .filter(Boolean)
                            .map((line, i) => (
                              <p key={i} className="text-xs text-gray-400 font-mono">{line}</p>
                            ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Render tool calls if present */}
                  {msg.content.includes('Called ') && (
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
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {msg.content
                      .replace(/```thinking[\s\S]*?```/g, '')
                      .replace(/Called \w+ → Success\n?/g, '')
                      .trim()}
                  </p>

                  {/* Error styling for error messages */}
                  {msg.content.startsWith('Error:') && (
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
