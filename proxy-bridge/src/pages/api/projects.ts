import { NextApiRequest, NextApiResponse } from 'next';
import { getDb, saveDb, Project } from '../../lib/db';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = getDb();

    if (req.method === 'GET') {
        return res.status(200).json(db.projects);
    }

    if (req.method === 'POST') {
        // Add a project manually
        const { name, path: projectPath } = req.body;
        if (!name || !projectPath) return res.status(400).json({ error: 'Name and path required' });

        // Verify path exists
        if (!fs.existsSync(projectPath)) {
            return res.status(400).json({ error: 'Path does not exist on server' });
        }

        const newProject: Project = {
            name,
            path: projectPath,
            threads: []
        };

        db.projects.push(newProject);
        saveDb(db);
        return res.status(201).json(newProject);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
