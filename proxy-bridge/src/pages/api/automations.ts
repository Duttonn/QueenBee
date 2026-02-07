import { NextApiRequest, NextApiResponse } from 'next';
import { getDb, saveDb, Automation } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { cronManager } from '../../lib/CronManager';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = getDb();

    if (req.method === 'GET') {
        return res.status(200).json(db.automations);
    }

    if (req.method === 'POST') {
        const { title, description, schedule, script } = req.body;

        // Basic validation
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const newAutomation: Automation = {
            id: uuidv4(),
            title,
            description: description || '',
            schedule: schedule || '0 0 * * *', // Default to daily if not provided
            active: true,
            script: script || '',
            lastRun: undefined
        };

        db.automations.push(newAutomation);
        saveDb(db);

        // Sync with CronManager
        if (newAutomation.active) {
            cronManager.scheduleJob(newAutomation);
        }

        return res.status(201).json(newAutomation);
    }

    if (req.method === 'PUT') {
        const { id, active, ...updates } = req.body;
        const index = db.automations.findIndex(a => a.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Automation not found' });
        }

        // Update fields
        db.automations[index] = { ...db.automations[index], ...updates };
        if (typeof active === 'boolean') {
            db.automations[index].active = active;
        }

        saveDb(db);

        // Sync with CronManager
        if (db.automations[index].active) {
            cronManager.scheduleJob(db.automations[index]);
        } else {
            cronManager.stopJob(id);
        }

        return res.status(200).json(db.automations[index]);
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'ID required' });

        db.automations = db.automations.filter(a => a.id !== id);
        saveDb(db);

        // Stop job
        cronManager.stopJob(id as string);

        return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
