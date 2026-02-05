import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenSquare,
  Clock,
  Plug,
  ChevronDown,
  ChevronRight,
  Folder,
  MessageSquare,
  Settings,
  Search,
  Plus,
  Loader2,
  Check
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHiveStore } from '../../store/useHiveStore';

interface SidebarProps {
  activeView: 'build' | 'automations' | 'skills';
  onViewChange: (view: 'build' | 'automations' | 'skills') => void;
  onOpenSettings?: () => void;
  onSearchClick?: () => void;
  selectedProjectId?: string | null;
  onProjectSelect?: (id: string) => void;
}

const Sidebar = ({ activeView, onViewChange, onOpenSettings, onSearchClick, selectedProjectId, onProjectSelect }: SidebarProps) => {
  const { projects: appProjects } = useAppStore();
  const { projects, addProject, activeThreadId, setActiveThread } = useHiveStore();
  const { forges } = useAuthStore();
  const gitForge = forges.find(f => f.id === 'github');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isCloning, setIsCloning] = useState<string | null>(null);

  const handleImportRepo = async (repo: any) => {
    setIsCloning(repo.full_name);
    const targetDir = `/Users/ndn18/PersonalProjects/QueenBee/projects/${repo.name}`;
    
    try {
      console.log(`[Electron] Starting clone for ${repo.full_name}...`);
      if (window.electron) {
        await window.electron.clone(repo.html_url, targetDir);
        
        // Add to Hive Store
        const newProject = {
          id: repo.id.toString(),
          name: repo.name,
          path: targetDir,
          agents: [],
          threads: [
            { id: Date.now().toString(), title: 'Initial Triage', diff: '+0 -0', time: 'Just now', messages: [] }
          ],
          type: 'local'
        };
        
        addProject(newProject);
        setIsAddRepoOpen(false);
        onProjectSelect?.(newProject.id);
        setActiveThread(newProject.threads[0].id);
      } else {
        alert("Electron native bridge not available. Please ensure you are running the Electron app.");
      }
    } catch (error) {
      console.error('Clone failed:', error);
      alert(`Failed to clone repository: ${error}`);
    } finally {
      setIsCloning(null);
    }
  };

  useEffect(() => {
    // Initialize expanded state for new projects
    const newExpanded = { ...expandedFolders };
    projects.forEach(p => {
      if (newExpanded[p.name] === undefined) newExpanded[p.name] = true;
    });
    // Add git repos
    if (gitForge?.repositories) {
      gitForge.repositories.forEach(repo => {
        const key = repo.fullName || repo.full_name;
        if (newExpanded[key] === undefined) newExpanded[key] = false;
      });
    }
    setExpandedFolders(newExpanded);
  }, [projects, gitForge?.repositories]);

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  return (
    <div className="w-72 sm:w-72 bg-gray-50/95 backdrop-blur-xl h-full flex flex-col border-r border-gray-200/50 shadow-sm">

      {/* Top spacing */}
      <div className="h-4 flex-shrink-0"></div>

      {/* Search */}
      <div className="px-3 mb-2 flex-shrink-0">
        <button 
          onClick={onSearchClick}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100/80 rounded-lg text-gray-400 hover:bg-gray-200/50 transition-colors"
        >
          <Search size={14} />
          <span className="text-sm text-left flex-1">Search</span>
          <span className="text-xs text-gray-400 font-mono hidden sm:block font-medium">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="px-2 space-y-0.5 mb-4">
        <NavItem
          icon={<PenSquare size={16} />}
          label="New thread"
          active={activeView === 'build' && !activeThreadId}
          onClick={() => {
            setActiveThread(null);
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
          icon={<Plug size={16} />}
          label="Skills"
          active={activeView === 'skills'}
          onClick={() => onViewChange('skills')}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-gray-200 mb-3"></div>

      {/* Threads Section */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2 mb-2 relative">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Threads
          </div>
          {/* Add Repo Button */}
          <button
            onClick={() => setIsAddRepoOpen(!isAddRepoOpen)}
            className="text-gray-400 hover:text-blue-500 transition-colors p-1 hover:bg-gray-100 rounded"
            title="Import Repository"
          >
            <Plus size={14} />
          </button>

          {/* Import Repo Dropdown */}
          <AnimatePresence>
            {isAddRepoOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsAddRepoOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-6 w-56 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-gray-50 bg-gray-50/50">
                    <div className="text-xs font-medium text-gray-600">Import from GitHub</div>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    {gitForge?.connected ? (
                      gitForge.repositories && gitForge.repositories.length > 0 ? (
                        gitForge.repositories.map((repo: any) => {
                          const isImported = projects.some(p => p.id === repo.id.toString());
                          return (
                            <button
                              key={repo.id}
                              disabled={isCloning === repo.full_name || isImported}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                              onClick={() => handleImportRepo(repo)}
                            >
                              <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs text-slate-600 font-medium">
                                {isCloning === repo.full_name ? (
                                  <Loader2 size={12} className="text-blue-500 animate-spin" />
                                ) : (
                                  repo.name[0].toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-700 font-medium truncate">{repo.name}</div>
                                <div className="text-[10px] text-gray-400 truncate">
                                  {isImported ? 'Imported' : repo.full_name}
                                </div>
                              </div>
                              {isImported && <Check size={12} className="text-green-500 flex-shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-gray-400">
                          No repositories found
                        </div>
                      )
                    ) : (
                      <div className="p-3">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('http://localhost:3000/api/auth/github');
                              const data = await res.json();
                              if (data.url) window.location.href = data.url;
                            } catch (e) {
                              console.error('Login failed', e);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-xs font-medium py-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <div className="w-4 h-4 rounded-full bg-white text-slate-900 flex items-center justify-center">
                            <Plus size={10} />
                          </div>
                          Connect GitHub
                        </button>
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                          Connect to import repositories
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-50 p-1">
                    <button
                      onClick={onOpenSettings}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg justify-center transition-colors"
                    >
                      <Settings size={12} />
                      <span>Manage Connections</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {projects.map(project => (
          <div key={project.name} className="mb-2">
            {/* Folder Header */}
            <button
              onClick={() => {
                toggleFolder(project.name);
                onProjectSelect?.(project.id);
                setActiveThread(null);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedProjectId === project.id && !activeThreadId
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {expandedFolders[project.name] ? (
                <ChevronDown size={14} className={selectedProjectId === project.id ? 'text-blue-500' : 'text-gray-400'} />
              ) : (
                <ChevronRight size={14} className={selectedProjectId === project.id ? 'text-blue-500' : 'text-gray-400'} />
              )}
              <Folder size={14} className={selectedProjectId === project.id ? 'text-blue-500' : 'text-gray-400'} />
              <span>{project.name}</span>
            </button>

            {/* Thread Items */}
            {expandedFolders[project.name] && (
              <div className="ml-4 space-y-0.5 mt-1">
                {project.threads?.map((thread: any) => (
                  <div
                    key={thread.id}
                    onClick={() => {
                      onProjectSelect?.(project.id);
                      setActiveThread(thread.id);
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${
                      activeThreadId === thread.id 
                      ? 'bg-white shadow-sm border border-gray-200/50 text-zinc-900' 
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={12} className={activeThreadId === thread.id ? 'text-blue-500' : 'text-gray-400'} />
                      <span className="text-sm truncate">{thread.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      {thread.diff && (
                        <span className="text-[10px] font-mono">
                          <span className="text-green-600">{thread.diff.split(' ')[0]}</span>
                          {' '}
                          <span className="text-red-500">{thread.diff.split(' ')[1]}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{thread.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* GitHub Repositories Section */}
      {gitForge?.connected && gitForge?.repositories && gitForge.repositories.length > 0 && (
        <div className="flex-1 overflow-y-auto px-2 mt-4 border-t border-gray-100 pt-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
            Repositories
          </div>

          {gitForge.repositories.map((repo: any) => {
            const isImported = projects.some(p => p.id === repo.id.toString());
            return (
              <div key={repo.id} className="mb-1">
                <button
                  onClick={() => {
                    const existing = projects.find(p => p.id === repo.id.toString());
                    if (existing) {
                      onProjectSelect?.(existing.id);
                      setActiveThread(null);
                    } else {
                      handleImportRepo(repo);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedProjectId === repo.id.toString() 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold flex-shrink-0">
                    {isCloning === repo.full_name ? <Loader2 size={10} className="animate-spin" /> : repo.name[0].toUpperCase()}
                  </div>
                  <span className="truncate flex-1 text-left">{repo.name}</span>
                  {isImported && <Check size={10} className="text-green-500 opacity-60" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* User Footer */}
      <div className="p-3 border-t border-gray-200/50 bg-white/50 mt-auto">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-all shadow-sm border border-transparent hover:border-gray-100 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
            ND
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">Natao Dutton</div>
            <div className="text-xs text-green-600 font-medium">Pro Plan</div>
          </div>

          {onOpenSettings && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              title="Settings"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active
      ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
  >
    <span className={active ? 'text-gray-700' : 'text-gray-400'}>{icon}</span>
    <span>{label}</span>
  </button>
);

export default Sidebar;
