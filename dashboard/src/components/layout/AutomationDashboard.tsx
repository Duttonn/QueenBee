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
  History,
  ScanSearch,
  RefreshCw,
  FileText,
  Database,
  MonitorCheck,
  Tag,
  TestTube2,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Automation } from '../../store/useAppStore';
import { useHiveStore } from '../../store/useHiveStore';
import { API_BASE } from '../../services/api';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const DAY_SHORT: Record<string, string> = { Mo: 'M', Tu: 'T', We: 'W', Th: 'Th', Fr: 'F', Sa: 'Sa', Su: 'Su' };

interface AutomationTemplate {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: Automation['type'];
  schedule: string;
  days: string[];
  script: string;
}

const TEMPLATES: AutomationTemplate[] = [
  { 
    icon: <ScanSearch className="text-blue-500" size={22} />, 
    title: 'GSD Scan', 
    description: 'Run GSD progress check every morning', 
    type: 'GSD_SCAN',
    schedule: '09:00', 
    days: ['Mo','Tu','We','Th','Fr'],
    script: 'Perform a full scan of the workspace and update GSD_TASKS.md if necessary.'
  },
  { 
    icon: <RefreshCw className="text-teal-500" size={22} />, 
    title: 'Sync Repos', 
    description: 'Sync all repos every hour', 
    type: 'SYNC_REPOS',
    schedule: '00:00', 
    days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
    script: 'Sync all connected repositories and update tasks from issues.'
  },
  { 
    icon: <GitPullRequest className="text-pink-500" size={22} />, 
    title: 'PR Review', 
    description: 'Review new PRs on push', 
    type: 'PR_REVIEW',
    schedule: '08:00', 
    days: ['Mo','Tu','We','Th','Fr'],
    script: 'Identify new pull requests and perform a code review based on project standards.'
  },
  { 
    icon: <FileText className="text-purple-500" size={22} />, 
    title: 'Changelog', 
    description: 'Analyze recent commits and generate a weekly CHANGELOG.md update.', 
    type: 'CHANGELOG',
    schedule: '10:00', 
    days: ['Fr'],
    script: 'Analyze recent commits and generate a weekly CHANGELOG.md update.'
  },
  { 
    icon: <Database className="text-amber-500" size={22} />, 
    title: 'Data Gen', 
    description: 'Generate test data nightly', 
    type: 'DATA_GEN',
    schedule: '02:00', 
    days: ['Mo','Tu','We','Th','Fr'],
    script: 'Generate synthetic test data for the current project modules.'
  },
  { 
    icon: <MonitorCheck className="text-green-500" size={22} />, 
    title: 'CI Monitor', 
    description: 'Watch CI pipeline status', 
    type: 'CI_MONITOR',
    schedule: '00:00', 
    days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
    script: 'Monitor CI pipelines and report any failures to the inbox.'
  },
  { 
    icon: <Tag className="text-orange-500" size={22} />, 
    title: 'Release Notes', 
    description: 'Draft release notes on tag', 
    type: 'RELEASE_NOTES',
    schedule: '09:00', 
    days: ['Mo','We','Fr'],
    script: 'Draft release notes for the latest version tag.'
  },
  { 
    icon: <TestTube2 className="text-cyan-500" size={22} />, 
    title: 'Test Nightly', 
    description: 'Run full test suite nightly', 
    type: 'TEST_NIGHTLY',
    schedule: '03:00', 
    days: ['Mo','Tu','We','Th','Fr'],
    script: 'Execute the full test suite and log results.'
  },
  { 
    icon: <Wrench className="text-zinc-500" size={22} />, 
    title: 'Maintenance', 
    description: 'Dependency update check weekly', 
    type: 'MAINTENANCE',
    schedule: '08:00', 
    days: ['Mo'],
    script: 'Check for dependency updates and cleanup temporary worktrees.'
  },
];

const TemplateGrid = ({ onSelect }: { onSelect: (t: AutomationTemplate) => void }) => (
  <div>
    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Quick Start Templates</p>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {TEMPLATES.map((t) => (
        <button
          key={t.title}
          onClick={() => onSelect(t)}
          className="text-left bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-100/80 transition-all group"
        >
          <div className="p-2.5 bg-zinc-50 rounded-xl w-fit mb-3 group-hover:bg-white group-hover:shadow-sm transition-all">{t.icon}</div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">{t.title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
        </button>
      ))}
    </div>
  </div>
);

