import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

interface HiveState {
  projects: any[];
  activeAgents: any[];
  isOrchestratorActive: boolean;
  lastEvent: string | null;
  socket: any | null; // Mark as any to avoid persistence issues with Socket instance

  // Actions
  initSocket: () => void;
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
  spawnAgent: (projectId: string, agent: any) => void;
  updateAgentStatus: (projectId: string, agentName: string, status: string) => void;
}

export const useHiveStore = create<HiveState>()(
  persist(
    (set, get) => ({
      projects: [
        { id: 'bj', name: 'Blackjack Advisor', agents: [], threads: [], type: 'local' },
        { id: 'vos', name: 'visionOS MCP', agents: [], threads: [], type: 'local' }
      ],
      activeAgents: [],
      isOrchestratorActive: false,
      lastEvent: null,
      socket: null,

      initSocket: () => {
        if (get().socket) return;
        const socket = io('http://localhost:3001', {
          path: '/api/logs/stream'
        });

        socket.on('UI_UPDATE', (data: any) => {
          if (data.action === 'SPAWN_AGENT_UI') {
            get().spawnAgent(data.payload.projectId, data.payload);
          }
          if (data.action === 'SET_AGENT_STATUS') {
            get().updateAgentStatus(data.payload.projectId, data.payload.agentName, data.payload.status);
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
      }))
    }),
    {
      name: 'hive-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeAgents: state.activeAgents,
        isOrchestratorActive: state.isOrchestratorActive
      }), // Don't persist the socket instance!
    }
  )
);
