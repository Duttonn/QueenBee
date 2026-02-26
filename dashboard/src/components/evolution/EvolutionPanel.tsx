import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, TrendingUp, Zap, AlertTriangle, ChevronDown, ChevronRight, X, RefreshCw, Activity } from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';
import { API_BASE } from '../../services/api';

const API = `${API_BASE}/api`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchiveEntry {
  id: string;
  agentId: string;
  sessionId: string;
  timestamp: number;
  toolHistory: { tool: string; outcome: string; durationMs: number }[];
  successRate: number;
  performanceScore: number;
  noveltyScore: number;
  combinedScore: number;
  codePatches: string[];
}

interface EvolutionDirectives {
  workflowDirectives: string[];
  toolPreferences: string[];
  promptPatches: string[];
  avoidPatterns: string[];
  generatedAt: number;
  sourceAgentIds: string[];
}

interface EvolvedConfig {
  systemPromptAppend: string;
  toolOrderHints: string[];
  avoidPatterns: string[];
  workflowOperator?: string;
  lastEvolvedAt: number;
  version: number;
}

interface MCTSState {
  operators: Record<string, { visits: number; totalScore: number; avgScore: number }>;
  totalVisits: number;
  bestOperator: string;
  lastUpdated: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScoreBadge = ({ value, label }: { value: number; label: string }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'text-emerald-600 bg-emerald-50' : pct >= 40 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return (
    <div className="flex flex-col items-center">
      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${color}`}>{pct}%</span>
      <span className="text-[10px] text-zinc-400 mt-0.5">{label}</span>
    </div>
  );
};

const Section = ({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-100 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-zinc-700 text-xs font-semibold">
          {icon}
          {title}
        </div>
        {open ? <ChevronDown size={12} className="text-zinc-400" /> : <ChevronRight size={12} className="text-zinc-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface EvolutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const EvolutionPanel: React.FC<EvolutionPanelProps> = ({ isOpen, onClose }) => {
  const { socket, projects, selectedProjectId } = useHiveStore();
  const activeProject = projects.find(p => p.id === selectedProjectId);

  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [directives, setDirectives] = useState<EvolutionDirectives | null>(null);
  const [evolvedConfig, setEvolvedConfig] = useState<EvolvedConfig | null>(null);
  const [mctsState, setMctsState] = useState<MCTSState | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveScore, setLiveScore] = useState<{ perf: number; novelty: number; combined: number } | null>(null);

  const projectPath = activeProject?.path;

  const fetchAll = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const [archRes, dirsRes, cfgRes, mctsRes] = await Promise.allSettled([
        fetch(`${API}/experience-archive?projectPath=${encodeURIComponent(projectPath)}&limit=20`),
        fetch(`${projectPath}/.queenbee/evolution-directives.json`.startsWith('http') ? '#' : `${API}/experience-archive?projectPath=${encodeURIComponent(projectPath)}&limit=1`),
        fetch(`${API}/experience-archive?projectPath=${encodeURIComponent(projectPath)}&limit=1`),
        fetch(`${API}/experience-archive?projectPath=${encodeURIComponent(projectPath)}&limit=1`),
      ]);

      if (archRes.status === 'fulfilled' && archRes.value.ok) {
        setArchive(await archRes.value.json());
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }

    // Fetch directives and evolved-config via dedicated endpoints
    try {
      const dirsRes = await fetch(`${API}/evolution-config?projectPath=${encodeURIComponent(projectPath)}&type=directives`);
      if (dirsRes.ok) setDirectives(await dirsRes.json());
    } catch { /* no directives yet */ }

    try {
      const cfgRes = await fetch(`${API}/evolution-config?projectPath=${encodeURIComponent(projectPath)}&type=config`);
      if (cfgRes.ok) setEvolvedConfig(await cfgRes.json());
    } catch { /* no evolved config yet */ }

    try {
      const mctsRes = await fetch(`${API}/evolution-config?projectPath=${encodeURIComponent(projectPath)}&type=mcts`);
      if (mctsRes.ok) setMctsState(await mctsRes.json());
    } catch { /* no mcts yet */ }
  }, [projectPath]);

  useEffect(() => {
    if (isOpen) fetchAll();
  }, [isOpen, fetchAll]);

  // Live score updates from GEA-02
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      if (!projectPath || data.projectPath !== projectPath) return;
      setLiveScore({ perf: data.performance, novelty: data.novelty, combined: data.combined });
      // Refresh archive after a short delay
      setTimeout(fetchAll, 500);
    };
    socket.on('EXPERIENCE_SCORED', handler);
    return () => { socket.off('EXPERIENCE_SCORED', handler); };
  }, [socket, projectPath, fetchAll]);

  const operatorColor = (op: string) => {
    if (op === 'ensemble') return 'text-purple-700 bg-purple-50 border-purple-200';
    if (op === 'review_revise') return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-zinc-700 bg-zinc-50 border-zinc-200';
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
          <div className="px-4 py-3 border-b border-zinc-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <Dna size={14} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-800">Evolution</div>
                <div className="text-[10px] text-zinc-500">GEA — Group-Evolving Agents</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchAll} className="p-1.5 rounded hover:bg-white/60 transition-colors" title="Refresh">
                <RefreshCw size={13} className={`text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-white/60 transition-colors">
                <X size={14} className="text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Live score flash */}
          <AnimatePresence>
            {liveScore && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-3 mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-emerald-600" />
                  <span className="text-xs text-emerald-700 font-medium">Session scored</span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreBadge value={liveScore.perf} label="perf" />
                  <ScoreBadge value={liveScore.novelty} label="novelty" />
                  <ScoreBadge value={liveScore.combined} label="combined" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-3">
            {!projectPath && (
              <div className="text-center text-zinc-400 text-sm mt-8">Select a project to view evolution data.</div>
            )}

            {projectPath && (
              <>
                {/* MCTS / Active Operator */}
                {mctsState && (
                  <Section title="Active Workflow Operator" icon={<Zap size={12} />}>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold mb-3 ${operatorColor(mctsState.bestOperator)}`}>
                      <TrendingUp size={11} />
                      {mctsState.bestOperator.replace('_', '-')}
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(mctsState.operators).map(([op, stats]) => (
                        <div key={op} className="flex items-center gap-2 text-xs">
                          <span className="w-28 text-zinc-600 font-mono">{op}</span>
                          <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-violet-400 rounded-full transition-all"
                              style={{ width: `${Math.round(stats.avgScore * 100)}%` }}
                            />
                          </div>
                          <span className="text-zinc-400 w-8 text-right">{Math.round(stats.avgScore * 100)}%</span>
                          <span className="text-zinc-300 w-10 text-right">{stats.visits}v</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Evolved Config */}
                {evolvedConfig && (
                  <Section title={`Evolved Config v${evolvedConfig.version}`} icon={<TrendingUp size={12} />}>
                    {evolvedConfig.systemPromptAppend && (
                      <div className="mb-2">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Prompt Patches</div>
                        <pre className="text-[10px] bg-zinc-50 rounded p-2 text-zinc-600 whitespace-pre-wrap leading-relaxed border border-zinc-100 max-h-32 overflow-y-auto">
                          {evolvedConfig.systemPromptAppend.slice(0, 400)}{evolvedConfig.systemPromptAppend.length > 400 ? '…' : ''}
                        </pre>
                      </div>
                    )}
                    {evolvedConfig.toolOrderHints?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Tool Hints</div>
                        {evolvedConfig.toolOrderHints.map((h, i) => (
                          <div key={i} className="text-xs text-zinc-600 flex items-start gap-1.5 mb-1">
                            <span className="text-violet-400 mt-0.5">›</span>{h}
                          </div>
                        ))}
                      </div>
                    )}
                    {evolvedConfig.avoidPatterns?.length > 0 && (
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Avoid Patterns</div>
                        {evolvedConfig.avoidPatterns.map((p, i) => (
                          <div key={i} className="text-xs text-red-600 flex items-start gap-1.5 mb-1">
                            <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />{p}
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                )}

                {/* Evolution Directives */}
                {directives && (
                  <Section title="Latest Directives" icon={<Dna size={12} />} defaultOpen={false}>
                    {directives.workflowDirectives?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Workflow</div>
                        {directives.workflowDirectives.map((d, i) => (
                          <div key={i} className="text-xs text-zinc-600 flex items-start gap-1.5 mb-1">
                            <span className="text-violet-400 mt-0.5">›</span>{d}
                          </div>
                        ))}
                      </div>
                    )}
                    {directives.avoidPatterns?.length > 0 && (
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Avoid</div>
                        {directives.avoidPatterns.map((p, i) => (
                          <div key={i} className="text-xs text-red-500 flex items-start gap-1.5 mb-1">
                            <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />{p}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-[10px] text-zinc-300 mt-2">
                      Generated {new Date(directives.generatedAt).toLocaleString()} from {directives.sourceAgentIds?.length ?? 0} agents
                    </div>
                  </Section>
                )}

                {/* Agent Archive */}
                <Section title={`Agent Archive (${archive.length})`} icon={<Activity size={12} />} defaultOpen={false}>
                  {archive.length === 0 && (
                    <div className="text-xs text-zinc-400 text-center py-2">No sessions archived yet. Sessions are scored automatically when they complete.</div>
                  )}
                  <div className="space-y-2">
                    {archive.map(entry => (
                      <div key={entry.id} className="border border-zinc-100 rounded-lg p-2.5 hover:border-violet-200 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">{entry.sessionId}</span>
                          <div className="flex items-center gap-2">
                            <ScoreBadge value={entry.performanceScore} label="P" />
                            <ScoreBadge value={entry.noveltyScore} label="N" />
                            <ScoreBadge value={entry.combinedScore} label="C" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          <span>{entry.toolHistory?.length ?? 0} tool calls</span>
                          <span>·</span>
                          <span>{entry.codePatches?.length ?? 0} files</span>
                          <span>·</span>
                          <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                {(archive.length === 0 && !directives && !evolvedConfig) && (
                  <div className="text-center py-8 text-zinc-400">
                    <Dna size={32} className="mx-auto mb-3 opacity-30" />
                    <div className="text-sm font-medium mb-1">No evolution data yet</div>
                    <div className="text-xs">Run agents on this project to start building the experience archive. Evolution directives are generated automatically every heartbeat cycle.</div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EvolutionPanel;
