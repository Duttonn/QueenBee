import { create } from 'zustand';
import { useHiveStore } from './useHiveStore';

// Types derived from backend structures
export interface Automation {
    id: string;
    title: string;
    description: string;
    type?: 'GSD_SCAN' | 'SYNC_REPOS' | 'PR_REVIEW' | 'CHANGELOG' | 'DATA_GEN' | 'CI_MONITOR' | 'RELEASE_NOTES' | 'TEST_NIGHTLY' | 'MAINTENANCE';
    schedule: string;
    days?: string[];
    active: boolean;
    script?: string;
    lastRun?: string;
    allowedCommands?: string[];
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

const API_BASE = 'http://127.0.0.1:3000/api';

interface AppState {
    // Data
    automations: Automation[];
    skills: { installed: Skill[]; available: Skill[] };

    // Global UI State
    isCommandBarOpen: boolean;
    setCommandBarOpen: (open: boolean) => void;

    // Actions
    fetchData: () => Promise<void>;

    // Automations
    addAutomation: (auto: Partial<Automation>) => Promise<void>;
    toggleAutomation: (id: string, active: boolean) => Promise<void>;
    deleteAutomation: (id: string) => Promise<void>;
    runAutomation: (script: string, allowedCommands?: string[]) => Promise<ExecutionResult>;

    // Skills
    installSkill: (skill: Partial<Skill>) => Promise<void>;
    uninstallSkill: (id: string) => Promise<void>;

    // Projects
    addProject: (name: string, path: string) => Promise<void>;

    // Git
    commit: (repoPath: string, message: string) => Promise<void>;
    getGitStatus: (repoPath: string) => Promise<any>;
    getAllowedCommands: () => Promise<string[]>;
}

export const useAppStore = create<AppState>((set, get) => ({
    automations: [],
    skills: { installed: [], available: [] },
    isCommandBarOpen: false,

    setCommandBarOpen: (open) => set({ isCommandBarOpen: open }),

    fetchData: async () => {
        try {
            const [authRes, skillsRes] = await Promise.all([
                fetch(`${API_BASE}/automations`),
                fetch(`${API_BASE}/skills`)
            ]);

            if (authRes.ok) set({ automations: await authRes.json() });
            if (skillsRes.ok) set({ skills: await skillsRes.json() });
            
            // Trigger HiveStore projects fetch
            useHiveStore.getState().fetchProjects();

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

    deleteAutomation: async (id) => {
        const res = await fetch(`${API_BASE}/automations?id=${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            set(state => ({
                automations: state.automations.filter(a => a.id !== id)
            }));
        }
    },

    runAutomation: async (script, allowedCommands) => {
        const res = await fetch(`${API_BASE}/execution/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: script, allowedCommands })
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
        // Prevent duplicate local projects before calling the API
        const existing = useHiveStore.getState().projects.find(p => p.path === path);
        if (existing) {
            console.log(`[AppStore] Project already exists at ${path}`);
            return;
        }

        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, path })
        });
        if (res.ok) {
            const newProj = await res.json();
            useHiveStore.getState().addProject(newProj);
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
    },

    getAllowedCommands: async () => {
        try {
            const res = await fetch(`${API_BASE}/config/security`);
            if (res.ok) {
                const data = await res.json();
                return data.allowedCommands || [];
            }
        } catch (e) {
            console.error("Failed to fetch allowed commands", e);
        }
        return [];
    }
}));
