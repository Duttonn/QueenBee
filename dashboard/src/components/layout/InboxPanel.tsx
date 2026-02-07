import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCircle, AlertCircle, Play, Trash2, ArrowRight } from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';
import { API_BASE } from '../../services/api';

interface Finding {
  id: string;
  title: string;
  content: string;
  status: 'unread' | 'archived';
  agentId: string;
  timestamp: string;
}

const InboxPanel = () => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFindings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inbox/list`);
      if (res.ok) {
        const data = await res.json();
        setFindings(data);
      }
    } catch (e) {
      console.error('Failed to fetch inbox findings', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      await fetch(`${API_BASE}/api/inbox/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      fetchFindings();
    } catch (e) {
      console.error('Inbox action failed', e);
    }
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">Inbox Triage</h1>
            <p className="text-zinc-500 text-lg">Review background findings and autonomous audits.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-zinc-600 font-medium text-sm">
            <Inbox size={18} />
            <span>{findings.filter(f => f.status === 'unread').length} New</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-zinc-50 rounded-3xl border border-zinc-100 border-dashed">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <CheckCircle className="text-zinc-300" size={32} />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">Clear Horizon</h2>
            <p className="text-zinc-500">No background findings to triage at this moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {findings.map((item) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                    <AlertCircle className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-zinc-900 truncate">{item.title}</h3>
                      <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-widest">
                        {item.agentId}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-4 leading-relaxed">{item.content}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAction(item.id, 'archive')}
                          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-all"
                          title="Archive"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleAction(item.id, 'fix')}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
                        >
                          <span>Fix This</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPanel;