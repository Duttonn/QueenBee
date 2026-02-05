import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface HiveState {
  projects: any[];
  socket: Socket | null;
  
  initSocket: () => void;
  addProject: (project: any) => void;
  spawnAgent: (projectId: string, agent: any) => void;
  updateAgentStatus: (projectId: string, agentName: string, status: string) => void;
}

export const useHiveStore = create<HiveState>((set, get) => ({
  projects: [
    { id: 'bj', name: 'Blackjack Advisor', agents: [], type: 'local' },
    { id: 'vos', name: 'visionOS MCP', agents: [], type: 'local' }
  ],
  socket: null,

  initSocket: () => {
    if (get().socket) return;
    const socket = io('/api/logs/stream');
    
    socket.on('UI_UPDATE', (data) => {
      if (data.action === 'SPAWN_AGENT_UI') {
        get().spawnAgent(data.payload.projectId, data.payload);
      }
      if (data.action === 'SET_AGENT_STATUS') {
        get().updateAgentStatus(data.payload.projectId, data.payload.agentName, data.payload.status);
      }
    });

    set({ socket });
  },

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
}));
