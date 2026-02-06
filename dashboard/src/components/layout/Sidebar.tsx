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
  Link as LinkIcon
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHiveStore } from '../../store/useHiveStore';
import { SystemService } from '../../services/SystemService';

interface SidebarProps {
  activeView: 'build' | 'automations' | 'skills' | 'triage';
  onViewChange: (view: 'build' | 'automations' | 'skills' | 'triage') => void;
  onOpenSettings?: () => void;
  onSearchClick?: () => void;
  selectedProjectId?: string | null;
  onProjectSelect?: (id: string) => void;
}

const Sidebar = ({ activeView, onViewChange, onOpenSettings, onSearchClick, selectedProjectId, onProjectSelect }: SidebarProps) => {
  const { projects, addProject, activeThreadId, setActiveThread } = useHiveStore();
  const { forges, user } = useAuthStore();
  const gitForge = forges.find(f => f.id === 'github');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isCloning, setIsCloning] = useState<string | null>(null);

  const handleImportRepo = async (repo: any) => {
    setIsCloning(repo.full_name);
    
    // Detect Electron environment
    const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;

    // Check if we are in Electron or Web
    if (isElectron) {
      try {
        // ALLOW USER TO CHOOSE FOLDER
        const result = await SystemService.dialog.showOpen({
          properties: ['openDirectory'],
          title: 'Select Destination Folder for Clone'
        });

        if (result.canceled || result.filePaths.length === 0) {
          setIsCloning(null);
          return;
        }

        const baseDir = result.filePaths[0];
        const targetDirForClone = `${baseDir}/${repo.name}`;
        
        console.log(`[System] Starting clone for ${repo.full_name} into ${targetDirForClone}...`);
        await SystemService.fs.clone(repo.html_url, targetDirForClone);
        
        // SAVE TO BACKEND
        const res = await fetch('http://127.0.0.1:3000/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: repo.name,
            path: targetDirForClone, // Use the actual absolute path chosen by user
            type: 'local'
          })
        });

        if (res.ok) {
          const savedProject = await res.json();
          addProject(savedProject);
          setIsAddRepoOpen(false);
          onProjectSelect?.(savedProject.id);
          if (savedProject.threads && savedProject.threads.length > 0) {
            setActiveThread(savedProject.threads[0].id);
          }
        }
      } catch (error) {
        console.error('Clone failed:', error);
        alert(`Failed to clone repository: ${error}`);
      } finally {
        setIsCloning(null);
      }
    } else {
      // WEB MODE - Use Cloud Import
      try {
        const res = await fetch('http://127.0.0.1:3000/api/projects/import-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl: repo.html_url || repo.url,
            projectName: repo.name,
            accessToken: gitForge?.accessToken
          })
        });

        if (res.ok) {
          const newProject = await res.json();
          addProject(newProject);
          setIsAddRepoOpen(false);
          onProjectSelect?.(newProject.id);
          setActiveThread(newProject.threads[0].id);
        } else {
          const err = await res.json();
          alert(`Cloud import failed: ${err.error}`);
        }
      } catch (error) {
        console.error('Cloud import failed:', error);
        alert(`Failed to import to cloud: ${error}`);
      } finally {
        setIsCloning(null);
      }
    }
  };

  useEffect(() => {
    const newExpanded = { ...expandedFolders };
    projects.forEach(p => {
      if (newExpanded[p.name] === undefined) newExpanded[p.name] = true;
    });
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

      <div className="h-4 flex-shrink-0"></div>

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

      <div className="px-2 space-y-0.5 mb-4 relative group/new">
        <NavItem
          icon={<PenSquare size={16} />}
          label="New thread"
          active={activeView === 'build' && !activeThreadId}
          onClick={() => {
            setActiveThread(null);
            onViewChange('build');
          }}
        />
        
        {/* Sub-actions for New Thread (Hover/Click) */}
        <div className="absolute left-full top-0 ml-2 hidden group-hover/new:block z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-1 w-48 backdrop-blur-xl">
            <button
              onClick={() => { setActiveThread(null); onViewChange('build'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MessageSquare size={14} className="text-gray-400" />
              <span>Simple Chat</span>
            </button>
            <button
              onClick={() => { 
                const name = prompt('Feature Name:', 'New Module');
                if (name) {
                  // Trigger special swarm event
                  window.dispatchEvent(new CustomEvent('START_SWARM_WORKFLOW', { detail: { name } }));
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus size={14} className="text-blue-400" />
              <span>Swarm Workflow</span>
            </button>
          </div>
        </div>

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

      <div className="mx-3 h-px bg-gray-200 mb-3"></div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2 mb-2 relative">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Threads
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAddRepoOpen(!isAddRepoOpen)}
              className="text-gray-400 hover:text-blue-500 transition-colors p-1 hover:bg-gray-100 rounded"
              title="Add Project"
            >
              <Plus size={14} />
            </button>
          </div>

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
                          const isImported = projects.some(p => p.id === (repo.id ? repo.id.toString() : ''));
                          return (
                            <button
                              key={repo.id || repo.name}
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
                              {isImported && <Check size={12} className="text-[#22C55E] flex-shrink-0" />}
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
                          className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#1E293B] transition-colors"
                        >
                          <div className="w-4 h-4 rounded-full bg-white text-slate-900 flex items-center justify-center">
                            <Plus size={10} />
                          </div>
                          Connect GitHub
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-50 p-1 space-y-1">
                    {/* Environment Specific Actions */}
                    {typeof window !== 'undefined' && (window as any).electron ? (
                      <button
                        onClick={async () => {
                          const result = await SystemService.dialog.showOpen({
                            properties: ['openDirectory'],
                            title: 'Select Project Folder'
                          });
                          if (!result.canceled && result.filePaths.length > 0) {
                            const path = result.filePaths[0];
                            const name = path.split('/').pop() || 'Existing Project';
                            const res = await fetch('http://127.0.0.1:3000/api/projects', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name, path, type: 'local' })
                            });
                            if (res.ok) {
                              const proj = await res.json();
                              addProject(proj);
                              setIsAddRepoOpen(false);
                            }
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Folder size={12} className="text-gray-400" />
                        <span>Import Local Folder</span>
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const url = prompt('Enter GitHub repository URL (e.g. https://github.com/user/repo):');
                          if (url) {
                            setIsCloning('url');
                            try {
                              const res = await fetch('http://localhost:3000/api/projects/import-url', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  repoUrl: url,
                                  projectName: url.split('/').pop(),
                                  accessToken: gitForge?.accessToken
                                })
                              });

                              if (res.ok) {
                                const newProject = await res.json();
                                addProject(newProject);
                                setIsAddRepoOpen(false);
                                onProjectSelect?.(newProject.id);
                                if (newProject.threads && newProject.threads.length > 0) {
                                  setActiveThread(newProject.threads[0].id);
                                }
                              } else {
                                const err = await res.json();
                                alert(`Import failed: ${err.error}`);
                              }
                            } catch (e) {
                              alert(`Import failed: ${e}`);
                            } finally {
                              setIsCloning(null);
                            }
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Globe size={12} className="text-gray-400" />
                        <span>Import Remote Repo (Fork)</span>
                      </button>
                    )}
                    
                    <button
                      onClick={onOpenSettings}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
            <button
              onClick={() => {
                toggleFolder(project.name);
                onProjectSelect?.(project.id);
                setActiveThread(null);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedProjectId === project.id && !activeThreadId
                ? 'bg-blue-50 text-[#3B82F6] shadow-sm border border-blue-100/50' 
                : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {expandedFolders[project.name] ? (
                <ChevronDown size={14} className={selectedProjectId === project.id ? 'text-[#3B82F6]' : 'text-gray-400'} />
              ) : (
                <ChevronRight size={14} className={selectedProjectId === project.id ? 'text-[#3B82F6]' : 'text-gray-400'} />
              )}
              {project.path.includes('/workspaces/') ? <Globe size={14} className={selectedProjectId === project.id ? 'text-[#3B82F6]' : 'text-blue-400'} /> : <Folder size={14} className={selectedProjectId === project.id ? 'text-[#3B82F6]' : 'text-gray-400'} />}
              <span>{project.name}</span>
            </button>

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
                      <MessageSquare size={12} className={activeThreadId === thread.id ? 'text-[#3B82F6]' : 'text-gray-400'} />
                      <span className="text-sm truncate">{thread.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      {thread.diff && (
                        <span className="text-[10px] font-mono">
                          <span className="text-[#22C55E]">{thread.diff.split(' ')[0]}</span>
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

      {gitForge?.connected && gitForge?.repositories && gitForge.repositories.length > 0 && (
        <div className="flex-1 overflow-y-auto px-2 mt-4 border-t border-gray-100 pt-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
            Repositories
          </div>

          {gitForge.repositories.map((repo: any) => {
            const isImported = projects.some(p => p.id === (repo.id ? repo.id.toString() : ''));
            return (
              <div key={repo.id || repo.name} className="mb-1">
                <button
                  onClick={() => {
                    const existing = projects.find(p => p.id === (repo.id ? repo.id.toString() : ''));
                    if (existing) {
                      onProjectSelect?.(existing.id);
                      setActiveThread(null);
                    } else {
                      handleImportRepo(repo);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedProjectId === (repo.id ? repo.id.toString() : '') 
                    ? 'bg-blue-50 text-[#3B82F6] border border-blue-100/50 shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold flex-shrink-0">
                    {isCloning === repo.full_name ? <Loader2 size={10} className="animate-spin" /> : repo.name[0].toUpperCase()}
                  </div>
                  <span className="truncate flex-1 text-left">{repo.name}</span>
                  {isImported && <Check size={10} className="text-[#22C55E] opacity-60" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 border-t border-gray-200/50 bg-white/50 mt-auto">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-all shadow-sm border border-transparent hover:border-gray-100 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
            {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'ND'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Natao Dutton'}</div>
            <div className="text-xs text-[#22C55E] font-medium">Pro Plan</div>
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