import { NextApiRequest, NextApiResponse } from 'next';
import { getDb, saveDb, Project } from '../../../lib/db';
import { broadcast } from '../../../lib/socket-instance';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();

  if (req.method === 'GET') {
    return res.status(200).json(db.projects || []);
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
      agents: []
    };

    db.projects.push(newProject);
    saveDb(db);

    broadcast('PROJECT_LIST_UPDATE', { projects: db.projects });

    return res.status(201).json(newProject);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}