function formatScheduleDisplay(schedule: string, days?: string[]): string {
  if (!days || days.length === 0 || days.length === 7) return schedule;
  const abbrev = days.map(d => DAY_SHORT[d] || d).join('');
  return `${abbrev} ${schedule}`;
}

// Automation Details Modal
const AutomationDetailsModal = ({ isOpen, onClose, automation, onUpdate }: {
  isOpen: boolean;
  onClose: () => void;
  automation: Automation;
  onUpdate: (id: string, updates: Partial<Automation>) => void;
}) => {
  const [allowedCommands, setAllowedCommands] = useState<string[]>([]);
  const { getAllowedCommands } = useAppStore();

  React.useEffect(() => {
    getAllowedCommands().then(setAllowedCommands);
  }, []);

  if (!isOpen) return null;

  const scriptLines = (automation.script || '').split('\n');
  const restrictedLines = scriptLines.map((line, idx) => {
    const cmd = line.trim().split(/\s+/)[0];
    if (!cmd) return null;
    const isRestricted = !allowedCommands.includes(cmd) && !['#', '//'].includes(cmd[0]);
    return isRestricted ? { line: idx, cmd } : null;
  }).filter((x): x is { line: number, cmd: string } => x !== null);

  const handleAuthorize = (cmd: string) => {
     const currentAllowed = automation.allowedCommands || [];
     if (!currentAllowed.includes(cmd)) {
         onUpdate(automation.id, { allowedCommands: [...currentAllowed, cmd] });
     }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <div>
                <h3 className="text-lg font-bold text-zinc-900">{automation.title}</h3>
                <p className="text-xs text-zinc-500">Automation Details & Logs</p>
            </div>
            <button onClick={onClose}><X size={20} className="text-zinc-400 hover:text-zinc-600" /></button>
          </div>
          
          <div className="p-6">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Script Execution Plan</h4>
            <div className="bg-zinc-900 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto relative max-h-96 overflow-y-auto">
                {scriptLines.map((line, i) => {
                    const restriction = restrictedLines.find(r => r.line === i);
                    return (
                        <div key={i} className="flex items-center gap-3 py-0.5 group">
                            <span className="text-zinc-700 select-none w-4 text-right">{i + 1}</span>
                            <span className={restriction ? "text-amber-400" : ""}>{line}</span>
                            {restriction && (
                                <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] text-amber-500 font-bold bg-amber-950/30 px-2 py-0.5 rounded flex items-center gap-1">
                                        <AlertTriangle size={10} /> Restricted
                                    </span>
                                    <button 
                                        onClick={() => handleAuthorize(restriction.cmd)}
                                        className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded font-bold transition-colors"
                                    >
                                        Authorize
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Recipe Card Component
const AutomationCard = ({ icon, title, description, active, onToggle, onDelete, onRun, onClick, lastRunStatus, schedule, days }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRun: () => void;
  onClick: () => void;
  lastRunStatus?: 'success' | 'failed' | 'idle';
  schedule?: string;
  days?: string[];
}) => (
  <div 
    onClick={onClick}
    className="bg-white border border-zinc-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all group relative overflow-hidden cursor-pointer"
  >
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
      {schedule && (
        <p className="text-[11px] font-mono text-zinc-400 mt-2 flex items-center gap-1.5">
          <Clock size={12} />
          {formatScheduleDisplay(schedule, days)}
        </p>
      )}
    </div>

    <button
      onClick={(e) => { e.stopPropagation(); onRun(); }}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
    >
      <PlayIcon size={12} fill="currentColor" />
      Run Now
    </button>
  </div>
);

// Create Automation Modal
const CreateAutomationModal = ({ isOpen, onClose, onCreate, initialTemplate }: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
  initialTemplate?: AutomationTemplate | null;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:30');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mo','Tu','We','Th','Fr']);
  const [targetProject, setTargetProject] = useState<string | null>(null);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [type, setType] = useState<Automation['type']>(undefined);
  const [script, setScript] = useState('');

  const { projects } = useHiveStore();

  React.useEffect(() => {
    if (initialTemplate) {
      setTitle(initialTemplate.title);
      setDescription(initialTemplate.description);
      setScheduleTime(initialTemplate.schedule);
      setSelectedDays(initialTemplate.days);
      setType(initialTemplate.type);
      setScript(initialTemplate.script);
    }
  }, [initialTemplate]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    if (!title) return;
    onCreate({
      title,
      description,
      type,
      script,
      schedule: scheduleTime,
      days: selectedDays,
      targetPath: projects.find(p => p.name === targetProject)?.path || '',
      active: true
    });
    onClose();
    setTitle('');
    setDescription('');
    setSelectedDays(['Mo','Tu','We','Th','Fr']);
    setTargetProject(null);
    setType(undefined);
    setScript('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/10 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              New Automation
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
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

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Days</label>
              <div className="flex gap-1.5">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedDays.includes(day)
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'bg-zinc-50 text-zinc-400 border border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
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
  return (
    <div className="mt-16 border-t border-zinc-100 pt-10">
      <div className="flex items-center gap-2 mb-6">
        <History size={18} className="text-zinc-400" />
        <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Recent Runs</h2>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
        <div className="text-center py-16">
          <History size={32} className="mx-auto mb-3 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">No execution history yet</p>
          <p className="text-xs text-zinc-400 mt-1">Run an automation to see results here.</p>
        </div>
      </div>
    </div>
  );
};

const AutomationDashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const { automations, addAutomation, toggleAutomation, deleteAutomation, runAutomation } = useAppStore();

  const getIcon = (title: string, type?: Automation['type']) => {
    const lower = title.toLowerCase();
    if (type === 'GSD_SCAN' || lower.includes('scan')) return <ScanSearch className="text-blue-500" size={24} />;
    if (type === 'SYNC_REPOS' || lower.includes('sync')) return <RefreshCw className="text-teal-500" size={24} />;
    if (type === 'PR_REVIEW' || lower.includes('review')) return <GitPullRequest className="text-pink-500" size={24} />;
    if (type === 'CHANGELOG' || lower.includes('changelog')) return <FileText className="text-purple-500" size={24} />;
    if (type === 'DATA_GEN' || lower.includes('data')) return <Database className="text-amber-500" size={24} />;
    if (type === 'CI_MONITOR' || lower.includes('ci')) return <MonitorCheck className="text-green-500" size={24} />;
    if (type === 'RELEASE_NOTES' || lower.includes('release')) return <Tag className="text-orange-500" size={24} />;
    if (type === 'TEST_NIGHTLY' || lower.includes('test')) return <TestTube2 className="text-cyan-500" size={24} />;
    if (type === 'MAINTENANCE' || lower.includes('maintenance')) return <Wrench className="text-zinc-500" size={24} />;
    
    return <Clock className="text-zinc-400" size={24} />;
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
        {automations.length === 0 ? (
          <TemplateGrid onSelect={(t) => { setSelectedTemplate(t); setShowCreateModal(true); }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automations.map((recipe) => (
              <AutomationCard
                key={recipe.id}
                icon={getIcon(recipe.title, recipe.type)}
                title={recipe.title}
                description={recipe.description}
                active={recipe.active}
                schedule={recipe.schedule}
                days={recipe.days}
                lastRunStatus={recipe.lastRun ? 'success' : 'idle'}
                onToggle={() => toggleAutomation(recipe.id, !recipe.active)}
                onDelete={() => {
                  if (confirm('Delete this automation?')) deleteAutomation(recipe.id);
                }}
                onRun={async () => {
                  if (recipe.script) {
                    try {
                      const res = await runAutomation(recipe.script, recipe.allowedCommands);
                      const errorMsg = (res as any).error || '';
                      if (errorMsg.includes('BLOCKED_COMMAND')) {
                          const cmdMatch = errorMsg.match(/'([^']+)'/);
                          const cmdName = cmdMatch ? cmdMatch[1] : 'a restricted command';
                          alert(`Execution Blocked: The command '${cmdName}' is restricted and hasn't been authorized for this automation.\n\nOpen the details view to authorize it.`);
                          return;
                      }
                      console.log(`Result: ${res.stdout}`);
                    } catch (e) { console.error('Error running automation', e); }
                  } else {
                    alert('No script defined for this automation.');
                  }
                }}
                onClick={() => setSelectedAutomation(recipe)}
              />
            ))}
          </div>
        )}

        <ExecutionLog />

      </div>

      <CreateAutomationModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSelectedTemplate(null); }}
        onCreate={addAutomation}
        initialTemplate={selectedTemplate}
      />

      {selectedAutomation && (
        <AutomationDetailsModal 
            isOpen={!!selectedAutomation} 
            onClose={() => setSelectedAutomation(null)} 
            automation={selectedAutomation}
            onUpdate={(id, updates) => {
                fetch(`http://127.0.0.1:3000/api/automations`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, ...updates })
                }).then(() => window.location.reload());
            }}
        />
      )}
    </div>
  );
};

export default AutomationDashboard;
