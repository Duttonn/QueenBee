import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, X, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';
import { API_BASE } from '../../services/api';

const API = `${API_BASE}/api`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchiveSummary {
  totalSessions: number;
  firstWeekAvg: number;
  latestWeekAvg: number;
  improvementPct: number;
  currentDirectives: string[];
  currentAvoidPatterns: string[];
}

interface WeeklyDataPoint {
  week: string;
  avgCombinedScore: number;
  avgPerformanceScore: number;
  successRate: number;
  sessionCount: number;
  topTools: string[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) => (
  <div className="flex flex-col items-center px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex-1">
    <span className={`text-lg font-black tabular-nums leading-none ${highlight ? 'text-emerald-600' : 'text-zinc-900'}`}>
      {value}
    </span>
    <span className="text-[9px] text-zinc-400 uppercase tracking-widest mt-1 text-center leading-tight">{label}</span>
  </div>
);

const Sparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-10 text-[10px] text-zinc-300">
        Not enough data
      </div>
    );
  }

  const W = 280;
  const H = 40;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const pointsStr = pts.join(' ');

  // Fill area under sparkline
  const fillPoints = [
    `${pad},${H - pad}`,
    ...pts,
    `${W - pad},${H - pad}`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <polygon points={fillPoints} fill="rgba(139,92,246,0.08)" />
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1].split(',');
        return (
          <circle
            cx={parseFloat(last[0])}
            cy={parseFloat(last[1])}
            r="3"
            fill="#8b5cf6"
          />
        );
      })()}
    </svg>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface LearningVelocityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LearningVelocityPanel: React.FC<LearningVelocityPanelProps> = ({ isOpen, onClose }) => {
  const { projects, selectedProjectId } = useHiveStore();
  const activeProject = projects.find(p => p.id === selectedProjectId);
  const projectPath = activeProject?.path;

  const [summary, setSummary] = useState<ArchiveSummary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, weeklyRes] = await Promise.allSettled([
        fetch(`${API}/experience-archive?summary=true&projectPath=${encodeURIComponent(projectPath)}`),
        fetch(`${API}/experience-archive?aggregate=weekly&projectPath=${encodeURIComponent(projectPath)}`),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        setSummary(await summaryRes.value.json());
      }
      if (weeklyRes.status === 'fulfilled' && weeklyRes.value.ok) {
        setWeekly(await weeklyRes.value.json());
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (isOpen) fetchAll();
  }, [isOpen, fetchAll]);

  const sparklineData = weekly.map(w => w.avgCombinedScore);

  const avgTools =
    weekly.length > 0
      ? Math.round(weekly.reduce((acc, w) => acc + w.sessionCount, 0) / weekly.length)
      : 0;

  const latestSuccessRate =
    weekly.length > 0 ? Math.round((weekly[weekly.length - 1]?.successRate ?? 0) * 100) : null;

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
          <div className="px-4 py-3 border-b border-zinc-100 bg-gradient-to-r from-violet-50 to-emerald-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <TrendingUp size={14} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-800">Learning Velocity</div>
                <div className="text-[10px] text-zinc-500">GEA improvement over time</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAll}
                className="p-1.5 rounded hover:bg-white/60 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} className={`text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-white/60 transition-colors">
                <X size={14} className="text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!projectPath && (
              <div className="text-center text-zinc-400 text-sm mt-8">
                Select a project to view learning velocity.
              </div>
            )}

            {error && (
              <div className="text-center text-red-500 text-xs mt-8">
                {error}
              </div>
            )}

            {projectPath && !error && (
              <>
                {/* Stats Row */}
                <div className="flex gap-2 mb-4">
                  <StatCard
                    value={summary ? `+${Math.round(summary.improvementPct)}%` : '--'}
                    label="Improvement"
                    highlight
                  />
                  <StatCard
                    value={latestSuccessRate !== null ? `${latestSuccessRate}%` : '--'}
                    label="Success Rate"
                  />
                  <StatCard
                    value={summary ? String(summary.totalSessions) : '--'}
                    label="Sessions"
                  />
                  <StatCard
                    value={avgTools > 0 ? String(avgTools) : '--'}
                    label="Avg Tools"
                  />
                </div>

                {/* Sparkline */}
                <div className="border border-zinc-100 rounded-xl p-3 mb-4 bg-zinc-50/50">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Weekly Performance Trend
                  </div>
                  {loading && sparklineData.length === 0 ? (
                    <div className="h-10 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <Sparkline data={sparklineData} />
                  )}
                  {weekly.length > 0 && (
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-zinc-300">{weekly[0]?.week}</span>
                      <span className="text-[9px] text-zinc-300">{weekly[weekly.length - 1]?.week}</span>
                    </div>
                  )}
                </div>

                {/* What I learned */}
                {summary && summary.currentDirectives && summary.currentDirectives.length > 0 && (
                  <div className="border border-emerald-100 rounded-xl p-3 mb-3 bg-emerald-50/30">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                        What I learned
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {summary.currentDirectives.slice(0, 5).map((d, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">→</span>
                          <span className="leading-snug">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* What I avoid */}
                {summary && summary.currentAvoidPatterns && summary.currentAvoidPatterns.length > 0 && (
                  <div className="border border-red-100 rounded-xl p-3 mb-3 bg-red-50/30">
                    <div className="flex items-center gap-1.5 mb-2">
                      <XCircle size={12} className="text-red-500" />
                      <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">
                        What I avoid
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {summary.currentAvoidPatterns.slice(0, 5).map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                          <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                          <span className="leading-snug">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly breakdown */}
                {weekly.length > 0 && (
                  <div className="border border-zinc-100 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Weekly Breakdown
                      </span>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {weekly.slice().reverse().slice(0, 6).map((w, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2">
                          <span className="text-[10px] text-zinc-400 w-16 flex-shrink-0 font-mono">{w.week}</span>
                          <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-violet-400 rounded-full transition-all"
                              style={{ width: `${Math.round(w.avgCombinedScore * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500 w-8 text-right tabular-nums">
                            {Math.round(w.avgCombinedScore * 100)}%
                          </span>
                          <span className="text-[9px] text-zinc-300 w-10 text-right tabular-nums">
                            {w.sessionCount}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!loading && !summary && weekly.length === 0 && (
                  <div className="text-center py-10 text-zinc-400">
                    <TrendingUp size={28} className="mx-auto mb-3 opacity-30" />
                    <div className="text-sm font-medium mb-1">No velocity data yet</div>
                    <div className="text-xs leading-relaxed max-w-xs mx-auto">
                      Complete agent sessions on this project to start tracking improvement over time.
                    </div>
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

export default LearningVelocityPanel;
