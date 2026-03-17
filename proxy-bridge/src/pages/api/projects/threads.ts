import { NextApiRequest, NextApiResponse } from 'next';
import { getDb, saveDb } from '../../../lib/infrastructure/db';
import { sessionManager } from '../../../lib/agents/SessionManager';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const db = getDb();

        if (req.method === 'GET') {
            const { projectId } = req.query;
            if (!projectId) return res.status(400).json({ error: 'projectId is required' });

            const project = db.projects.find(p => p.id === projectId);
            if (!project) {
                console.warn(`[Threads API] GET - Project not found: ${projectId}`);
                return res.status(404).json({ error: 'Project not found', projectId });
            }

            return res.status(200).json({ threads: project.threads || [] });
        }

        if (req.method === 'POST') {
            const { projectId, thread } = req.body;
            if (!projectId || !thread) {
                console.warn('[Threads API] POST - Missing projectId or thread in request body');
                return res.status(400).json({ error: 'projectId and thread required' });
            }

            if (!thread.id) {
                console.warn('[Threads API] POST - Thread missing id field');
                return res.status(400).json({ error: 'thread.id is required' });
            }

            let projectIndex = db.projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                // Auto-create project — frontend may have created it locally before backend knew about it
                console.log(`[Threads API] POST - Auto-creating project: ${projectId}`);
                db.projects.push({ id: projectId, name: 'Default Project', threads: [], agents: [], createdAt: new Date().toISOString() } as any);
                projectIndex = db.projects.length - 1;
            }

            // Update or add thread
            const threads = db.projects[projectIndex].threads || [];
            const threadIndex = threads.findIndex(t => t.id === thread.id);
            
            if (threadIndex > -1) {
                // Merge with existing but prefer incoming for messages if they exist
                threads[threadIndex] = { 
                    ...threads[threadIndex], 
                    ...thread,
                    messages: thread.messages || threads[threadIndex].messages || []
                };
            } else {
                threads.unshift({
                    messages: [],
                    ...thread
                }); // New threads at the top
            }

            db.projects[projectIndex].threads = threads;
            saveDb(db);

            return res.status(200).json({ status: 'success' });
        }

        if (req.method === 'DELETE') {
            const { projectId, threadId } = req.query;
            if (!projectId || !threadId) return res.status(400).json({ error: 'projectId and threadId required' });

            // Abort any active sessions for this thread
            sessionManager.abortThread(threadId as string);

            const projectIndex = db.projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                return res.status(404).json({ error: 'Project not found' });
            }

            db.projects[projectIndex].threads = (db.projects[projectIndex].threads || []).filter(t => t.id !== threadId);
            saveDb(db);

            return res.status(200).json({ status: 'success' });
        }

        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error: any) {
        console.error('[Threads API] Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
