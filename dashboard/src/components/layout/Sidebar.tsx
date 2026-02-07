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
  Check,
  Globe,
  Link as LinkIcon
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHiveStore } from '../../store/useHiveStore';
import { SystemService } from '../../services/SystemService';

interface SidebarProps {
  activeView: 'build' | 'automations' | 'skills';
  onViewChange: (view: 'build' | 'automations' | 'skills') => void;
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
    <div className="w-72 sm:w-72 bg-zinc-900/50 backdrop-blur-xl h-full flex flex-col border-r border-white/5 shadow-sm">

      <div className="h-4 flex-shrink-0"></div>

      <div className="px-3 mb-2 flex-shrink-0">
        <button 
          onClick={onSearchClick}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-zinc-500 hover:bg-white/10 transition-colors border border-white/5"
        >
          <Search size={14} />
          <span className="text-sm text-left flex-1 font-medium">Search</span>
          <span className="text-[10px] text-zinc-600 font-black hidden sm:block">⌘K</span>
        </button>
      </div>

      <div className="px-2 space-y-0.5 mb-4 relative group/new">
        <NavItem
          icon={<Plus size={16} />}
          label="New thread"
          active={activeView === 'build' && !activeThreadId}
          onClick={() => {
            setActiveThread(null);
            onViewChange('build');
          }}
        />
        
        {/* Sub-actions for New Thread (Hover/Click) */}
        <div className="absolute left-full top-0 ml-2 hidden group-hover/new:block z-50 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1 w-48 backdrop-blur-2xl">
            <button
              onClick={() => { setActiveThread(null); onViewChange('build'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-zinc-400 hover:bg-white/5 rounded-lg transition-colors"
            >
              <MessageSquare size={14} className="text-zinc-500" />
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
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              <Plus size={14} className="text-blue-500" />
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
          icon={<Plug size={16} />}
          label="Skills"
          active={activeView === 'skills'}
          onClick={() => onViewChange('skills')}
        />
      </div>

      <div className="mx-3 h-px bg-white/5 mb-3"></div>


      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2 mb-2 relative">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            Threads
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAddRepoOpen(!isAddRepoOpen)}
              className="text-zinc-500 hover:text-blue-500 transition-colors p-1 hover:bg-white/5 rounded"
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
                  className="absolute right-0 top-6 w-56 z-20 bg-zinc-900 rounded-xl shadow-2xl border border-white/10 py-1 overflow-hidden backdrop-blur-2xl"
                >
                  <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Import Repository</div>
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
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                              onClick={() => handleImportRepo(repo)}
                            >
                              <div className="w-5 h-5 rounded-md bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 text-[10px] text-zinc-400 font-bold">
                                {isCloning === repo.full_name ? (
                                  <Loader2 size={12} className="text-blue-500 animate-spin" />
                                ) : (
                                  repo.name[0].toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] text-zinc-200 font-semibold truncate">{repo.name}</div>
                                <div className="text-[10px] text-zinc-500 truncate">
                                  {isImported ? 'Imported' : repo.full_name}
                                </div>
                              </div>
                              {isImported && <Check size={12} className="text-green-500 flex-shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-zinc-500">
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
                          className="w-full flex items-center justify-center gap-2 bg-white text-zinc-950 text-[11px] font-bold py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                          <Plus size={12} />
                          Connect GitHub
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 p-1 space-y-1">
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-zinc-400 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Folder size={12} className="text-zinc-500" />
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-zinc-400 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Globe size={12} className="text-zinc-500" />
                        <span>Import Remote Repo</span>
                      </button>
                    )}
                    
                    <button
                      onClick={onOpenSettings}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
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
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${
                selectedProjectId === project.id && !activeThreadId
                ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              {expandedFolders[project.name] ? (
                <ChevronDown size={14} className={selectedProjectId === project.id ? 'text-white' : 'text-zinc-600'} />
              ) : (
                <ChevronRight size={14} className={selectedProjectId === project.id ? 'text-white' : 'text-zinc-600'} />
              )}
              {project.path.includes('/workspaces/') ? <Globe size={14} className={selectedProjectId === project.id ? 'text-white' : 'text-blue-500'} /> : <Folder size={14} className={selectedProjectId === project.id ? 'text-white' : 'text-zinc-600'} />}
              <span>{project.name}</span>
            </button>

            {expandedFolders[project.name] && (
              <div className="ml-4 space-y-0.5 mt-1 border-l border-white/5 pl-2">
                {project.threads?.map((thread: any) => (
                  <div
                    key={thread.id}
                    onClick={() => {
                      onProjectSelect?.(project.id);
                      setActiveThread(thread.id);
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-all ${
                      activeThreadId === thread.id 
                      ? 'bg-white/5 text-white border border-white/5' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={12} className={activeThreadId === thread.id ? 'text-blue-400' : 'text-zinc-600'} />
                      <span className="text-[12px] font-medium truncate">{thread.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      {thread.diff && (
                        <span className="text-[9px] font-black font-mono tracking-tighter">
                          <span className="text-green-500">{thread.diff.split(' ')[0]}</span>
                          {' '}
                          <span className="text-red-500">{thread.diff.split(' ')[1]}</span>
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-zinc-600">{thread.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 bg-black/20 mt-auto">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg">
            {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'ND'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-zinc-200 truncate">{user?.name || 'Natao Dutton'}</div>
            <div className="text-[10px] text-green-500 font-black uppercase tracking-widest">Pro</div>
          </div>

          {onOpenSettings && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/10 rounded-lg transition-all"
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
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${active
      ? 'bg-white/10 text-white shadow-sm border border-white/5'
      : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
      }`}
  >
    <span className={active ? 'text-zinc-300' : 'text-zinc-500'}>{icon}</span>
    <span>{label}</span>
  </button>
);

export default Sidebar;