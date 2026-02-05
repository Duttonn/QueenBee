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
  socket: any | null; // Mark as any to avoid persistence issues with Socket instance

  // Actions
  initSocket: () => void;
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
          path: '/api/logs/stream'
        });

        socket.on('connect', () => {
          console.log('[Socket] Connected to backend');
        });

        socket.on('QUEEN_STATUS', (data: any) => {
          set({ queenStatus: data.status });
        });

        socket.on('PROJECT_LIST_UPDATE', (data: any) => {
          set({ projects: data.projects });
        });

        socket.on('UI_UPDATE', (data: any) => {
          if (data.action === 'SPAWN_AGENT_UI') {
            get().spawnAgent(data.payload.projectId, data.payload);
          }
          if (data.action === 'SET_AGENT_STATUS') {
            get().updateAgentStatus(data.payload.projectId, data.payload.agentName, data.payload.status);
          }
        });

        socket.on('NATIVE_NOTIFICATION', (data: any) => {
          if (window.electron) {
            window.electron.notify(data.title, data.body);
          }
        });

        set({ socket });
      },

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
