import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface HiveState {
  projects: any[];
  activeAgents: any[];
  isOrchestratorActive: boolean;
  lastEvent: string | null;
  socket: Socket | null;
  
  // Actions
  initSocket: () => void;
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
  spawnAgent: (agent: any) => void;
  setOrchestratorStatus: (active: boolean) => void;
}

export const useHiveStore = create<HiveState>((set, get) => ({
  projects: [],
  activeAgents: [],
  isOrchestratorActive: false,
  lastEvent: null,
  socket: null,

  initSocket: () => {
    if (get().socket) return;
    const socket = io('/api/logs/stream');
    
    socket.on('UI_UPDATE', (data) => {
      console.log('[Socket] UI Update received:', data);
      if (data.action === 'ADD_PROJECT') get().addProject(data.payload);
      if (data.action === 'SPAWN_AGENT') get().spawnAgent(data.payload);
      set({ lastEvent: data.action });
    });

    set({ socket });
  },

  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  spawnAgent: (agent) => set((state) => ({ activeAgents: [...state.activeAgents, agent] })),
  setOrchestratorStatus: (active) => set({ isOrchestratorActive: active }),
}));
