import React, { useState } from 'react';
import {
  Cloud,
  Pencil,
  BookOpen,
  MessageSquare,
  GitPullRequest,
  Clock,
  Plus,
  X,
  ChevronDown,
  Trash2,
  Play as PlayIcon,
  CheckCircle2,
  XCircle,
  Activity,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useHiveStore } from '../../store/useHiveStore';

// Recipe Card Component
const AutomationCard = ({ icon, title, description, active, onToggle, onDelete, onRun, lastRunStatus }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRun: () => void;
  lastRunStatus?: 'success' | 'failed' | 'idle';
}) => (
  <div className="bg-white border border-zinc-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all group relative overflow-hidden">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-white group-hover:shadow-sm transition-all">{icon}</div>
      <div className="flex items-center gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-10 h-5 rounded-full transition-colors relative ${active ? 'bg-green-500 shadow-sm shadow-green-200' : 'bg-zinc-200'}`}
        >
          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
    
    <div className="mb-4">
      <h3 className="text-base font-bold text-zinc-900 mb-1 flex items-center gap-2">
        {title}
        {lastRunStatus === 'success' && <CheckCircle2 size={14} className="text-green-500" />}
        {lastRunStatus === 'failed' && <XCircle size={14} className="text-red-500" />}
      </h3>
      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{description}</p>
    </div>

    <button
      onClick={onRun}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
    >
      <PlayIcon size={12} fill="currentColor" />
      Run Now
    </button>
  </div>
);

// Create Automation Modal
const CreateAutomationModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (data: any) => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:30');
  const [targetProject, setTargetProject] = useState<string | null>(null);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  
  const { projects } = useHiveStore();

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title) return;
    onCreate({
      title,
      description,
      schedule: scheduleTime,
      targetPath: projects.find(p => p.name === targetProject)?.path || '',
      active: true
    });
    onClose();
    setTitle('');
    setDescription('');
    setTargetProject(null);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/10 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              New Automation
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Automation Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Daily code review"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does it do?"
                rows={2}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Target Project</label>
                <button 
                  onClick={() => setIsProjectPickerOpen(!isProjectPickerOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 hover:border-zinc-300 transition-colors"
                >
                  <span className="text-sm truncate">{targetProject || 'Select...'}</span>
                  <ChevronDown size={14} className={`transition-transform ${isProjectPickerOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isProjectPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsProjectPickerOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden z-[70] p-1"
                      >
                         <div className="max-h-40 overflow-y-auto">
                            {projects.map(p => (
                              <button
                                key={p.id}
                                onClick={() => { setTargetProject(p.name); setIsProjectPickerOpen(false); }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-all"
                              >
                                {p.name}
                              </button>
                            ))}
                            {projects.length === 0 && (
                              <div className="px-3 py-2 text-[10px] text-zinc-400 italic">No projects found</div>
                            )}
                         </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Schedule Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50/50">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-zinc-200"
            >
              Create Automation
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ExecutionLog = () => {
  const [runs] = useState([
    { id: 1, name: 'GSD Sync', status: 'success', time: '2 mins ago', duration: '1.2s' },
    { id: 2, name: 'Cloud Backup', status: 'success', time: '1 hour ago', duration: '4.5s' },
    { id: 3, name: 'Code Review', status: 'failed', time: '3 hours ago', error: 'Lint failed' },
    { id: 4, name: 'Security Audit', status: 'success', time: 'Yesterday', duration: '12.1s' }
  ]);

  return (
    <div className="mt-16 border-t border-zinc-100 pt-10">
      <div className="flex items-center gap-2 mb-6">
        <History size={18} className="text-zinc-400" />
        <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Recent Runs</h2>
      </div>
      
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Job Name</th>
              <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Time</th>
              <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-zinc-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-zinc-900">{run.name}</span>
                </td>
                <td className="px-6 py-4">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                    run.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {run.status === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {run.status}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500 font-medium">{run.time}</td>
                <td className="px-6 py-4 text-xs text-zinc-400 font-mono text-right">{run.duration || run.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AutomationDashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { automations, addAutomation, toggleAutomation, deleteAutomation, runAutomation } = useAppStore();

  const getIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('cloud')) return <Cloud className="text-blue-500" size={24} />;
    if (lower.includes('review')) return <Pencil className="text-orange-500" size={24} />;
    if (lower.includes('doc')) return <BookOpen className="text-purple-500" size={24} />;
    if (lower.includes('summary') || lower.includes('summarize')) return <MessageSquare className="text-green-500" size={24} />;
    if (lower.includes('pr ')) return <GitPullRequest className="text-pink-500" size={24} />;
    return <Clock className="text-cyan-500" size={24} />;
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto min-h-0 selection:bg-blue-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-12 flex items-start justify-between bg-zinc-50/50 p-8 rounded-3xl border border-zinc-100">
          <div>
            <div className="flex items-center gap-3 mb-2 text-zinc-400">
              <Activity size={24} className="text-blue-600" />
              <span className="text-xs font-black uppercase tracking-widest">Automation Engine</span>
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Agentic Jobs</h1>
            <p className="text-zinc-500 text-lg font-medium mt-1">Schedule background agents for maintenance and sync.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-zinc-200 active:scale-95"
          >
            <Plus size={18} />
            <span>Create New</span>
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((recipe) => (
            <AutomationCard
              key={recipe.id}
              icon={getIcon(recipe.title)}
              title={recipe.title}
              description={recipe.description}
              active={recipe.active}
              lastRunStatus="success"
              onToggle={() => toggleAutomation(recipe.id, !recipe.active)}
              onDelete={() => {
                if (confirm('Delete this automation?')) deleteAutomation(recipe.id);
              }}
              onRun={async () => {
                if (recipe.script) {
                  try {
                    const res = await runAutomation(recipe.script);
                    console.log(`Result: ${res.stdout}`);
                  } catch (e) { console.error('Error running automation'); }
                } else {
                  alert('No script defined for this automation.');
                }
              }}
            />
          ))}
        </div>

        <ExecutionLog />

      </div>

      <CreateAutomationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={addAutomation}
      />
    </div>
  );
};

export default AutomationDashboard;