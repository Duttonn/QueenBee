import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ListChecks, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Activity,
  Target
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
  const { socket, tasks } = useHiveStore();
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  // Calculate global progress from HiveStore tasks
  const progressData = useMemo(() => {
    const total = tasks.reduce((acc, phase) => acc + (phase.tasks ? phase.tasks.length : 0), 0);
    const completed = tasks.reduce((acc, phase) => {
      return acc + (phase.tasks ? phase.tasks.filter((t: any) => t.status === 'done').length : 0);
    }, 0);
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  useEffect(() => {
    if (!socket) return;

    const handleToolExecution = (data: any) => {
      // Auto-open if a new tool starts
      if (!isOpen) setIsOpen(true);

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
  }, [socket, isOpen]);

  return (
    <div className="flex h-full relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-10 bg-white border border-zinc-200 rounded-lg shadow-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all z-20 ${isOpen ? 'translate-x-0' : 'translate-x-3'}`}
      >
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-white border-l border-zinc-100 flex flex-col overflow-hidden shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.05)]"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-zinc-900" />
                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.1em]">Agent Execution</span>
              </div>
              <button 
                onClick={() => setSteps([])}
                className="text-[9px] font-black text-zinc-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Global Progress Summary */}
            {progressData.total > 0 && (
              <div className="px-4 py-3 bg-zinc-50/50 border-b border-zinc-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Global Progress</div>
                  <div className="text-[9px] font-bold text-zinc-900">{progressData.completed}/{progressData.total} Tasks</div>
                </div>
                <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressData.percentage}%` }}
                    className="h-full bg-zinc-900"
                  />
                </div>
              </div>
            )}

            {/* Steps Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
              {steps.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                  <Activity size={24} className="text-zinc-400 mb-2" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                    Idle<br />Waiting for tools
                  </p>
                </div>
              ) : (
                steps.map((step, idx) => (
                  <div key={step.id} className="relative pl-6 pb-1 group">
                    {/* Line */}
                    {idx !== steps.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-[-24px] w-[1px] bg-zinc-100" />
                    )}
                    
                    {/* Status Icon */}
                    <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center z-10">
                      {step.status === 'running' && <Loader2 size={12} className="text-blue-500 animate-spin" />}
                      {step.status === 'success' && <CheckCircle2 size={12} className="text-emerald-500" />}
                      {step.status === 'error' && <XCircle size={12} className="text-rose-500" />}
                      {step.status === 'rejected' && <XCircle size={12} className="text-zinc-300" />}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-tight">{(step.tool || 'unknown').replace(/_/g, ' ')}</span>
                        <span className="text-[8px] font-medium text-zinc-400">
                          {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-zinc-500 font-mono bg-zinc-50/80 p-2 rounded-lg border border-zinc-100 break-all leading-relaxed">
                        {step.args?.path || step.args?.command || step.args?.title || step.tool}
                      </div>

                      {step.error && (
                        <div className="mt-2 text-[9px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 leading-snug">
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
