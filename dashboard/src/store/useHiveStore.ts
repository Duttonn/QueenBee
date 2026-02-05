import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

interface HiveState {
  projects: any[];
  activeAgents: any[];
  activeThreadId: string | null;
  isOrchestratorActive: boolean;
  queenStatus: string;
  lastEvent: string | null;
  socket: Socket | null; // Mark as any to avoid persistence issues with Socket instance

  // Actions
  initSocket: () => void;
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

      initSocket: () => {
        if (get().socket) return;
        const socket = io('http://localhost:3001', {
          path: '/api/logs/stream' // This path will be corrected in TASK-02
        });

        // Listeners moved to useSocketEvents hook in TASK-03
        set({ socket });
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

      addThread: (projectId, thread) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? { ...p, threads: [{ ...thread, messages: [] }, ...(p.threads || [])] } : p
        ),
        activeThreadId: thread.id
      })),

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
            threads: p.threads.map((t: any) => 
              t.id === threadId ? { ...t, messages: [...(t.messages || []), message] } : t
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
      }), // Don't persist the socket instance!
    }
  )
);
