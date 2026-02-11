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
  active_plan: string | null;
  unreadThreads: Set<string>;
  _debouncedSaves?: Record<string, any>;

  // Actions
  initSocket: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  setQueenStatus: (status: string) => void;
  setActivePlan: (plan: string | null) => void;
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
  setSelectedProjectId: (id: string | null) => void;
  spawnAgent: (projectId: string, agent: any) => void;
  updateAgentStatus: (projectId: string, agentName: string, status: string) => void;

    // Swarm Actions
    resetSwarm: (projectId: string) => Promise<void>;

    // Thread Actions
    setActiveThread: (id: string | null) => void;
    markThreadRead: (id: string) => void;
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
      active_plan: null,
      unreadThreads: new Set<string>(),

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
      setActivePlan: (plan) => set({ active_plan: plan }),
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
        if (id) {
          const newUnread = new Set(get().unreadThreads);
          newUnread.delete(id);
          set({ activeThreadId: id, unreadThreads: newUnread });
        } else {
          set({ activeThreadId: id });
        }
      },

      markThreadRead: (id) => {
        const newUnread = new Set(get().unreadThreads);
        newUnread.delete(id);
        set({ unreadThreads: newUnread });
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

        // Debounced persistence to keep DB small and reduce network noise
        const debouncedSave = (get() as any)._debouncedSaves?.[threadId];
        if (debouncedSave) clearTimeout(debouncedSave);

        const timeout = setTimeout(async () => {
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
        }, 2000);

        set((state: any) => ({
            _debouncedSaves: { ...(state._debouncedSaves || {}), [threadId]: timeout }
        }));
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

        resetSwarm: async (projectId) => {
          const state = get();
          const project = state.projects.find((p: any) => p.id === projectId);
          if (!project) return;

          // Find all worker threads and the architect thread
          const workerThreads = (project.threads || []).filter(
            (t: any) => t.isWorker || t.id?.startsWith('architect-')
          );

          // Find the architect thread to get swarmId for roundtable cleanup
          const architectThread = workerThreads.find((t: any) => t.id?.startsWith('architect-'));

          // Remove them from state
          set((state) => ({
            projects: state.projects.map((p: any) =>
              p.id === projectId ? {
                ...p,
                threads: (p.threads || []).filter(
                  (t: any) => !t.isWorker && !t.id?.startsWith('architect-')
                )
              } : p
            ),
            activeThreadId: workerThreads.some((t: any) => t.id === state.activeThreadId)
              ? null
              : state.activeThreadId,
            isOrchestratorActive: false,
            active_plan: null,
          }));

          // Delete from backend
          for (const t of workerThreads) {
            try {
              await fetch(`${API_BASE}/api/projects/threads?projectId=${projectId}&threadId=${t.id}`, {
                method: 'DELETE'
              });
            } catch (e) {
              console.error('[HiveStore] Failed to delete swarm thread:', t.id, e);
            }
          }

          // Clear roundtable messages for this swarm
          if (architectThread && project.path) {
            try {
              await fetch(`${API_BASE}/api/roundtable/messages?projectPath=${encodeURIComponent(project.path)}&swarmId=${encodeURIComponent(architectThread.id)}`, {
                method: 'DELETE'
              });
            } catch (e) {
              console.error('[HiveStore] Failed to clear roundtable messages:', e);
            }
          }

          console.log('[HiveStore] Swarm reset complete. Removed', workerThreads.length, 'threads');
        },

                addMessage: (projectId, threadId, message) => {
                console.log(`[HiveStore] addMessage: thread=${threadId}, role=${message.role}, id=${message.id}`);
                
                // Mark as unread if not active thread
                const state = get();
                if (state.activeThreadId !== threadId) {
                  const newUnread = new Set(state.unreadThreads);
                  newUnread.add(threadId);
                  set({ unreadThreads: newUnread });
                }

                set((state) => ({
                  projects: state.projects.map(p =>
                    p.id === projectId ? {
                      ...p,
                      threads: p.threads.map((t: any) => {
                        if (t.id === threadId) {
                          const currentMessages = t.messages || [];
                          
                          // BP-13: Precise deduplication by ID
                          if (message.id && currentMessages.some((m: any) => m.id === message.id)) {
                              console.log(`[HiveStore] Skipping duplicate message ID: ${message.id}`);
                              return t;
                          }
      
                          // Fallback deduplication for assistant messages that might be streaming
                          if (message.role === 'assistant' && !message.id) {
                              const lastMsg = currentMessages[currentMessages.length - 1];
                              if (lastMsg?.role === 'assistant' && !lastMsg.content && (!lastMsg.toolCalls || lastMsg.toolCalls.length === 0)) {
                                  // This is likely the placeholder we should have updated instead of adding
                                  return t;
                              }
                          }
      
                          return { ...t, messages: [...currentMessages, message] };
                        }
                        return t;
                      })
                    } : p
                  )
                }));
        // Debounced persistence for messages
        const debouncedSave = (get() as any)._debouncedSaves?.[`msg-${threadId}`];
        if (debouncedSave) clearTimeout(debouncedSave);

        const timeout = setTimeout(() => {
            const thread = get().projects.find(p => p.id === projectId)?.threads.find((t: any) => t.id === threadId);
            if (thread) {
                fetch(`${API_BASE}/api/projects/threads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, thread })
                }).catch(e => console.error('[HiveStore] Persistence failed', e));
            }
        }, 1000);

        set((state: any) => ({
            _debouncedSaves: { ...(state._debouncedSaves || {}), [`msg-${threadId}`]: timeout }
        }));
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
        
        // Use the same debounced save as addMessage
        const debouncedSave = (get() as any)._debouncedSaves?.[`msg-${threadId}`];
        if (debouncedSave) clearTimeout(debouncedSave);

        const timeout = setTimeout(() => {
            const thread = get().projects.find(p => p.id === projectId)?.threads.find((t: any) => t.id === threadId);
            if (thread) {
                fetch(`${API_BASE}/api/projects/threads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, thread })
                }).catch(e => console.error('[HiveStore] Persistence failed', e));
            }
        }, 1500);

        set((state: any) => ({
            _debouncedSaves: { ...(state._debouncedSaves || {}), [`msg-${threadId}`]: timeout }
        }));
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

        // Immediate save for full replacements
        const thread = get().projects.find(p => p.id === projectId)?.threads.find((t: any) => t.id === threadId);
        if (thread) {
            fetch(`${API_BASE}/api/projects/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, thread })
            }).catch(e => console.error('[HiveStore] Persistence failed', e));
        }
      },

      updateToolCall: (projectId, threadId, messageIndex, toolCallId, updates) => {
        set((state) => ({
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
        }));

        // Debounced persistence for tool calls
        const debouncedSave = (get() as any)._debouncedSaves?.[`msg-${threadId}`];
        if (debouncedSave) clearTimeout(debouncedSave);

        const timeout = setTimeout(() => {
            const thread = get().projects.find(p => p.id === projectId)?.threads.find((t: any) => t.id === threadId);
            if (thread) {
                fetch(`${API_BASE}/api/projects/threads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, thread })
                }).catch(e => console.error('[HiveStore] Persistence failed', e));
            }
        }, 1000);

        set((state: any) => ({
            _debouncedSaves: { ...(state._debouncedSaves || {}), [`msg-${threadId}`]: timeout }
        }));
      }
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
        tasks: state.tasks,
        active_plan: state.active_plan,
        unreadThreads: Array.from(state.unreadThreads)
      }),
        onRehydrateStorage: () => {
          return (state) => {
            // Convert array back to Set after rehydration
            if (state && state.unreadThreads && !(state.unreadThreads instanceof Set)) {
              state.unreadThreads = new Set(state.unreadThreads as any);
            }
          };
        },
        merge: (persistedState: any, currentState) => {
          const merged = { ...currentState, ...persistedState };
          if (merged.unreadThreads && !(merged.unreadThreads instanceof Set)) {
            merged.unreadThreads = new Set(merged.unreadThreads);
          }
          return merged;
        }
    }
  )
);