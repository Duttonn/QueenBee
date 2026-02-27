import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  RefreshCw,
  FileText,
  Activity,
  DollarSign,
  Brain,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';
import { API_BASE } from '../../services/api';

const API = `${API_BASE}/api`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileExtStat {
  ext: string;
  count: number;
}

interface LargeFile {
  path: string;
  size: number;
}

interface SessionEntry {
  id: string;
  agentId: string;
  status: 'completed' | 'failed' | 'running' | string;
  cost?: number;
  toolsUsed?: number;
  timestamp: number;
}

interface CostBreakdown {
  total: number;
  byModel: Record<string, number>;
}

interface MemoryStats {
  total: number;
  byType: Record<string, number>;
  avgConfidence: number;
}

interface WorktreeEntry {
  branch: string;
  path: string;
  commitish: string;
}

interface InspectorData {
  files?: {
    total: number;
    byExtension: FileExtStat[];
    largest: LargeFile[];
  };
  sessions?: SessionEntry[];
  costs?: CostBreakdown;
  memory?: MemoryStats;
  worktrees?: WorktreeEntry[];
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'files' | 'sessions' | 'costs' | 'memory' | 'worktrees';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'files', label: 'Files', icon: <FileText size={12} /> },
  { id: 'sessions', label: 'Sessions', icon: <Activity size={12} /> },
  { id: 'costs', label: 'Costs', icon: <DollarSign size={12} /> },
  { id: 'memory', label: 'Memory', icon: <Brain size={12} /> },
  { id: 'worktrees', label: 'Worktrees', icon: <GitBranch size={12} /> },
];

// ─── Sub-panels ───────────────────────────────────────────────────────────────

