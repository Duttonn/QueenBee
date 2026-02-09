import fs from 'fs';
import path from 'path';
import os from 'os';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'queenbee.json');

console.log('Database path:', DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create data directory:', error);
    }
}

export interface Automation {
    id: string;
    title: string;
    description: string;
    schedule: string; // cron expression or simple text
    active: boolean;
    script?: string;
    lastRun?: string;
}

export interface Skill {
    id: string;
    title: string;
    description: string;
    installed: boolean;
    icon?: string; // name of icon
    type: 'mcp' | 'custom' | 'plugin';
}

export interface Project {
    id: string;
    name: string;
    path: string;
    type: 'local' | 'cloud';
    threads: Thread[];
    agents?: any[];
}

export interface Thread {
    id: string;
    title: string;
    diff: string;
    time: string;
    messages?: any[];
}

export interface Database {
    automations: Automation[];
    skills: Skill[];
    projects: Project[];
}

const defaultDb: Database = {
    automations: [
        {
            id: '1',
            title: 'Daily Summary',
            description: 'Generate a summary of code changes at 9 AM',
            schedule: '0 9 * * *',
            active: true,
            script: 'git log --since="24 hours ago" --oneline | mcp summarize'
        },
        {
            id: '2',
            title: 'Auto-Review PRs',
            description: 'Automatically review new PRs on GitHub',
            schedule: 'Every hour',
            active: false
        }
    ],
    skills: [
        {
            id: 'figma-mcp',
            title: 'Figma MCP → Figma',
            description: 'Use Figma MCP for design-to-code work',
            installed: true,
            type: 'mcp'
        },
        {
            id: 'skill-creator',
            title: 'Skill Creator',
            description: 'Create or update a skill',
            installed: true,
            type: 'plugin'
        }
    ],
    projects: []
};

export const getDb = (): Database => {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
        return defaultDb;
    }
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(data) as Database;

        // Resolve ~ in project paths
        if (db.projects) {
            db.projects.forEach(p => {
                if (p.path.startsWith('~')) {
                    p.path = p.path.replace('~', os.homedir());
                }
            });
        }

        return db;
    } catch (error) {
        console.error('Error reading DB:', error);
        return defaultDb;
    }
};

export const saveDb = (db: Database) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (error) {
        console.error('Error saving DB:', error);
    }
};
