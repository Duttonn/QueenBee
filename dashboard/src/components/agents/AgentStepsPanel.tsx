import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ListChecks, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Activity,
  Target,
  MapPin,
  Check,
  Bot,
  Cpu
} from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';
import { type Message } from '../../services/api';

interface AgentStep {
  id: string;
  tool: string;
  status: 'running' | 'success' | 'error' | 'rejected';
  args: any;
  result?: any;
  error?: string;
  timestamp: number;
}

interface ParsedPlan {
  goal: string;
  steps: { text: string; outcome?: string }[];
  currentStep: number;
  isUpdate: boolean;
  failed?: string;
  newApproach?: string;
}

function parsePlanString(raw: string): ParsedPlan | null {
  if (!raw) return null;
  const goalMatch = raw.match(/GOAL:\s*(.+)/);
  const currentStepMatch = raw.match(/CURRENT_STEP:\s*(.+)/);
  const failedMatch = raw.match(/FAILED:\s*(.+)/);
  const newApproachMatch = raw.match(/NEW_APPROACH:\s*(.+)/);
  const stepsMatch = raw.match(/STEPS:\s*\n([\s\S]*?)(?=\nCURRENT_STEP:|$)/);
  const steps = stepsMatch
    ? stepsMatch[1].split('\n').filter(s => s.trim()).map(s => {
        const cleaned = s.replace(/^\d+\.\s*/, '').trim();
        const parts = cleaned.split('->');
        return { text: parts[0].trim(), outcome: parts[1]?.trim() };
      })
    : [];

  return {
    goal: goalMatch?.[1] || '',
    steps,
    currentStep: currentStepMatch ? parseInt(currentStepMatch[1]) : 0,
    isUpdate: !!failedMatch || !!newApproachMatch,
    failed: failedMatch?.[1],
    newApproach: newApproachMatch?.[1],
  };
}

function extractPlansFromMessages(messages: Message[]): ParsedPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || typeof msg.content !== 'string') continue;
    
    const planUpdateMatch = msg.content.match(/<plan_update>([\s\S]*?)<\/plan_update>/);
    const planMatch = msg.content.match(/<plan>([\s\S]*?)<\/plan>/);
    const raw = planUpdateMatch?.[1] || planMatch?.[1];
    if (!raw) continue;

    return parsePlanString(raw);
  }
  return null;
}

/** Extract task steps from worker instructions */
function parseWorkerTasks(instructions: string): { id: string; text: string }[] {
  if (!instructions) return [];
  const tasks: { id: string; text: string }[] = [];
  
  // Try to extract numbered tasks/steps from instructions
  // Pattern: lines starting with a number, dash, or bullet
  const lines = instructions.split('\n');
  let taskIndex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered items like "1. ...", "1) ...", "- ...", "* ..."
    const match = trimmed.match(/^(?:(\d+)[.)]\s*|[-*]\s+)(.+)/);
    if (match) {
      const text = match[2].trim();
      // Skip very short or meta lines
      if (text.length > 5 && !text.startsWith('ROLE:') && !text.startsWith('##')) {
        taskIndex++;
        tasks.push({ id: `task-${taskIndex}`, text });
      }
    }
  }
  
  // If no structured tasks found, try to extract from section headers
  if (tasks.length === 0) {
    for (const line of lines) {
      const headerMatch = line.trim().match(/^#{1,3}\s+(.+)/);
      if (headerMatch && !headerMatch[1].startsWith('Roundtable') && !headerMatch[1].startsWith('Role')) {
        taskIndex++;
        tasks.push({ id: `task-${taskIndex}`, text: headerMatch[1] });
      }
    }
  }
  
  return tasks;
}

/** Estimate worker task completion based on tool results in messages */
function estimateTaskCompletion(messages: Message[]): number {
  const toolCalls = messages.filter(m => 
    m.role === 'assistant' && Array.isArray((m as any).toolCalls) && (m as any).toolCalls.length > 0
  );
  const successfulTools = toolCalls.filter(m => 
    (m as any).toolCalls?.some((tc: any) => tc.status === 'success')
  );
  // Each successful tool call represents progress
  return successfulTools.length;
}

