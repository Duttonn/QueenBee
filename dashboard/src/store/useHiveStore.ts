import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../services/api';

interface HiveState {
  projects: any[];
  activeAgents: any[];
  activeThreadId: string | null;
  selectedProjectId: string | null;
  isOrchestratorActive: boolean;
  queenStatus: string;
  lastEvent: string | null;
  socket: Socket | null;
  tasks: any[]; // GSDPhase[]

  // Actions
  initSocket: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  setQueenStatus: (status: string) => void;
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
  setSelectedProjectId: (id: string | null) => void;
  spawnAgent: (projectId: string, agent: any) => void;
  updateAgentStatus: (projectId: string, agentName: string, status: string) => void;

  // Thread Actions
  setActiveThread: (id: string | null) => void;
  addThread: (projectId: string, thread: any) => Promise<string>; // Returns threadId
  updateThread: (projectId: string, threadId: string, updates: any) => void;
  deleteThread: (projectId: string, threadId: string) => Promise<void>;
  addMessage: (projectId: string, threadId: string, message: any) => void;
  clearThreadMessages: (projectId: string, threadId: string) => void;
  updateLastMessage: (projectId: string, threadId: string, content: string) => void;
  replaceLastMessage: (projectId: string, threadId: string, updates: any) => void;
  updateToolCall: (projectId: string, threadId: string, messageIndex: number, toolCallId: string, updates: any) => void;
}

