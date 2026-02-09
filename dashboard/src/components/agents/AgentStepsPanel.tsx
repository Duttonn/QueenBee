import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ListChecks, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Play,
  Clock,
  Zap
} from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';

interface AgentStep {
  id: string;
  tool: string;
  status: 'running' | 'success' | 'error' | 'rejected';
  args: any;
  result?: any;
  error?: string;
  timestamp: number;
}

const AgentStepsPanel = () => {
  const { socket } = useHiveStore();
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!socket) return;

    const handleToolExecution = (data: any) => {
      setSteps(prev => {
        const existingIdx = prev.findIndex(s => s.id === data.toolCallId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            status: data.status,
            args: data.args
          };
          return updated;
        }
        return [{
          id: data.toolCallId || `step-${Date.now()}`,
          tool: data.tool,
          status: data.status,
          args: data.args,
          timestamp: Date.now()
        }, ...prev];
      });
    };

    const handleToolResult = (data: any) => {
      setSteps(prev => prev.map(s => 
        s.id === data.toolCallId 
          ? { ...s, status: data.status, result: data.result, error: data.error }
          : s
      ));
    };

    socket.on('TOOL_EXECUTION', handleToolExecution);
    socket.on('TOOL_RESULT', handleToolResult);

    return () => {
      socket.off('TOOL_EXECUTION', handleToolExecution);
      socket.off('TOOL_RESULT', handleToolResult);
    };
  }, [socket]);

  return (
    <div className="flex h-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-12 bg-white border border-zinc-200 rounded-xl shadow-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all z-10 ${isOpen ? 'translate-x-0' : 'translate-x-4'}`}
      >
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-white border-l border-zinc-100 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-50 bg-zinc-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks size={16} className="text-blue-600" />
                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Agent Steps</span>
              </div>
              <button 
                onClick={() => setSteps([])}
                className="text-[9px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
              {steps.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <Zap size={24} className="text-zinc-200 mb-2" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                    No active steps<br />Waiting for agent...
                  </p>
                </div>
              ) : (
                steps.map((step) => (
                  <div key={step.id} className="relative pl-6 pb-2 group">
                    {/* Line */}
                    <div className="absolute left-[9px] top-6 bottom-0 w-px bg-zinc-100 group-last:hidden" />
                    
                    {/* Status Icon */}
                    <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-white flex items-center justify-center z-10">
                      {step.status === 'running' && <Loader2 size={14} className="text-blue-500 animate-spin" />}
                      {step.status === 'success' && <CheckCircle2 size={14} className="text-emerald-500" />}
                      {step.status === 'error' && <XCircle size={14} className="text-rose-500" />}
                      {step.status === 'rejected' && <XCircle size={14} className="text-zinc-400" />}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-zinc-900 capitalize">{step.tool.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] font-mono text-zinc-400">
                          {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-zinc-500 line-clamp-2 font-mono bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                        {step.args?.path || step.args?.command || step.tool}
                      </div>

                      {step.error && (
                        <div className="mt-2 text-[9px] font-bold text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                          {step.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentStepsPanel;
