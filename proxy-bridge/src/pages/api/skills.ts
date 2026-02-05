import { NextApiRequest, NextApiResponse } from 'next';
import { getDb, saveDb, Skill } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = getDb();

    if (req.method === 'GET') {
        // Return all skills (installed and potentially a list of recommended ones hardcoded or fetched)
        // For now, returning installed + available
        return res.status(200).json({
            installed: db.skills.filter(s => s.installed),
            available: [
                // Hardcoded recommendations for now
                { id: 'notion-capture', title: 'Notion Capture', description: 'Save to Notion', type: 'plugin' },
                { id: 'gh-fix', title: 'GH Fix CI', description: 'Fix failing CI', type: 'plugin' },
                { id: 'image-gen', title: 'Image Gen', description: 'Generate images', type: 'mcp' }
            ]
        });
    }

    if (req.method === 'POST') {
        // Install a skill
        const { id, title, description, type } = req.body;

        // Check if authentic logic would go here (e.g. npm install, mcp config update)

        const existing = db.skills.find(s => s.id === id);
        if (existing) {
            if (existing.installed) return res.status(400).json({ error: 'Already installed' });
            existing.installed = true;
        } else {
            db.skills.push({
                id: id || uuidv4(),
                title: title || 'Unknown Skill',
                description: description || '',
                installed: true,
                type: type || 'custom'
            });
        }

        saveDb(db);
        return res.status(200).json({ success: true, skill: db.skills.find(s => s.id === (id || existing?.id)) });
    }

    if (req.method === 'DELETE') {
        // Uninstall
        const { id } = req.query;
        const index = db.skills.findIndex(s => s.id === id);
        if (index !== -1) {
            db.skills[index].installed = false; // Soft delete usually for skills locally
            // Or hard delete
            db.skills.splice(index, 1);
            saveDb(db);
        }
        return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