/** Extract REQ- checklist items and remaining markdown from the last assistant message */
function extractArchitectPlan(messages: Message[]): { reqs: { id: string; text: string; checked: boolean }[]; markdown: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || typeof msg.content !== 'string') continue;
    
    const reqPattern = /^- \[([ x])\] (REQ-\d+):\s*(.+)$/gm;
    const reqs: { id: string; text: string; checked: boolean }[] = [];
    let match;
    while ((match = reqPattern.exec(msg.content)) !== null) {
      reqs.push({ checked: match[1] === 'x', id: match[2], text: match[3].trim() });
    }
    
    if (reqs.length > 0) {
      const rest = msg.content.replace(/^- \[[ x]\] REQ-\d+:\s*.+$/gm, '').trim();
      return { reqs, markdown: rest };
    }
  }
  return null;
}

/** Requirements card — matches the style from AgenticWorkbench */
const RequirementsCard = ({ reqs }: { reqs: { id: string; text: string; checked: boolean }[] }) => (
  <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white shadow-sm overflow-hidden">
    <div className="px-4 py-2.5 border-b border-blue-100/60 bg-blue-50/50 flex items-center gap-2">
      <ListChecks size={13} className="text-blue-600" />
      <span className="text-[10px] font-black text-blue-800 uppercase tracking-[0.12em]">Requirements</span>
      <span className="ml-auto text-[9px] font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">{reqs.length}</span>
    </div>
    <div className="p-3 space-y-1">
      {reqs.map(r => (
        <div key={r.id} className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-blue-50/40 transition-colors group">
          <div className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            r.checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 group-hover:border-blue-400'
          }`}>
            {r.checked && <Check size={10} className="text-white" strokeWidth={3} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider">{r.id}</span>
            </div>
            <p className={`text-[12px] leading-relaxed mt-0.5 ${r.checked ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>{r.text}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Worker tasks card — shows assigned tasks for a worker thread */
const WorkerTasksCard = ({ tasks, completedCount, status }: { tasks: { id: string; text: string }[]; completedCount: number; status?: string }) => (
  <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/40 to-white shadow-sm overflow-hidden">
    <div className="px-4 py-2.5 border-b border-violet-100/60 bg-violet-50/50 flex items-center gap-2">
      <ListChecks size={13} className="text-violet-600" />
      <span className="text-[10px] font-black text-violet-800 uppercase tracking-[0.12em]">Assigned Tasks</span>
      <span className="ml-auto text-[9px] font-bold text-violet-500 bg-violet-100 px-1.5 py-0.5 rounded-full">
        {status === 'completed' ? tasks.length : Math.min(completedCount, tasks.length)}/{tasks.length}
      </span>
    </div>
    <div className="p-3 space-y-1">
      {tasks.map((task, idx) => {
        const isDone = status === 'completed' || idx < completedCount;
        const isCurrent = !isDone && idx === completedCount && status === 'running';
        return (
          <div key={task.id} className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-violet-50/40 transition-colors group">
            <div className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isDone ? 'bg-emerald-500 border-emerald-500' :
              isCurrent ? 'bg-violet-500 border-violet-500' :
              'border-zinc-300'
            }`}>
              {isDone && <Check size={10} className="text-white" strokeWidth={3} />}
              {isCurrent && <Loader2 size={10} className="text-white animate-spin" />}
            </div>
            <p className={`text-[11px] leading-relaxed ${
              isDone ? 'text-zinc-400 line-through' : 
              isCurrent ? 'text-zinc-900 font-medium' : 
              'text-zinc-500'
            }`}>{task.text}</p>
          </div>
        );
      })}
    </div>
  </div>
);

/** Architect overview — shows all workers and their status */
const WorkerOverviewCard = ({ workers }: { workers: { id: string; title: string; status: string; taskCount: number; completedCount: number }[] }) => {
  const totalTasks = workers.reduce((acc, w) => acc + w.taskCount, 0);
  const totalCompleted = workers.reduce((acc, w) => acc + (w.status === 'completed' ? w.taskCount : w.completedCount), 0);
  
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Swarm Progress</span>
            <span className="text-[9px] font-bold text-zinc-900">{totalCompleted}/{totalTasks}</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Worker cards */}
      {workers.map(worker => (
        <div key={worker.id} className="mx-3 rounded-xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              worker.status === 'completed' ? 'bg-emerald-500' :
              worker.status === 'failed' ? 'bg-rose-500' :
              worker.status === 'running' ? 'bg-blue-500 animate-pulse' :
              'bg-zinc-300'
            }`} />
            <Bot size={12} className="text-zinc-400" />
            <span className="text-[11px] font-bold text-zinc-800 flex-1 truncate">{worker.title}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              worker.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
              worker.status === 'failed' ? 'bg-rose-50 text-rose-600' :
              worker.status === 'running' ? 'bg-blue-50 text-blue-600' :
              'bg-zinc-50 text-zinc-500'
            }`}>
              {worker.status === 'completed' ? 'Done' :
               worker.status === 'failed' ? 'Failed' :
               worker.status === 'running' ? 'Running' : 'Starting'}
            </span>
          </div>
          {worker.taskCount > 0 && (
            <div className="px-3 pb-2">
              <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    worker.status === 'failed' ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${worker.status === 'completed' ? 100 : worker.taskCount > 0 ? Math.round((worker.completedCount / worker.taskCount) * 100) : 0}%` }}
                />
              </div>
              <div className="text-[9px] text-zinc-400 mt-1">
                {worker.status === 'completed' ? worker.taskCount : worker.completedCount}/{worker.taskCount} tasks
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface AgentStepsPanelProps {
  messages?: Message[];
}

const AgentStepsPanel = ({ messages = [] }: AgentStepsPanelProps) => {
  const { socket, tasks, active_plan, isOrchestratorActive, activeThreadId, projects, selectedProjectId } = useHiveStore();
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  // Get current thread info
  const activeProject = useMemo(() => projects.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId]);
  const activeThread = useMemo(() => activeProject?.threads?.find((t: any) => t.id === activeThreadId), [activeProject, activeThreadId]);
  const isWorkerThread = activeThread?.isWorker;
  const isArchitectThread = activeThreadId?.startsWith('architect-');

  // Parse worker tasks from instructions
  const workerTasks = useMemo(() => {
    if (!isWorkerThread || !activeThread?.instructions) return [];
    return parseWorkerTasks(activeThread.instructions);
  }, [isWorkerThread, activeThread?.instructions]);

  // Estimate completion for worker
  const workerCompletedCount = useMemo(() => {
    if (!isWorkerThread) return 0;
    return estimateTaskCompletion(messages);
  }, [isWorkerThread, messages]);

  // Get all worker threads for architect view
  const workerThreads = useMemo(() => {
    if (!isArchitectThread || !activeProject) return [];
    const swarmId = activeThreadId;
    return (activeProject.threads || [])
      .filter((t: any) => t.isWorker && t.swarmId === swarmId)
      .map((t: any) => {
        const tasks = parseWorkerTasks(t.instructions || '');
        const completed = estimateTaskCompletion(t.messages || []);
        return {
          id: t.id,
          title: t.title || t.parentTaskId || 'Worker',
          status: t.workerStatus || 'running',
          taskCount: tasks.length,
          completedCount: Math.min(completed, tasks.length)
        };
      });
  }, [isArchitectThread, activeProject, activeThreadId]);

  // Calculate global progress from HiveStore tasks
  const progressData = useMemo(() => {
    const total = tasks.reduce((acc: number, phase: any) => acc + (phase.tasks ? phase.tasks.length : 0), 0);
    const completed = tasks.reduce((acc: number, phase: any) => {
      return acc + (phase.tasks ? phase.tasks.filter((t: any) => t.status === 'done').length : 0);
    }, 0);
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  // Extract architect plan from messages when in QB mode
  const architectPlan = useMemo(() => {
    if (!isOrchestratorActive) return null;
    return extractArchitectPlan(messages);
  }, [isOrchestratorActive, messages]);

  // Derive the current swarm phase
  const swarmPhase = useMemo<'planning' | 'prompting' | 'launched' | null>(() => {
    if (!isOrchestratorActive || !isArchitectThread) return null;

    const hasWorkers = activeProject?.threads?.some((t: any) => t.isWorker);
    if (hasWorkers) return 'launched';

    if (architectPlan) {
      let planMsgIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && typeof messages[i].content === 'string' && /REQ-\d+/.test(messages[i].content as string)) {
          planMsgIdx = i;
          break;
        }
      }
      if (planMsgIdx >= 0) {
        const hasUserResponseAfterPlan = messages.slice(planMsgIdx + 1).some(m => m.role === 'user');
        if (hasUserResponseAfterPlan) return 'prompting';
      }
      return 'planning';
    }

    return 'planning';
  }, [isOrchestratorActive, isArchitectThread, architectPlan, messages, activeProject]);

  useEffect(() => {
    if (!socket) return;

    const handleToolExecution = (data: any) => {
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

  // Determine panel title
  const panelTitle = isWorkerThread 
    ? (activeThread?.title || 'Worker Tasks')
    : isArchitectThread 
      ? 'Swarm Overview' 
      : isOrchestratorActive 
        ? 'Swarm Plan' 
        : 'Agent Execution';

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
                {isWorkerThread ? <Bot size={14} className="text-violet-600" /> : 
                 isArchitectThread ? <Cpu size={14} className="text-zinc-900" /> :
                 <Target size={14} className="text-zinc-900" />}
                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.1em]">
                  {panelTitle}
                </span>
              </div>
              {!isOrchestratorActive && !isWorkerThread && (
                <button 
                  onClick={() => setSteps([])}
                  className="text-[9px] font-black text-zinc-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                >
                  Clear
                </button>
              )}
              {isWorkerThread && activeThread?.workerStatus && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeThread.workerStatus === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                  activeThread.workerStatus === 'failed' ? 'bg-rose-50 text-rose-600' :
                  activeThread.workerStatus === 'running' ? 'bg-blue-50 text-blue-600' :
                  'bg-zinc-50 text-zinc-500'
                }`}>
                  {activeThread.workerStatus === 'completed' ? 'Completed' :
                   activeThread.workerStatus === 'failed' ? 'Failed' :
                   activeThread.workerStatus === 'running' ? 'Running' : 'Starting'}
                </span>
              )}
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {/* Worker thread view: show assigned tasks */}
              {isWorkerThread && workerTasks.length > 0 ? (
                <div className="p-3">
                  <WorkerTasksCard 
                    tasks={workerTasks} 
                    completedCount={workerCompletedCount}
                    status={activeThread?.workerStatus}
                  />
                </div>
              ) : isWorkerThread ? (
                <div className="p-4">
                  <div className="flex items-center gap-1.5">
                    {activeThread?.workerStatus === 'running' && <Loader2 size={10} className="text-violet-400 animate-spin" />}
                    <span className="text-[10px] text-zinc-400">
                      {activeThread?.workerStatus === 'running' ? 'Worker executing tasks...' : 
                       activeThread?.workerStatus === 'completed' ? 'Worker completed all tasks.' :
                       activeThread?.workerStatus === 'failed' ? 'Worker encountered an error.' :
                       'Worker starting...'}
                    </span>
                  </div>
                </div>
              ) : isArchitectThread && swarmPhase === 'launched' && workerThreads.length > 0 ? (
                /* Architect view: show worker overview when launched */
                <div className="py-3">
                  <WorkerOverviewCard workers={workerThreads} />
                </div>
              ) : isArchitectThread && swarmPhase ? (
                /* Architect view: show pipeline stepper before launch */
                <div className="p-4 space-y-4">
                  {([
                    { key: 'planning', label: 'Plan Requirements', desc: 'Architect scouts codebase & builds implementation plan' },
                    { key: 'prompting', label: 'Generate Agent Prompts', desc: 'Creating detailed instructions for each worker bee' },
                    { key: 'launched', label: 'Approve & Launch Agents', desc: 'Workers executing in isolated worktrees' },
                  ] as const).map((phase, idx) => {
                    const phaseOrder = ['planning', 'prompting', 'launched'] as const;
                    const currentIdx = phaseOrder.indexOf(swarmPhase);
                    const thisIdx = phaseOrder.indexOf(phase.key);
                    const isDone = thisIdx < currentIdx;
                    const isCurrent = thisIdx === currentIdx;
                    return (
                      <div key={phase.key} className="relative">
                        {idx < 2 && (
                          <div className={`absolute left-[13px] top-[28px] w-[2px] h-[calc(100%+4px)] ${
                            isDone ? 'bg-emerald-300' : 'bg-zinc-200'
                          }`} />
                        )}
                        <div className="flex items-start gap-3">
                          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-all ${
                            isDone ? 'bg-emerald-500 text-white' :
                            isCurrent ? 'bg-zinc-900 text-white ring-4 ring-zinc-900/10' :
                            'bg-zinc-100 text-zinc-400 border-2 border-zinc-200'
                          }`}>
                            {isDone ? <Check size={13} strokeWidth={3} /> : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className={`text-[11px] font-bold leading-tight ${
                              isDone ? 'text-emerald-600' : isCurrent ? 'text-zinc-900' : 'text-zinc-400'
                            }`}>
                              {phase.label}
                            </div>
                            <div className={`text-[10px] mt-0.5 leading-snug ${
                              isCurrent ? 'text-zinc-500' : 'text-zinc-300'
                            }`}>
                              {phase.desc}
                            </div>
                            {isCurrent && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <Loader2 size={10} className="text-zinc-400 animate-spin" />
                                <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider">
                                  {swarmPhase === 'planning' && !architectPlan ? 'Scouting...' :
                                   swarmPhase === 'planning' && architectPlan ? 'Awaiting approval' :
                                   swarmPhase === 'prompting' ? 'Building prompts...' :
                                   'Workers running...'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {phase.key === 'planning' && architectPlan && (isDone || isCurrent) && (
                          <div className="ml-10 mt-2">
                            <RequirementsCard reqs={architectPlan.reqs} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Normal mode: Execution Plan + Tool Steps */
                <>
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

                  {/* Execution Plan card */}
                  {(() => {
                    const plan = active_plan ? parsePlanString(active_plan) : extractPlansFromMessages(messages);
                    if (!plan) return null;
                    return (
                      <div className={`mx-3 mt-3 rounded-2xl border ${plan.isUpdate ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-200 bg-white'} shadow-sm overflow-hidden`}>
                        <div className={`px-3 py-2.5 border-b ${plan.isUpdate ? 'border-amber-100 bg-amber-50/50' : 'border-zinc-100 bg-zinc-50/50'} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className={plan.isUpdate ? 'text-amber-600' : 'text-blue-600'} />
                            <span className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">
                              {plan.isUpdate ? 'Plan Update' : 'Execution Plan'}
                            </span>
                          </div>
                          {plan.currentStep > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              {plan.currentStep}/{plan.steps.length}
                            </span>
                          )}
                        </div>
                        <div className="p-3 space-y-2.5">
                          {plan.goal && (
                            <div className="text-[11px] font-bold text-zinc-800">{plan.goal}</div>
                          )}
                          {plan.failed && (
                            <div className="text-[10px] text-amber-700 bg-amber-100/50 rounded-lg px-2.5 py-1.5">
                              <span className="font-bold">Failed:</span> {plan.failed}
                            </div>
                          )}
                          {plan.newApproach && (
                            <div className="text-[10px] text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5">
                              <span className="font-bold">New approach:</span> {plan.newApproach}
                            </div>
                          )}
                          {plan.steps.length > 0 && (
                            <div className="space-y-1">
                              {plan.steps.map((step, i) => {
                                const stepNum = i + 1;
                                const isDone = stepNum < plan.currentStep;
                                const isCurrent = stepNum === plan.currentStep;
                                return (
                                  <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                                    <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center text-[7px] font-bold ${
                                      isDone ? 'bg-emerald-100 text-emerald-600' :
                                      isCurrent ? 'bg-blue-500 text-white' :
                                      'bg-zinc-100 text-zinc-400'
                                    }`}>
                                      {isDone ? '✓' : stepNum}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-[10px] leading-tight ${isDone ? 'text-zinc-400 line-through' : isCurrent ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
                                        {step.text}
                                      </span>
                                      {step.outcome && (
                                        <span className="text-[9px] text-zinc-400 ml-1">→ {step.outcome}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Steps Timeline */}
                  <div className="p-4 space-y-6">
                    {steps.length === 0 && !active_plan && !extractPlansFromMessages(messages) ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                        <Activity size={24} className="text-zinc-400 mb-2" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                          Idle<br />Waiting for tools
                        </p>
                      </div>
                    ) : steps.length === 0 ? null : (
                      steps.map((step, idx) => (
                        <div key={step.id} className="relative pl-6 pb-1 group">
                          {idx !== steps.length - 1 && (
                            <div className="absolute left-[7px] top-5 bottom-[-24px] w-[1px] bg-zinc-100" />
                          )}
                          
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentStepsPanel;
