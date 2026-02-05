import React, { useState } from 'react';
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
  Check
} from 'lucide-react';

const AgenticWorkbench = () => {
  const [threadMode, setThreadMode] = useState<'local' | 'worktree' | 'cloud'>('worktree');
  const [expandedThinking, setExpandedThinking] = useState(true);

  const messages = [
    {
      id: 1,
      role: 'user',
      content: 'Refactor the authentication logic in AuthAdapter.ts to use environment variables.'
    },
    {
      id: 2,
      role: 'agent',
      thinking: [
        'Reading AuthAdapter.ts...',
        'Checking for hardcoded credentials...',
        'Identified 2 instances of API keys.',
        'Plan: Replace with process.env.AUTH_KEY'
      ],
      content: 'I will scan `AuthAdapter.ts` and replace the hardcoded keys with environment variables. I\'ll also update `.env.example`.'
    },
    {
      id: 3,
      role: 'tool',
      name: 'read_file',
      input: 'src/lib/AuthAdapter.ts',
      status: 'success'
    },
    {
      id: 4,
      role: 'agent',
      content: 'I have successfully refactored the code. Created a new WorkTree `feat/auth-refactor`.'
    }
  ];

  return (
    <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-full">

      {/* Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {/* Mode Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {['local', 'worktree', 'cloud'].map((mode) => (
              <button
                key={mode}
                onClick={() => setThreadMode(mode as typeof threadMode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${threadMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
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
            <span className="text-green-400 ml-1">+223</span>
            <span className="text-red-400">-5</span>
          </button>
        </div>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-gray-600" />
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-sm text-gray-800">{msg.content}</p>
                </div>
              </div>
            )}

            {msg.role === 'agent' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  {/* Thinking Block */}
                  {msg.thinking && (
                    <button
                      onClick={() => setExpandedThinking(!expandedThinking)}
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedThinking ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>Thinking...</span>
                    </button>
                  )}
                  {msg.thinking && expandedThinking && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-1">
                      {msg.thinking.map((t, i) => (
                        <p key={i} className="text-xs text-gray-400 font-mono">{t}</p>
                      ))}
                    </div>
                  )}
                  {/* Content */}
                  <p className="text-sm text-gray-700">{msg.content}</p>
                </div>
              </div>
            )}

            {msg.role === 'tool' && (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Terminal size={12} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">Called {msg.name}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={10} />
                      Success
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{msg.input}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File Tree Panel (Right) */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/50">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Changed Files</div>
        <div className="space-y-1">
          {['AGENTS.md', 'AuthAdapter.ts', '.env.example'].map(file => (
            <div key={file} className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
              <File size={10} className="text-gray-400" />
              <span className="font-mono">{file}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AgenticWorkbench;
