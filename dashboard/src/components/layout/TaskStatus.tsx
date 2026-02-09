import React, { useEffect, useState } from 'react';
import { useHiveStore } from '../../store/useHiveStore';
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusIcon = ({ status }: { status: 'todo' | 'in_progress' | 'done' }) => {
  if (status === 'done') return <CheckCircle2 size={12} className="text-emerald-500" />;
  if (status === 'in_progress') return <Loader2 size={12} className="text-blue-500 animate-spin" />;
  return <Circle size={12} className="text-zinc-300" />;
};

export const TaskStatus = () => {
  const { tasks, fetchTasks } = useHiveStore();
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const togglePhase = (phaseName: string) => {
    setCollapsedPhases(prev => ({ ...prev, [phaseName]: !prev[phaseName] }));
  };

  // Calculate progress
  const totalTasks = tasks.reduce((acc, phase) => acc + phase.tasks.length, 0);
  const completedTasks = tasks.reduce((acc, phase) => acc + phase.tasks.filter((t: any) => t.status === 'done').length, 0);
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 mb-2 flex items-center justify-between">
         <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">GSD Status</div>
         <div className="text-[9px] font-mono text-zinc-400">{progress}%</div>
      </div>
      
      {/* Progress Bar */}
      <div className="px-3 mb-4">
        <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div 
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-3 scrollbar-none">
        {tasks.map((phase: any, index: number) => {
           // Check if phase has active tasks to decide default collapse state (optional)
           const hasActive = phase.tasks.some((t: any) => t.status === 'in_progress');
           const isCollapsed = collapsedPhases[phase.name] ?? (phase.tasks.every((t: any) => t.status === 'done') && !hasActive);

           return (
            <div key={index} className="space-y-1">
              <button 
                onClick={() => togglePhase(phase.name)}
                className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-100 rounded-lg transition-colors text-left group"
              >
                {isCollapsed ? <ChevronRight size={10} className="text-zinc-400" /> : <ChevronDown size={10} className="text-zinc-400" />}
                <span className={`text-[10px] font-bold uppercase tracking-wider truncate flex-1 ${hasActive ? 'text-blue-600' : 'text-zinc-500'}`}>
                    {phase.name.split(':')[0]} {/* Show "PHASE 0", "PHASE 1" etc */}
                </span>
                {hasActive && (
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                )}
              </button>

              <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-0.5 ml-1"
                    >
                        {phase.tasks.map((task: any) => (
                            <div 
                                key={task.id} 
                                className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-[10px] transition-colors ${
                                    task.status === 'in_progress' ? 'bg-blue-50 border border-blue-100' : 'hover:bg-zinc-50'
                                }`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    <StatusIcon status={task.status} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium leading-snug truncate ${
                                        task.status === 'done' ? 'text-zinc-400 line-through' : 
                                        task.status === 'in_progress' ? 'text-blue-700' : 'text-zinc-600'
                                    }`}>
                                        {task.id}: {task.title}
                                    </div>
                                    {task.agentId && task.status === 'in_progress' && (
                                        <div className="flex items-center gap-1 mt-0.5 text-[8px] font-bold uppercase tracking-widest text-blue-500">
                                            <Activity size={8} />
                                            {task.agentId} working...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
           );
        })}
      </div>
    </div>
  );
};
