import { create } from 'zustand';

interface HiveState {
  projects: any[];
  activeAgents: any[];
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
  spawnAgent: (agent: any) => void;
}

export const useHiveStore = create<HiveState>((set) => ({
  projects: [],
  activeAgents: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  spawnAgent: (agent) => set((state) => ({ activeAgents: [...state.activeAgents, agent] })),
}));