const FilesTab = ({ data }: { data: InspectorData['files'] }) => {
  if (!data) return <EmptyMsg msg="No file data" />;
  const maxCount = Math.max(...data.byExtension.map(e => e.count), 1);

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <span className="text-2xl font-black text-zinc-900">{data.total.toLocaleString()}</span>
        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Total Files</div>
      </div>

      <div>
        <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          By Extension (top 10)
        </div>
        <div className="space-y-1.5">
          {data.byExtension.slice(0, 10).map(e => (
            <div key={e.ext} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 w-14 flex-shrink-0 text-right">{e.ext || 'no ext'}</span>
              <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{ width: `${Math.round((e.count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400 tabular-nums w-8 text-right">{e.count}</span>
            </div>
          ))}
        </div>
      </div>

      {data.largest && data.largest.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Largest Files
          </div>
          <div className="space-y-1">
            {data.largest.slice(0, 8).map((f, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-50 last:border-0">
                <span className="text-[10px] font-mono text-zinc-600 flex-1 truncate">{f.path}</span>
                <span className="text-[9px] text-zinc-400 flex-shrink-0 tabular-nums">
                  {f.size >= 1024 * 1024
                    ? `${(f.size / 1024 / 1024).toFixed(1)}MB`
                    : `${Math.round(f.size / 1024)}KB`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'completed')
    return (
      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
        <CheckCircle2 size={9} /> Done
      </span>
    );
  if (status === 'failed')
    return (
      <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
        <XCircle size={9} /> Failed
      </span>
    );
  if (status === 'running')
    return (
      <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
        <Loader2 size={9} className="animate-spin" /> Running
      </span>
    );
  return (
    <span className="text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{status}</span>
  );
};

const SessionsTab = ({ data }: { data: InspectorData['sessions'] }) => {
  if (!data || data.length === 0) return <EmptyMsg msg="No sessions recorded" />;
  return (
    <div className="space-y-2">
      {data.map(s => (
        <div key={s.id} className="border border-zinc-100 rounded-lg px-3 py-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[140px]">{s.id}</span>
            <StatusBadge status={s.status} />
          </div>
          <div className="flex items-center gap-3 text-[9px] text-zinc-400">
            {s.cost !== undefined && (
              <span className="flex items-center gap-0.5">
                <DollarSign size={9} />{s.cost.toFixed(4)}
              </span>
            )}
            {s.toolsUsed !== undefined && (
              <span>{s.toolsUsed} tools</span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock size={9} />{new Date(s.timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const CostsTab = ({ data }: { data: InspectorData['costs'] }) => {
  if (!data) return <EmptyMsg msg="No cost data" />;
  const entries = Object.entries(data.byModel || {});
  const total = data.total || entries.reduce((acc, [, v]) => acc + v, 0);

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <span className="text-2xl font-black text-zinc-900">${total.toFixed(4)}</span>
        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Total Cost</div>
      </div>
      {entries.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            By Model
          </div>
          <div className="space-y-2">
            {entries.map(([model, cost]) => {
              const pct = total > 0 ? Math.round((cost / total) * 100) : 0;
              return (
                <div key={model}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[180px]">{model}</span>
                    <span className="text-[10px] text-zinc-500 tabular-nums">${cost.toFixed(4)}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-zinc-300 text-right mt-0.5">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MemoryTab = ({ data }: { data: InspectorData['memory'] }) => {
  if (!data) return <EmptyMsg msg="No memory data" />;
  const typeEntries = Object.entries(data.byType || {});

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <span className="text-2xl font-black text-zinc-900">{data.total}</span>
        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Total Memories</div>
      </div>

      {typeEntries.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            By Type
          </div>
          <div className="space-y-1">
            {typeEntries.map(([type, count]) => (
              <div key={type} className="flex justify-between text-xs">
                <span className="text-zinc-600 capitalize">{type}</span>
                <span className="text-zinc-400 tabular-nums font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Avg Confidence
          </span>
          <span className="text-[10px] text-zinc-600 tabular-nums">{Math.round(data.avgConfidence * 100)}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(data.avgConfidence * 100)}%` }}
            className="h-full bg-emerald-400 rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

const WorktreesTab = ({ data }: { data: InspectorData['worktrees'] }) => {
  if (!data || data.length === 0) return <EmptyMsg msg="No active worktrees" />;
  return (
    <div className="space-y-2">
      {data.map((w, i) => (
        <div key={i} className="border border-zinc-100 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={11} className="text-violet-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-800 truncate">{w.branch}</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-400 truncate">{w.path}</div>
          {w.commitish && (
            <div className="text-[9px] text-zinc-300 font-mono mt-0.5">{w.commitish}</div>
          )}
        </div>
      ))}
    </div>
  );
};

const EmptyMsg = ({ msg }: { msg: string }) => (
  <div className="text-center py-8 text-zinc-300 text-xs">{msg}</div>
);

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface DeepInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeepInspector: React.FC<DeepInspectorProps> = ({ isOpen, onClose }) => {
  const { projects, selectedProjectId } = useHiveStore();
  const activeProject = projects.find(p => p.id === selectedProjectId);
  const projectPath = activeProject?.path;

  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [data, setData] = useState<InspectorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/inspector?projectPath=${encodeURIComponent(projectPath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  const renderTab = () => {
    if (!data) return null;
    switch (activeTab) {
      case 'files': return <FilesTab data={data.files} />;
      case 'sessions': return <SessionsTab data={data.sessions} />;
      case 'costs': return <CostsTab data={data.costs} />;
      case 'memory': return <MemoryTab data={data.memory} />;
      case 'worktrees': return <WorktreesTab data={data.worktrees} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 420 }}
          animate={{ x: 0 }}
          exit={{ x: 420 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-zinc-200 shadow-2xl z-[60] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Search size={14} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-800">Deep Inspector</div>
                <div className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                  {activeProject?.name ?? 'No project selected'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-1.5 rounded hover:bg-white/60 transition-colors" title="Refresh">
                <RefreshCw size={13} className={`text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-white/60 transition-colors">
                <X size={14} className="text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-zinc-100 flex-shrink-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-500 bg-blue-50/30'
                    : 'text-zinc-400 border-transparent hover:text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!projectPath && (
              <div className="text-center text-zinc-400 text-sm mt-8">
                Select a project to inspect.
              </div>
            )}

            {projectPath && loading && !data && (
              <div className="flex items-center justify-center mt-12">
                <Loader2 size={20} className="animate-spin text-zinc-300" />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                <AlertTriangle size={12} />
                {error}
              </div>
            )}

            {projectPath && !loading && !error && !data && (
              <div className="text-center text-zinc-300 text-xs mt-8">No data available</div>
            )}

            {data && renderTab()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeepInspector;
