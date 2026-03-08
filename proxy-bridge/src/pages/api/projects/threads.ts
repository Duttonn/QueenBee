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

        if (req.method === 'POST') {
            const { projectId, thread, projectName, projectPath } = req.body;
            if (!projectId || !thread) return res.status(400).json({ error: 'projectId and thread required' });

            let projectIndex = db.projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                // Project not found — try to auto-create it using provided info to avoid data loss
                if (projectName || projectPath) {
                    console.log(`[Threads API] Project ${projectId} not found, creating it with provided info`);
                    const newProject = {
                        id: projectId,
                        name: projectName || projectPath || `Project-${projectId.slice(0, 8)}`,
                        path: projectPath || '',
                        type: 'local' as const,
                        threads: [],
                        agents: [],
                    };
                    db.projects.push(newProject);
                    projectIndex = db.projects.length - 1;
                } else {
                    console.warn(`[Threads API] Project not found and no project info provided: ${projectId}`);
                    // Return 200 instead of 404 to avoid breaking the frontend — thread is in local state
                    return res.status(200).json({ status: 'skipped', reason: 'project_not_found' });
                }
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

        res.setHeader('Allow', ['POST', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error: any) {
        console.error('[Threads API] Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
