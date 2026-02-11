import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenSquare,
  Clock,
  Plug,
  Inbox,
  ChevronDown,
  ChevronRight,
  Folder,
  MessageSquare,
  Settings,
  Search,
  Plus,
  Loader2,
  Check,
  Globe,
  Link as LinkIcon,
  Github,
  Gitlab,
  Cloud,
  ListTodo,
  LayoutTemplate,
  Download,
  Trash2,
  Bot,
  Users
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHiveStore } from '../../store/useHiveStore';
import { SystemService } from '../../services/SystemService';
import { API_BASE } from '../../services/api';

/** Format a timestamp (ISO string, ms epoch, or thread ID like "thread-1738...") into a relative label */
const formatRelativeTime = (value: string | number | undefined): string => {
  if (!value) return '';
  let ts: number;
  if (typeof value === 'number') {
    ts = value;
  } else if (/^\d+$/.test(value)) {
    ts = parseInt(value, 10);
  } else if (value.startsWith('thread-')) {
    ts = parseInt(value.replace('thread-', ''), 10);
  } else {
    ts = new Date(value).getTime();
  }
  if (isNaN(ts) || ts <= 0) return '';
  const diff = Date.now() - ts;
  if (diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
};

/** Derive a display name for a thread: use title unless generic, then fall back to first user message */
const getThreadDisplayName = (thread: any): string => {
  const title = thread.title || '';
  const isGeneric = !title || /^new\s*thread$/i.test(title.trim());
  if (!isGeneric) return title;
  const firstUserMsg = thread.messages?.find((m: any) => m.role === 'user');
  if (firstUserMsg?.content) {
    const text = typeof firstUserMsg.content === 'string' ? firstUserMsg.content : '';
    if (text) return text.length > 40 ? text.slice(0, 40) + '...' : text;
  }
  return title || 'New Thread';
};

interface SidebarProps {
  activeView: 'build' | 'automations' | 'skills' | 'triage';
  onViewChange: (view: 'build' | 'automations' | 'skills' | 'triage') => void;
  onOpenSettings?: () => void;
  onSearchClick?: () => void;
  selectedProjectId?: string | null;
  onProjectSelect?: (id: string) => void;
  onAddProject?: () => void;
}

const ProjectPicker = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onAddProject,
  onNewThread
}: {
  projects: any[],
  selectedProjectId: string | null,
  onProjectSelect: (id: string) => void,
  onAddProject: () => void,
  onNewThread: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="relative px-2 mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-zinc-200 shadow-sm text-[11px] font-black uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-50"
      >
        <span className="text-blue-500">
          <Folder size={16} />
        </span>
        <span className="flex-1 text-left truncate">{selectedProject?.name || 'Select Project'}</span>
        <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 mx-2 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden z-20 p-1"
            >
              <div className="max-h-60 overflow-y-auto">
                <button
                  onClick={() => { onNewThread(); setIsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-all uppercase tracking-widest mb-1"
                >
                  <PenSquare size={14} />
                  <span>New Thread</span>
                </button>
                <div className="h-px bg-zinc-100 my-1 mx-2" />
                <div className="px-3 py-1 text-[8px] font-black text-zinc-400 uppercase tracking-widest">Projects</div>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onProjectSelect(p.id); setIsOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${p.id === selectedProjectId
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                  >
                    <Folder size={12} className={p.id === selectedProjectId ? 'text-blue-400' : 'text-zinc-400'} />
                    <span className="truncate uppercase tracking-wider">{p.name}</span>
                  </button>
                ))}
                <div className="h-px bg-zinc-100 my-1 mx-2" />
                <button
                  onClick={() => { onAddProject?.(); setIsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-zinc-500 hover:bg-zinc-50 transition-all uppercase tracking-widest"
                >
                  <Plus size={14} />
                  <span>Add Project</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

interface RemoteRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  language: string | null;
}

type ForgeType = 'github' | 'gitlab';

const forgeConfig: Record<ForgeType, { label: string; icon: typeof Github; endpoint: string }> = {
  github: { label: 'GitHub', icon: Github, endpoint: `${API_BASE}/api/github/repos` },
  gitlab: { label: 'GitLab', icon: Gitlab, endpoint: `${API_BASE}/api/gitlab/repos` },
};

const RemotesSection = ({
  expandedFolders,
  setExpandedFolders,
  isCloning,
  onClone,
  forges,
}: {
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isCloning: string | null;
  onClone: (repo: any) => void;
  forges: any[];
}) => {
  const [repos, setRepos] = useState<Record<ForgeType, RemoteRepo[]>>({ github: [], gitlab: [] });
  const [loading, setLoading] = useState<Record<ForgeType, boolean>>({ github: false, gitlab: false });
  const [fetched, setFetched] = useState<Record<ForgeType, boolean>>({ github: false, gitlab: false });

  const toggleForge = async (forge: ForgeType) => {
    const isExpanding = !expandedFolders[forge];
    setExpandedFolders(prev => ({ ...prev, [forge]: isExpanding }));

    if (isExpanding && !fetched[forge]) {
      setLoading(prev => ({ ...prev, [forge]: true }));
      try {
        const forgeData = forges.find(f => f.id === forge);
        const headers: Record<string, string> = {};
        if (forgeData?.accessToken) {
          headers['Authorization'] = `Bearer ${forgeData.accessToken}`;
        }

        const res = await fetch(forgeConfig[forge].endpoint, { headers });
        if (res.ok) {
          const data = await res.json();
          const repoList = Array.isArray(data) ? data : data.repos ?? data.data ?? [];
          setRepos(prev => ({ ...prev, [forge]: repoList }));
        }
      } catch {
        // network error – leave list empty
      } finally {
        setFetched(prev => ({ ...prev, [forge]: true }));
        setLoading(prev => ({ ...prev, [forge]: false }));
      }
    }
  };

  const handleClone = async (forge: ForgeType, repo: RemoteRepo) => {
    try {
      await fetch(`${API_BASE}/api/git/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clone_url: repo.clone_url || repo.html_url }),
      });
      onClone(repo);
    } catch {
      // silently handle
    }
  };

  return (
    <div className="px-5 mb-4">
      <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Remotes</div>
      <div className="space-y-1">
        {(Object.keys(forgeConfig) as ForgeType[]).map(forge => {
          const cfg = forgeConfig[forge];
          const Icon = cfg.icon;
          const isExpanded = !!expandedFolders[forge];
          const repoList = repos[forge];
          const isLoading = loading[forge];

          return (
            <div key={forge}>
              <div
                onClick={() => toggleForge(forge)}
                className="flex items-center justify-between text-[11px] font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer p-1.5 rounded-lg hover:bg-zinc-100 transition-all"
              >
                <div className="flex items-center gap-2">
                  {isExpanded
                    ? <ChevronDown size={12} className="text-zinc-400" />
                    : <ChevronRight size={12} className="text-zinc-400" />}
                  <Icon size={14} className="text-zinc-400" />
                  <span>{cfg.label}</span>
                </div>
                {!isExpanded && (
                  <span className="text-[9px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">
                    {fetched[forge] ? repoList.length : '...'}
                  </span>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={14} className="animate-spin text-zinc-400" />
                        <span className="ml-2 text-[10px] text-zinc-400 font-bold">Loading repos...</span>
                      </div>
                    ) : repoList.length === 0 ? (
                      <div className="py-3 px-2 text-center">
                        <p className="text-[10px] font-bold text-zinc-400">No repositories found</p>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
                        {repoList.map(repo => (
                          <div
                            key={repo.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-zinc-100 transition-all group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-zinc-700 truncate">{repo.name}</div>
                              {repo.language && (
                                <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{repo.language}</div>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleClone(forge, repo); }}
                              disabled={isCloning === repo.full_name}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-600 text-[9px] font-bold transition-all disabled:opacity-50"
                            >
                              {isCloning === repo.full_name
                                ? <Loader2 size={10} className="animate-spin" />
                                : <Download size={10} />}
                              <span>Clone</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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

const Sidebar = ({ activeView, onViewChange, onOpenSettings, onSearchClick, selectedProjectId, onProjectSelect, onAddProject }: SidebarProps) => {
  const { projects, addProject, activeThreadId, setActiveThread, addThread, selectedProjectId: storeSelectedProjectId, unreadThreads, resetSwarm } = useHiveStore();
  const { forges, user } = useAuthStore();
  const connectedForges = forges.filter(f => f.connected);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isCloning, setIsCloning] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const handleImportRepo = async (repo: any) => {
    setIsCloning(repo.full_name);
    const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;

    if (isElectron) {
      try {
        const result = await SystemService.dialog.showOpen({
          properties: ['openDirectory'],
          title: 'Select Destination Folder'
        });
        if (result.canceled || result.filePaths.length === 0) return;
        const targetDir = `${result.filePaths[0]}/${repo.name}`;
        await SystemService.fs.clone(repo.html_url, targetDir);
        const res = await fetch(`${API_BASE}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: repo.name, path: targetDir, type: 'local' })
        });
        if (res.ok) {
          const saved = await res.json();
          addProject(saved);
          onProjectSelect?.(saved.id);
        }
      } finally { setIsCloning(null); }
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/projects/import-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: repo.html_url, projectName: repo.name, accessToken: connectedForges[0]?.accessToken })
        });
        if (res.ok) {
          const saved = await res.json();
          addProject(saved);
          onProjectSelect?.(saved.id);
        }
      } finally { setIsCloning(null); }
    }
  };

  return (
    <div className="w-72 bg-zinc-50/80 backdrop-blur-xl h-full flex flex-col border-r border-zinc-200 shadow-xl">
      <div className="h-4 flex-shrink-0"></div>
      <div className="px-3 mb-2 flex-shrink-0">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-all border border-zinc-200 shadow-sm"
        >
          <Search size={14} strokeWidth={2} />
          <span className="text-xs font-bold text-left flex-1 uppercase tracking-widest">Search</span>
          <span className="text-[10px] text-zinc-600 font-mono hidden sm:block font-black opacity-50">⌘K</span>
        </button>
      </div>

      <div className="px-2 space-y-0.5 mb-2">
        <ProjectPicker
          projects={projects}
          selectedProjectId={selectedProjectId || null}
          onProjectSelect={(id) => onProjectSelect?.(id)}
          onAddProject={() => onAddProject?.()}
          onNewThread={async () => {
            const pid = selectedProjectId || storeSelectedProjectId;
            if (!pid) return;
            const threadId = `thread-${Date.now()}`;
            await addThread(pid, { id: threadId, title: 'New Thread', messages: [] });
            onViewChange('build');
          }}
        />
        <NavItem
          icon={<Clock size={16} />}
          label="Automations"
          active={activeView === 'automations'}
          onClick={() => onViewChange('automations')}
        />
        <NavItem
          icon={<Inbox size={16} />}
          label="Triage"
          active={activeView === 'triage'}
          onClick={() => onViewChange('triage')}
        />
        <NavItem
          icon={<Plug size={16} />}
          label="Skills"
          active={activeView === 'skills'}
          onClick={() => onViewChange('skills')}
        />
      </div>

      <div className="mx-3 h-px bg-zinc-200 mb-3"></div>

      <div className="flex-1 overflow-y-auto px-2 scrollbar-none flex flex-col gap-4">
        {/* Threads Section */}
        <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Threads</div>
            </div>

            {activeProject && (
              <div className="space-y-0.5">
                {/* Persistent Project Status / Plan Item */}
                <div
                  onClick={() => { setActiveThread(null); onViewChange('build'); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${!activeThreadId && activeView === 'build'
                    ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                    }`}
                >
                  <LayoutTemplate size={14} className={!activeThreadId && activeView === 'build' ? 'text-blue-500' : 'text-zinc-400'} />
                  <span className="text-[11px] font-bold truncate tracking-tight uppercase tracking-widest">Project Status</span>
                </div>

                {activeProject.threads?.length > 0 ? (() => {
                    // Separate solo threads from swarm threads
                    // A "swarm" = an architect thread + worker threads that reference it via swarmId
                    const soloThreads: any[] = [];
                    const architectThreads: any[] = [];
                    const workersBySwarm: Record<string, any[]> = {};

                    activeProject.threads.forEach((t: any) => {
                      if (t.isWorker || t.id.startsWith('worker-')) {
                        // Worker thread: group by swarmId (architect threadId) or parentTaskId fallback
                        const groupId = t.swarmId || t.parentTaskId || 'default-swarm';
                        if (!workersBySwarm[groupId]) workersBySwarm[groupId] = [];
                        workersBySwarm[groupId].push(t);
                      } else if (t.id.startsWith('architect-') || t.title?.includes('Architect')) {
                        architectThreads.push(t);
                      } else {
                        soloThreads.push(t);
                      }
                    });

                    // Build swarm groups: each architect thread + its workers
                    const swarmGroups: { architect: any; workers: any[]; swarmLabel: string }[] = [];

                    for (const arch of architectThreads) {
                      const workers = workersBySwarm[arch.id] || [];
                      // Also collect workers that used parentTaskId-based grouping (legacy)
                      delete workersBySwarm[arch.id];
                      
                      // Derive swarm label from first user message
                      const firstUserMsg = arch.messages?.find((m: any) => m.role === 'user');
                      let swarmLabel = 'Setup';
                      if (firstUserMsg?.content) {
                        const text = typeof firstUserMsg.content === 'string' ? firstUserMsg.content : '';
                        const cleaned = text.replace(/^@qb\s*/i, '').trim();
                        if (cleaned) swarmLabel = cleaned.length > 30 ? cleaned.slice(0, 30) + '\u2026' : cleaned;
                      }

                      swarmGroups.push({ architect: arch, workers, swarmLabel });
                    }

                    // Orphan workers (no matching architect) — group under a generic swarm
                    const orphanWorkers = Object.values(workersBySwarm).flat();
                    if (orphanWorkers.length > 0) {
                      // Try to find a label from the orphan workers
                      let label = 'Setup';
                      for (const w of orphanWorkers) {
                        const parentThread = activeProject.threads?.find((t: any) => t.id === w.parentTaskId);
                        if (parentThread) {
                          const msg = parentThread.messages?.find((m: any) => m.role === 'user');
                          if (msg?.content) {
                            const text = typeof msg.content === 'string' ? msg.content : '';
                            const cleaned = text.replace(/^@qb\s*/i, '').trim();
                            if (cleaned) { label = cleaned.length > 30 ? cleaned.slice(0, 30) + '\u2026' : cleaned; break; }
                          }
                        }
                      }
                      swarmGroups.push({ architect: null, workers: orphanWorkers, swarmLabel: label });
                    }

                    return (
                      <div className="space-y-4">
                        {/* Swarm Groups */}
                        {swarmGroups.map((group, gi) => (
                          <div key={group.architect?.id || `orphan-${gi}`} className="space-y-0.5">
                              <div className="px-3 py-1.5 flex items-center gap-2">
                                <div className="w-1.5 h-3 bg-amber-400 rounded-full" />
                                <span className="flex-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Swarm: {group.swarmLabel}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Reset this swarm? All worker threads will be deleted.')) {
                                      const pid = selectedProjectId || storeSelectedProjectId;
                                      if (pid) resetSwarm(pid);
                                    }
                                  }}
                                  className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                  title="Reset Swarm"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            
                            {/* Roundtable for this swarm */}
                            <div
                              onClick={() => { setActiveThread(`roundtable-${group.architect?.id || 'default'}`); onViewChange('build'); }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${activeThreadId === `roundtable-${group.architect?.id || 'default'}`
                                ? 'bg-amber-50 text-amber-900 border border-amber-100 shadow-sm'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                                }`}
                            >
                              <Users size={14} className={activeThreadId === `roundtable-${group.architect?.id || 'default'}` ? 'text-amber-600' : 'text-zinc-400'} />
                              <span className="text-[11px] font-bold truncate uppercase tracking-tight">Roundtable</span>
                            </div>

                            {/* Architect thread */}
                            {group.architect && (() => {
                              const thread = group.architect;
                              const displayName = getThreadDisplayName(thread);
                              const isThreadActive = (activeThreadId === thread.id && useHiveStore.getState().queenStatus !== 'idle') || 
                                                    thread.messages?.some((m: any) => m.role === 'assistant' && !m.content && (!m.toolCalls || m.toolCalls.length === 0));
                              const isUnread = unreadThreads.has(thread.id) && activeThreadId !== thread.id;

                              return (
                                <div
                                  key={thread.id}
                                  onClick={() => { setActiveThread(thread.id); onViewChange('build'); }}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all group/thread ml-2 border-l border-zinc-100 ${activeThreadId === thread.id
                                    ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                                    }`}
                                >
                                  {isThreadActive ? (
                                    <Loader2 size={14} className="flex-shrink-0 text-blue-500 animate-spin" />
                                  ) : (
                                    <Bot size={14} className={`flex-shrink-0 ${activeThreadId === thread.id ? 'text-blue-400' : 'text-zinc-400'}`} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[11px] font-bold truncate tracking-tight block ${isUnread ? 'text-zinc-900' : ''}`}>{displayName}</span>
                                      {isUnread && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Worker threads nested under the architect */}
                            {group.workers.map((thread: any) => {
                              const displayName = getThreadDisplayName(thread);
                              const isThreadActive = (activeThreadId === thread.id && useHiveStore.getState().queenStatus !== 'idle') || 
                                                    thread.messages?.some((m: any) => m.role === 'assistant' && !m.content && (!m.toolCalls || m.toolCalls.length === 0));
                              const isUnread = unreadThreads.has(thread.id) && activeThreadId !== thread.id;

                              return (
                                <div
                                  key={thread.id}
                                  onClick={() => { setActiveThread(thread.id); onViewChange('build'); }}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all group/thread ml-4 border-l border-zinc-100 ${activeThreadId === thread.id
                                    ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                                    }`}
                                >
                                  {isThreadActive ? (
                                    <Loader2 size={14} className="flex-shrink-0 text-blue-500 animate-spin" />
                                  ) : (
                                    <Bot size={14} className={`flex-shrink-0 ${activeThreadId === thread.id ? 'text-blue-400' : 'text-zinc-400'}`} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[11px] font-bold truncate tracking-tight block ${isUnread ? 'text-zinc-900' : ''}`}>{displayName}</span>
                                      {isUnread && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}

                      {/* Solo Threads */}
                      {soloThreads.length > 0 && (
                        <div className="space-y-0.5">
                          {soloThreads.map((thread: any) => {
                            const displayName = getThreadDisplayName(thread);
                            const relTime = formatRelativeTime(thread.time || thread.id);
                            const diffMatch = thread.diff ? thread.diff.match(/(\+\d+)\s+(-\d+)/) : null;
                            const isThreadActive = (activeThreadId === thread.id && useHiveStore.getState().queenStatus !== 'idle') || 
                                                  thread.messages?.some((m: any) => m.role === 'assistant' && !m.content && (!m.toolCalls || m.toolCalls.length === 0));
                            const isUnread = unreadThreads.has(thread.id) && activeThreadId !== thread.id;

                            return (
                              <div
                                key={thread.id}
                                onClick={() => { setActiveThread(thread.id); onViewChange('build'); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all group/thread ${activeThreadId === thread.id
                                  ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                                  }`}
                              >
                                {isThreadActive ? (
                                  <Loader2 size={14} className="flex-shrink-0 text-blue-500 animate-spin" />
                                ) : (
                                  <MessageSquare size={14} className={`flex-shrink-0 ${activeThreadId === thread.id ? 'text-blue-400' : 'text-zinc-400'}`} />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-bold truncate tracking-tight block ${isUnread ? 'text-zinc-900' : ''}`}>{displayName}</span>
                                    {isUnread && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200 flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {diffMatch && (
                                      <span className="text-xs">
                                        <span className="text-emerald-500 font-bold">{diffMatch[1]}</span>
                                        {' '}
                                        <span className="text-red-400 font-bold">{diffMatch[2]}</span>
                                      </span>
                                    )}
                                    {relTime && (
                                      <span className="text-xs text-zinc-400">{relTime}</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    useHiveStore.getState().deleteThread(activeProject.id, thread.id);
                                  }}
                                  className="opacity-0 group-hover/thread:opacity-100 p-1.5 hover:bg-rose-50 hover:text-rose-500 text-zinc-400 rounded-lg transition-all"
                                  title="Delete Thread"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })() : null}
              </div>
            )}
            
            {!activeProject && (
              <div className="px-3 py-8 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select a project to see threads</p>
              </div>
            )}
        </div>

      </div>

      <div className="mx-3 h-px bg-zinc-200 mb-4 mt-2"></div>

      <RemotesSection
        expandedFolders={expandedFolders}
        setExpandedFolders={setExpandedFolders}
        isCloning={isCloning}
        onClone={handleImportRepo}
        forges={forges}
      />

      <div className="p-3 border-t border-zinc-200 bg-white">
        <div 
          onClick={onOpenSettings}
          className="flex items-center gap-3 p-2 rounded-2xl hover:bg-zinc-50 transition-all cursor-pointer group border border-transparent hover:border-zinc-100"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 text-[10px] font-black shadow-sm border border-zinc-200 group-hover:bg-white transition-colors">
              {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'ND'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
              <Cloud size={8} className="text-blue-500" fill="currentColor" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black text-zinc-900 truncate uppercase tracking-widest group-hover:text-blue-600 transition-colors">{user?.name || 'Natao Dutton'}</div>
            <div className="flex items-center gap-1.5">
              <div className="text-[9px] text-blue-600 font-bold uppercase tracking-widest">Pro Plan</div>
              <div className="w-1 h-1 rounded-full bg-zinc-300"></div>
              <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Synced</div>
            </div>
          </div>
          <Settings size={14} className="text-zinc-400 group-hover:text-zinc-600 transition-all" />
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${active
      ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
      }`}
  >
    <span className={active ? 'text-blue-400' : 'text-zinc-600'}>{icon}</span>
    <span>{label}</span>
  </button>
);

export default Sidebar;