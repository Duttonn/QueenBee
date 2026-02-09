import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Trash2, Wrench, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface InboxItem {
  id: string;
  agentId: string;
  title: string;
  content: string;
  severity?: 'low' | 'medium' | 'high';
  status: 'unread' | 'fixing' | 'archived';
  timestamp: string;
}

const InboxPanel = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInbox = async () => {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/inbox/list');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleAction = async (id: string, action: 'archive' | 'fix') => {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/inbox/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        fetchInbox();
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const getIcon = (agentId: string) => {
    if (agentId.includes('Security')) return <AlertTriangle size={14} className="text-red-400" />;
    if (agentId.includes('Performance')) return <Clock size={14} className="text-amber-400" />;
    return <Inbox size={14} className="text-blue-400" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white">
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg shadow-black/20">
            <Inbox size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Triage Inbox</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Autonomous Findings & Actions</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-xs font-black text-zinc-900">{items.length}</span>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Active Findings</span>
            </div>
            <button 
                onClick={fetchInbox}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"
            >
                <Clock size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Scanning for findings...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-zinc-200 border-dashed">
              <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">All Clear</h3>
              <p className="text-sm font-bold text-zinc-400 mt-1 uppercase tracking-widest">No findings to triage at this moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group p-6 rounded-3xl bg-white border border-zinc-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                        {getIcon(item.agentId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{item.agentId}</span>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-zinc-900 mb-2 tracking-tight">{item.title}</h3>
                        <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(item.id, 'fix')}
                            className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95"
                          >
                            <Wrench size={14} /> Fix with Agent
                          </button>
                          <button
                            onClick={() => handleAction(item.id, 'archive')}
                            className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-zinc-400 rounded-xl transition-all active:scale-95"
                            title="Dismiss"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPanel;
