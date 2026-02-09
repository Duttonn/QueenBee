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
  LayoutTemplate
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHiveStore } from '../../store/useHiveStore';
import { SystemService } from '../../services/SystemService';
import { API_BASE } from '../../services/api';

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

const Sidebar = ({ activeView, onViewChange, onOpenSettings, onSearchClick, selectedProjectId, onProjectSelect, onAddProject }: SidebarProps) => {
  const { projects, addProject, activeThreadId, setActiveThread } = useHiveStore();
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
          body: JSON.stringify({ repoUrl: repo.html_url, projectName: repo.name, accessToken: gitForge?.accessToken })
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
          onNewThread={() => { setActiveThread(null); onViewChange('build'); }}
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

                {activeProject.threads?.length > 0 ? (
                  activeProject.threads.map((thread: any) => (
                    <div
                      key={thread.id}
                      onClick={() => { setActiveThread(thread.id); onViewChange('build'); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${activeThreadId === thread.id
                        ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                        }`}
                    >
                      <MessageSquare size={14} className={activeThreadId === thread.id ? 'text-blue-400' : 'text-zinc-400'} />
                      <span className="text-[11px] font-bold truncate tracking-tight">{thread.title}</span>
                    </div>
                  ))
                ) : null}
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

      <div className="px-5 mb-4">
        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Remotes</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer p-1.5 rounded-lg hover:bg-zinc-100 transition-all">
            <div className="flex items-center gap-2">
              <Github size={14} className="text-zinc-400" />
              <span>GitHub</span>
            </div>
            <span className="text-[9px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">12</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer p-1.5 rounded-lg hover:bg-zinc-100 transition-all">
            <div className="flex items-center gap-2">
              <Gitlab size={14} className="text-zinc-400" />
              <span>GitLab</span>
            </div>
            <span className="text-[9px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">3</span>
          </div>
        </div>
      </div>

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