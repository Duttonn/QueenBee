import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Trash2, Wrench, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface InboxItem {
  id: string;
  type: 'gsd_scan' | 'security_audit' | 'perf_test' | 'automation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'fixing' | 'archived';
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'security_audit': return <AlertTriangle size={14} className="text-red-400" />;
      case 'perf_test': return <Clock size={14} className="text-amber-400" />;
      default: return <Inbox size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/90 backdrop-blur-xl">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox size={16} className="text-zinc-400" />
          <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-[0.2em]">Triage Inbox</h2>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-zinc-500 font-mono">
          {items.length} findings
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={32} className="mx-auto mb-3 text-zinc-800" />
            <p className="text-xs text-zinc-500">All clear! No findings to triage.</p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white/5 border border-white/5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-xs font-semibold text-zinc-200 truncate">{item.title}</h3>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${item.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                        item.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleAction(item.id, 'fix')}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Wrench size={12} /> Fix this
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'archive')}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                        title="Archive"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default InboxPanel;
