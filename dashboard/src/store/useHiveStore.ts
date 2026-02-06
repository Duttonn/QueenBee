import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from './useAppStore';

interface HiveState {
  projects: any[];
  activeAgents: any[];
  activeThreadId: string | null;
  isOrchestratorActive: boolean;
  queenStatus: string;
  lastEvent: string | null;
  socket: Socket | null;

  // Actions
  initSocket: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  setQueenStatus: (status: string) => void;
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
  spawnAgent: (projectId: string, agent: any) => void;
  updateAgentStatus: (projectId: string, agentName: string, status: string) => void;

  // Thread Actions
  setActiveThread: (id: string | null) => void;
  addThread: (projectId: string, thread: any) => void;
  updateThread: (projectId: string, threadId: string, updates: any) => void;
  addMessage: (projectId: string, threadId: string, message: any) => void;
  clearThreadMessages: (projectId: string, threadId: string) => void;
  updateLastMessage: (projectId: string, threadId: string, content: string) => void;
  updateToolCall: (projectId: string, threadId: string, messageIndex: number, toolCallId: string, updates: any) => void;
}

export const useHiveStore = create<HiveState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeAgents: [],
      activeThreadId: null,
      isOrchestratorActive: false,
      queenStatus: 'idle',
      lastEvent: null,
      socket: null,

      initSocket: async () => {
        if (get().socket) return;
        
        // Boot the socket server via HTTP first (Next.js requirement)
        try {
          await fetch(`${API_BASE}/api/logs/stream`);
        } catch (e) {
          console.error('[HiveStore] Failed to boot socket server:', e);
        }

        const socket = io(`${API_BASE}`, {
          path: '/api/logs/stream',
          transports: ['websocket', 'polling']
        });
        set({ socket });
      },

      fetchProjects: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/projects`);
          if (res.ok) {
            const projects = await res.json();
            set({ projects });
          }
        } catch (error) {
          console.error('[HiveStore] Failed to fetch projects:', error);
        }
      },

      setQueenStatus: (status) => set({ queenStatus: status }),
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),

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

      setActiveThread: (activeThreadId) => set({ activeThreadId }),

      addThread: async (projectId, thread) => {
        // Simple state update - the agent will handle worktree creation autonomously
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, threads: [{ ...thread, messages: [] }, ...(p.threads || [])] } : p
          )
        }));

        queueMicrotask(() => set({ activeThreadId: thread.id }));
      },

      updateThread: (projectId, threadId, updates) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? {
            ...p,
            threads: p.threads.map((t: any) => t.id === threadId ? { ...t, ...updates } : t)
          } : p
        )
      })),

      addMessage: (projectId, threadId, message) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? {
            ...p,
            threads: p.threads.map((t: any) => {
              if (t.id === threadId) {
                // Prevent duplicate messages (especially from socket relay)
                const isDuplicate = t.messages?.some((m: any) => 
                  m.role === message.role && 
                  m.content === message.content && 
                  message.content !== '' // Allow empty messages for streaming
                );
                if (isDuplicate) return t;
                return { ...t, messages: [...(t.messages || []), message] };
              }
              return t;
            })
          } : p
        )
      })),

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

      updateLastMessage: (projectId, threadId, content) => set((state) => ({
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
      })),

      updateToolCall: (projectId, threadId, messageIndex, toolCallId, updates) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? {
            ...p,
            threads: p.threads.map((t: any) =>
              t.id === threadId ? {
                ...t,
                messages: t.messages.map((msg: any, idx: number) =>
                  idx === messageIndex ? {
                    ...msg,
                    toolCalls: msg.toolCalls?.map((tc: any) =>
                      tc.id === toolCallId ? { ...tc, ...updates } : tc
                    )
                  } : msg
                )
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
        isOrchestratorActive: state.isOrchestratorActive
      }),
    }
  )
);