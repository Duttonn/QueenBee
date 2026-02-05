import React, { useState } from 'react';
import { 
  Bot, 
  User, 
  Terminal, 
  Cpu, 
  Mic, 
  Image as ImageIcon, 
  ChevronDown, 
  ChevronRight,
  Play
} from 'lucide-react';

const AgenticWorkbench = () => {
  const [threadMode, setThreadMode] = useState<'local' | 'worktree' | 'cloud'>('worktree');
  const [input, setInput] = useState('');

  const messages = [
    {
      id: 1,
      role: 'user',
      content: 'Refactor the authentication logic in AuthAdapter.ts to use environment variables.'
    },
    {
      id: 2,
      role: 'agent',
      status: 'thinking',
      thoughts: [
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
      name: 'fs.readFile',
      input: 'src/lib/AuthAdapter.ts',
      output: '...content of file...'
    },
    {
      id: 4,
      role: 'agent',
      status: 'done',
      content: 'I have successfully refactored the code. Created a new WorkTree `feat/auth-refactor`.'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#111] border-l border-gray-800 w-[450px]">
      
      {/* 3.1 Thread Configuration Header */}
      <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
           <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mode:</div>
           <div className="flex bg-black rounded-lg p-0.5">
              <button 
                onClick={() => setThreadMode('local')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${threadMode === 'local' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                LOCAL
              </button>
              <button 
                onClick={() => setThreadMode('worktree')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${threadMode === 'worktree' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-500 hover:text-gray-300'}`}
              >
                WORKTREE
              </button>
              <button 
                onClick={() => setThreadMode('cloud')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${threadMode === 'cloud' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                CLOUD
              </button>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <Cpu size={14} className="text-green-400" />
           <span className="text-[10px] font-mono text-green-400">GPT-4o</span>
        </div>
      </div>

      {/* 3.2 Chat Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-purple-600' : 
              msg.role === 'tool' ? 'bg-gray-800' : 'bg-blue-600'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : 
               msg.role === 'tool' ? <Terminal size={14} className="text-gray-400" /> : <Bot size={14} />}
            </div>

            {/* Content */}
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Tool Block */}
              {msg.role === 'tool' && (
                <div className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden mb-1">
                   <div className="px-3 py-2 bg-gray-900 flex items-center justify-between border-b border-gray-800">
                      <span className="text-xs font-mono text-blue-400">{msg.name}</span>
                      <span className="text-[10px] text-gray-500">Success</span>
                   </div>
                   <div className="p-2 font-mono text-[10px] text-gray-400 truncate">
                      {msg.input}
                   </div>
                </div>
              )}

              {/* Thinking Block */}
              {msg.thoughts && (
                <div className="mb-2 w-full">
                  <div className="flex items-center gap-2 text-xs text-blue-400 mb-1 cursor-pointer hover:text-blue-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span>Thinking Process</span>
                    <ChevronDown size={12} />
                  </div>
                  <div className="pl-4 border-l-2 border-blue-500/20 space-y-1">
                    {msg.thoughts.map((t: string, i: number) => (
                      <div key={i} className="text-[10px] text-gray-500 font-mono">{t}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Bubble */}
              {msg.content && (
                <div className={`text-sm leading-relaxed p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-gray-800 text-white rounded-tr-sm' 
                    : 'text-gray-300 pl-0 pt-0'
                }`}>
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3.3 The Composer */}
      <div className="p-4 bg-[#1a1a1a] border-t border-gray-800">
        <div className="relative bg-[#0d0d0d] border border-gray-700 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
          
          {/* Auto Context Pill */}
          <div className="absolute top-2 left-2 z-10">
             <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[9px] font-mono">
                <span>👀</span>
                <span>Sidebar.tsx</span>
             </div>
          </div>

          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instruct the agent..."
            className="w-full bg-transparent text-sm text-white p-3 pt-8 pb-10 min-h-[100px] outline-none resize-none font-mono"
          />

          {/* Action Bar */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
             <div className="flex gap-2">
                <button className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors">
                  <ImageIcon size={16} />
                </button>
                <button className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors">
                  <Mic size={16} />
                </button>
             </div>
             
             <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                <span>Run</span>
                <div className="bg-blue-700 p-0.5 rounded">
                   <Play size={10} fill="currentColor" />
                </div>
             </button>
          </div>
        </div>
        <div className="text-[10px] text-center text-gray-600 mt-2">
           Hold <span className="font-mono bg-gray-800 px-1 rounded">Ctrl+M</span> for voice mode
        </div>
      </div>

    </div>
  );
};

export default AgenticWorkbench;
