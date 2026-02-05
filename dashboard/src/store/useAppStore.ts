import { create } from 'zustand';

// Types derived from backend structures
export interface Automation {
    id: string;
    title: string;
    description: string;
    schedule: string;
    active: boolean;
    script?: string;
    lastRun?: string;
}

export interface Skill {
    id: string;
    title: string;
    description: string;
    installed: boolean;
    icon?: string;
    type: 'mcp' | 'custom' | 'plugin';
}

export interface Thread {
    id: string;
    title: string;
    diff: string;
    time: string;
}

export interface Project {
    name: string;
    path: string;
    threads: Thread[];
}

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    code?: number;
}

const API_BASE = 'http://localhost:3000/api';

interface AppState {
    // Data
    automations: Automation[];
    skills: { installed: Skill[]; available: Skill[] };
    projects: Project[];

    // Actions
    fetchData: () => Promise<void>;

    // Automations
    addAutomation: (auto: Partial<Automation>) => Promise<void>;
    toggleAutomation: (id: string, active: boolean) => Promise<void>;
    runAutomation: (script: string) => Promise<ExecutionResult>;

    // Skills
    installSkill: (skill: Partial<Skill>) => Promise<void>;
    uninstallSkill: (id: string) => Promise<void>;

    // Projects
    addProject: (name: string, path: string) => Promise<void>;

    // Git
    commit: (repoPath: string, message: string) => Promise<void>;
    getGitStatus: (repoPath: string) => Promise<any>;
}

export const useAppStore = create<AppState>((set, get) => ({
    automations: [],
    skills: { installed: [], available: [] },
    projects: [],

    fetchData: async () => {
        try {
            const [authRes, skillsRes, projectsRes] = await Promise.all([
                fetch(`${API_BASE}/automations`),
                fetch(`${API_BASE}/skills`),
                fetch(`${API_BASE}/projects`)
            ]);

            if (authRes.ok) set({ automations: await authRes.json() });
            if (skillsRes.ok) set({ skills: await skillsRes.json() });
            if (projectsRes.ok) set({ projects: await projectsRes.json() });

        } catch (e) {
            console.error("Failed to fetch app data", e);
        }
    },

    addAutomation: async (auto) => {
        const res = await fetch(`${API_BASE}/automations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auto)
        });
        if (res.ok) {
            const newAuto = await res.json();
            set(state => ({ automations: [...state.automations, newAuto] }));
        }
    },

    toggleAutomation: async (id, active) => {
        const res = await fetch(`${API_BASE}/automations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, active })
        });
        if (res.ok) {
            set(state => ({
                automations: state.automations.map(a => a.id === id ? { ...a, active } : a)
            }));
        }
    },

    runAutomation: async (script) => {
        const res = await fetch(`${API_BASE}/execution/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: script })
        });
        return await res.json();
    },

    installSkill: async (skill) => {
        const res = await fetch(`${API_BASE}/skills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(skill)
        });
        if (res.ok) {
            const data = await res.json();
            // Ideally fetch skills again or optimistically update
            get().fetchData();
        }
    },

    uninstallSkill: async (id) => {
        const res = await fetch(`${API_BASE}/skills?id=${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            get().fetchData();
        }
    },

    addProject: async (name, path) => {
        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, path })
        });
        if (res.ok) {
            const newProj = await res.json();
            set(state => ({ projects: [...state.projects, newProj] }));
        }
    },

    commit: async (repoPath, message) => {
        await fetch(`${API_BASE}/git/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: repoPath, message })
        });
    },

    getGitStatus: async (repoPath) => {
        const res = await fetch(`${API_BASE}/git/status?path=${encodeURIComponent(repoPath)}`);
        return await res.json();
    }
}));
