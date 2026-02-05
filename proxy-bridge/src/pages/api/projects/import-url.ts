import { NextApiRequest, NextApiResponse } from 'next';
import { RepoClonerService } from '../../../lib/RepoClonerService';
import { getDb, saveDb, Project } from '../../../lib/db';
import { broadcast } from '../../../lib/socket-instance';

const cloner = new RepoClonerService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { repoUrl, accessToken, projectName } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  try {
    const { path: targetPath, id: sessionId } = await cloner.clone(repoUrl, accessToken);
    
    const db = getDb();
    const name = projectName || repoUrl.split('/').pop() || 'Imported Cloud Project';

    const newProject: Project = {
      name,
      path: targetPath,
      threads: [
        {
          id: `cloud-${sessionId}`,
          title: 'Cloud Workspace Initialized',
          diff: '+0 -0',
          time: new Date().toISOString()
        }
      ]
    };

    db.projects.push(newProject);
    saveDb(db);

    broadcast('PROJECT_LIST_UPDATE', { projects: db.projects });

    return res.status(201).json(newProject);
  } catch (error: any) {
    console.error('[ImportURL] Failed:', error);
    return res.status(500).json({ error: String(error) });
  }
}
