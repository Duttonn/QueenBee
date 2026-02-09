import React, { useEffect } from 'react';
import { useHiveStore } from '../../store/useHiveStore';
import { CheckCircle2, Circle, Loader2, Activity, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const StatusIcon = ({ status }: { status: 'todo' | 'in_progress' | 'done' }) => {
  if (status === 'done') return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === 'in_progress') return <Loader2 size={16} className="text-blue-500 animate-spin" />;
  return <Circle size={16} className="text-zinc-300" />;
};

export const ProjectOverview = ({ onNewThread }: { onNewThread: () => void }) => {
  const { tasks, fetchTasks } = useHiveStore();
  
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Calculate global progress
  // Correctly sum all tasks across all phases
  const totalTasks = tasks.reduce((acc, phase) => acc + (phase.tasks ? phase.tasks.length : 0), 0);
  const completedTasks = tasks.reduce((acc, phase) => {
    return acc + (phase.tasks ? phase.tasks.filter((t: any) => t.status === 'done').length : 0);
  }, 0);
  
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-zinc-50/30 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">Project Status</h1>
            <p className="text-zinc-500 text-sm">Global Status & Dispatch (GSD) Overview</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <div className="text-2xl font-mono font-bold text-zinc-900">{progress}%</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Completion</div>
             </div>
             <button 
                onClick={onNewThread}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
             >
                <Plus size={18} />
                <span>New Thread</span>
             </button>
          </div>
        </div>

        {/* Phases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map((phase: any, index: number) => {
             const phaseTasks = phase.tasks || [];
             const phaseProgress = phaseTasks.length > 0 
                ? Math.round((phaseTasks.filter((t: any) => t.status === 'done').length / phaseTasks.length) * 100)
                : 0;
             const isComplete = phaseProgress === 100 && phaseTasks.length > 0;

             return (
               <motion.div 
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
                 className={`bg-white rounded-2xl border ${isComplete ? 'border-zinc-200' : 'border-blue-100 ring-4 ring-blue-50/50'} shadow-sm overflow-hidden flex flex-col`}
               >
                 <div className="px-5 py-4 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {index}
                        </div>
                        <h3 className="font-bold text-zinc-900 text-sm">{phase.name.replace(/^PHASE \d+: /, '')}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {phaseProgress}%
                    </span>
                 </div>

                 <div className="p-2 flex-1 overflow-y-auto max-h-[400px]">
                    {phaseTasks.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-400 italic">No tasks in this phase</div>
                    ) : (
                        phaseTasks.map((task: any) => (
                            <div key={task.id} className="group p-2 hover:bg-zinc-50 rounded-xl transition-colors">
                                <div className="flex gap-3">
                                    <div className="mt-0.5 flex-shrink-0">
                                        <StatusIcon status={task.status} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-medium leading-snug ${task.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
                                            {task.title}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{task.id}</span>
                                            {task.agentId && task.status === 'in_progress' && (
                                                <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">
                                                    <Activity size={10} /> {task.agentId}
                                                </span>
                                            )}
                                            {task.worker && (
                                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 px-1.5 py-0.5 rounded">
                                                    {task.worker}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
               </motion.div>
             );
          })}
        </div>
      </div>
    </div>
  );
};