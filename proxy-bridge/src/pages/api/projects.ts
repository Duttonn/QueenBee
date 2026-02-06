import { NextApiRequest, NextApiResponse } from 'next';
import { getDb, saveDb, Project } from '../../lib/db';
import fs from 'fs';
import path from 'path';
import { broadcast } from '../../lib/socket-instance';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = getDb();

    if (req.method === 'GET') {
        // Migration: Ensure all projects have an ID and type
        let changed = false;
        db.projects.forEach(p => {
            if (!p.id) {
                p.id = uuidv4();
                changed = true;
            }
            if (!p.type) {
                p.type = 'local';
                changed = true;
            }
            if (!p.agents) {
                p.agents = [];
                changed = true;
            }
        });
        if (changed) saveDb(db);
        
        return res.status(200).json(db.projects);
    }

    if (req.method === 'POST') {
        // Add a project manually
        const { name, path: projectPath, type = 'local' } = req.body;
        if (!name || !projectPath) return res.status(400).json({ error: 'Name and path required' });

        // Verify path exists
        if (!fs.existsSync(projectPath)) {
            return res.status(400).json({ error: 'Path does not exist on server' });
        }

        // Prevent duplicate projects by path
        const existing = db.projects.find(p => p.path === projectPath);
        if (existing) {
            return res.status(200).json(existing); // Return existing instead of error for idempotency
        }

        const newProject: Project = {
            id: uuidv4(),
            name,
            path: projectPath,
            type: type as 'local' | 'cloud',
            threads: [],
            agents: []
        };

        db.projects.push(newProject);
        saveDb(db);

        broadcast('PROJECT_LIST_UPDATE', { projects: db.projects });

        return res.status(201).json(newProject);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
