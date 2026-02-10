import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Send, Bot, User, Clock, MessageSquare, Sparkles } from 'lucide-react';
import { API_BASE } from '../../services/api';
import { useHiveStore } from '../../store/useHiveStore';

interface TeamMessage {
  id: string;
  agentId: string;
  role: string;
  content: string;
  timestamp: string;
}

const RoundtablePanel = ({ projectPath }: { projectPath: string }) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { socket } = useHiveStore();

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/roundtable/messages?projectPath=${encodeURIComponent(projectPath)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error('Failed to fetch roundtable messages', e);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (socket) {
      const handleNewMessage = (msg: TeamMessage) => {
        setMessages(prev => [...prev, msg]);
      };
      socket.on('TEAM_CHAT_MESSAGE', handleNewMessage);
      return () => {
        socket.off('TEAM_CHAT_MESSAGE', handleNewMessage);
      };
    }
  }, [projectPath, socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/roundtable/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          content: inputValue,
          agentId: 'You',
          role: 'user'
        })
      });

      if (res.ok) {
        setInputValue('');
      }
    } catch (e) {
      console.error('Failed to send roundtable message', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg shadow-black/20">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Roundtable Chat</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Shared Swarm Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Live Connection</span>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-zinc-50/30"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <Sparkles size={48} className="text-zinc-300 mb-4" />
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No social activity yet</p>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-tighter">Agents will coordinate here during swarms</p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                msg.role === 'user' ? 'bg-zinc-900' : 'bg-blue-500'
              }`}>
                {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
              </div>
              <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{msg.agentId}</span>
                  <span className="text-[9px] text-zinc-300 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-zinc-900 text-white rounded-tr-sm shadow-xl shadow-black/10' 
                    : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-zinc-100">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Broadcast instruction to the entire swarm..."
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl transition-all shadow-lg disabled:opacity-50 disabled:scale-100 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundtablePanel;