export const useHiveStore = create<HiveState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeAgents: [],
      activeThreadId: null,
      selectedProjectId: null,
      isOrchestratorActive: false,
      queenStatus: 'idle',
      lastEvent: null,
      socket: null,
      tasks: [],

      initSocket: async () => {
        if (get().socket) return;
        console.log('[HiveStore] Initializing Socket...');

        // Boot the socket server endpoint (best-effort, non-blocking)
        const bootServer = async (retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              await fetch(`${API_BASE}/api/logs/stream`);
              return;
            } catch (e) {
              if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
              }
            }
          }
          console.warn('[HiveStore] Socket server boot failed after retries — connecting anyway');
        };
        await bootServer();

        const socket = io(API_BASE, {
          path: '/api/logs/stream',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
        });

        socket.on('connect', () => console.log('[HiveStore] Socket connected'));
        socket.on('connect_error', (err) => console.warn('[HiveStore] Socket connect error:', err.message));

        set({ socket });
      },

      fetchProjects: async () => {
        try {
          console.log('[HiveStore] Fetching Projects...');
          const res = await fetch(`${API_BASE}/api/projects`);
          if (res.ok) {
            const fetchedProjects = await res.json();
            console.log(`[HiveStore] Projects loaded from backend: ${fetchedProjects.length}`);
            
            set((state) => {
              const mergedProjects = fetchedProjects.map((fp: any) => {
                const existing = state.projects.find(p => p.id === fp.id);
                // Preserve local threads if backend threads are empty but local ones exist
                const threads = (fp.threads && fp.threads.length > 0) 
                  ? fp.threads 
                  : (existing?.threads || []);
                
                return { ...fp, threads };
              });
              
              const newState: any = { projects: mergedProjects };
              
              if (!state.selectedProjectId && mergedProjects.length > 0) {
                console.log(`[HiveStore] Auto-selecting project: ${mergedProjects[0].id}`);
                newState.selectedProjectId = mergedProjects[0].id;
              }
              
              return newState;
            });
          }
        } catch (error) {
          console.error('[HiveStore] Failed to fetch projects:', error);
        }
      },

      fetchTasks: async () => {
        try {
          const state = get();
          const activeProject = state.projects.find(p => p.id === state.selectedProjectId);
          const path = activeProject?.path;
          
          const url = path 
            ? `${API_BASE}/api/tasks/list?projectPath=${encodeURIComponent(path)}`
            : `${API_BASE}/api/tasks/list`;

          const res = await fetch(url);
          if (res.ok) {
            const tasks = await res.json();
            set({ tasks });
          }
        } catch (error) {
          console.error('[HiveStore] Failed to fetch tasks:', error);
        }
      },

      setQueenStatus: (status) => set({ queenStatus: status }),
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => {
        const isDuplicate = state.projects.some(p => 
          p.name === project.name || p.path === project.path
        );
        if (isDuplicate) return state;
        return { projects: [...state.projects, project], selectedProjectId: project.id };
      }),

      setSelectedProjectId: (id) => {
        console.log(`[HiveStore] Setting selectedProjectId: ${id}`);
        // Reset active thread when switching projects to avoid stale thread leakage
        set({ selectedProjectId: id, activeThreadId: null });
      },

      spawnAgent: (projectId, agent) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, agents: [...p.agents, agent] } : p
        )
      })),

      updateAgentStatus: (projectId, agentName, status) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? {
            ...p,
            agents: p.agents.map((a: any) => a.name === agentName ? { ...a, status } : a)
          } : p
        )
      })),

      setActiveThread: (id) => {
        console.log(`[HiveStore] Setting activeThreadId: ${id}`);
        set({ activeThreadId: id });
      },

      addThread: async (projectId, thread) => {
        console.log(`[HiveStore] addThread: proj=${projectId}, threadId=${thread.id}`);
        
        // 1. Optimistic UI update
        set((state) => {
          const updatedProjects = state.projects.map(p =>
            p.id === projectId ? { 
              ...p, 
              threads: [{ ...thread, messages: [], agentId: thread.agentId }, ...(p.threads || [])] 
            } : p
          );
          return {
            projects: updatedProjects,
            activeThreadId: thread.id
          };
        });

        // 2. Persist to backend
        try {
          await fetch(`${API_BASE}/api/projects/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, thread: { ...thread, messages: [] } })
          });
        } catch (e) {
          console.error('[HiveStore] Failed to persist new thread:', e);
        }

        return thread.id;
      },

      updateThread: async (projectId, threadId, updates) => {
        console.log(`[HiveStore] updateThread: ${threadId}`);
        
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId ? {
              ...p,
              threads: p.threads.map((t: any) => t.id === threadId ? { ...t, ...updates } : t)
            } : p
          )
        }));

        // Persist updates (excluding full messages for now to keep DB small)
        const thread = get().projects.find(p => p.id === projectId)?.threads.find((t: any) => t.id === threadId);
        if (thread) {
            try {
                await fetch(`${API_BASE}/api/projects/threads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, thread: { ...thread, messages: undefined } })
                });
            } catch (e) { }
        }
      },

      deleteThread: async (projectId, threadId) => {
        console.log(`[HiveStore] deleteThread: ${threadId}`);
        
        set((state) => {
          const updatedProjects = state.projects.map(p =>
            p.id === projectId ? {
              ...p,
              threads: p.threads.filter((t: any) => t.id !== threadId)
            } : p
          );
          
          return {
            projects: updatedProjects,
            activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId
          };
        });

        try {
          await fetch(`${API_BASE}/api/projects/threads?projectId=${projectId}&threadId=${threadId}`, {
            method: 'DELETE'
          });
        } catch (e) {
          console.error('[HiveStore] Failed to delete thread:', e);
        }
      },

      addMessage: (projectId, threadId, message) => {
        console.log(`[HiveStore] addMessage: thread=${threadId}, role=${message.role}`);
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId ? {
              ...p,
              threads: p.threads.map((t: any) => {
                if (t.id === threadId) {
                  const isDuplicate = t.messages?.some((m: any) => 
                    m.role === message.role && 
                    m.content === message.content && 
                    message.content !== ''
                  );
                  if (isDuplicate) return t;
                  return { ...t, messages: [...(t.messages || []), message] };
                }
                return t;
              })
            } : p
          )
        }));

        // Persist to backend
        const thread = get().projects.find(p => p.id === projectId)?.threads.find((t: any) => t.id === threadId);
        if (thread) {
            fetch(`${API_BASE}/api/projects/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, thread })
            }).then(res => {
                if (!res.ok) console.error(`[HiveStore] Persistence failed: ${res.status}`);
            }).catch(e => console.error('[HiveStore] Persistence network error', e));
        }
      },

      clearThreadMessages: (projectId, threadId) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? {
            ...p,
            threads: p.threads.map((t: any) =>
              t.id === threadId ? { ...t, messages: [] } : t
            )
          } : p
        )
      })),

      updateLastMessage: (projectId, threadId, content) => {
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId ? {
              ...p,
              threads: p.threads.map((t: any) =>
                t.id === threadId ? {
                  ...t,
                  messages: t.messages.map((msg: any, idx: number) =>
                    idx === t.messages.length - 1 ? { ...msg, content: msg.content + content } : msg
                  )
                } : t
              )
            } : p
          )
        }));
        
        // Debounced persistence would be better, but for now we'll rely on replace/add for durable saves
      },

      replaceLastMessage: (projectId, threadId, updates) => {
        console.log(`[HiveStore] replaceLastMessage: thread=${threadId}, updates keys=${Object.keys(updates)}`);
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId ? {
              ...p,
              threads: p.threads.map((t: any) =>
                t.id === threadId ? {
                  ...t,
                  messages: t.messages.map((msg: any, idx: number) =>
                    idx === t.messages.length - 1 ? { ...msg, ...updates } : msg
                  )
                } : t
              )
            } : p
          )
        }));

        // Persist full message block
        const thread = get().projects.find(p => p.id === projectId)?.threads.find((t: any) => t.id === threadId);
        if (thread) {
            fetch(`${API_BASE}/api/projects/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, thread })
            }).catch(e => console.error('[HiveStore] Persistence failed', e));
        }
      },

      updateToolCall: (projectId, threadId, messageIndex, toolCallId, updates) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? {
            ...p,
            threads: p.threads.map((t: any) =>
              t.id === threadId ? {
                ...t,
                messages: t.messages.map((msg: any, idx: number) => {
                  if (idx !== messageIndex) return msg;
                  const toolCalls = msg.toolCalls || [];
                  const exists = toolCalls.some((tc: any) => tc.id === toolCallId);
                  return {
                    ...msg,
                    toolCalls: exists
                      ? toolCalls.map((tc: any) => tc.id === toolCallId ? { ...tc, ...updates } : tc)
                      : [...toolCalls, { id: toolCallId, ...updates }]
                  };
                })
              } : t
            )
          } : p
        )
      }))
    }),
    {
      name: 'hive-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeAgents: state.activeAgents,
        activeThreadId: state.activeThreadId,
        selectedProjectId: state.selectedProjectId,
        isOrchestratorActive: state.isOrchestratorActive,
        tasks: state.tasks
      }),
    }
  )
);