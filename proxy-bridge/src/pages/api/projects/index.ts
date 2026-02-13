import { NextApiRequest, NextApiResponse } from 'next';
import { getDb, saveDb, Project, getProjectsForSession } from '../../../lib/db';
import { broadcast } from '../../../lib/socket-instance';
import { v4 as uuidv4 } from 'uuid';
import { getSessionId } from '../../../lib/session';
import { Paths } from '../../../lib/Paths';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionId = getSessionId(req);

  if (req.method === 'GET') {
    const projects = getProjectsForSession(sessionId);
    // Ensure .queenbee/ is in every project's .gitignore
    for (const p of projects) {
      if (p.path) Paths.ensureGitignore(p.path);
    }
    return res.status(200).json(projects);
  }

  if (req.method === 'POST') {
    const { name, path, type } = req.body;

    if (!name || !path) {
      return res.status(400).json({ error: 'name and path are required' });
    }

    const newProject: Project = {
      id: uuidv4(),
      name,
      path,
      type: type || 'local',
      threads: [
        {
          id: `initial-${Date.now()}`,
          title: 'Project Initialized',
          diff: '+0 -0',
          time: new Date().toISOString()
        }
      ],
      agents: [],
      ownerId: sessionId
    };

    const db = getDb();
    db.projects.push(newProject);
    saveDb(db);

      // Ensure .queenbee/ is in the project's .gitignore from the start
      Paths.ensureGitignore(path);

      broadcast('PROJECT_LIST_UPDATE', { projects: getProjectsForSession(sessionId) });

      return res.status(201).json(newProject);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
