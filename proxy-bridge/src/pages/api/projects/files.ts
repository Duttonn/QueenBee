import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.cache'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.html', '.svg', '.png', '.txt', '.py', '.swift', '.c', '.cpp', '.h', '.yaml', '.yml'];

async function getFiles(dir: string, baseDir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.includes(entry.name)) return [];
      return getFiles(res, baseDir);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        return path.relative(baseDir, res);
      }
      return [];
    }
  }));
  return Array.prototype.concat(...files);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let projectPath = req.query.path as string;
  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (projectPath.startsWith('~')) {
    projectPath = projectPath.replace('~', os.homedir());
  }

  if (!path.isAbsolute(projectPath)) {
    projectPath = path.resolve(process.cwd(), '..', projectPath);
  }

  try {
    if (!(await fs.pathExists(projectPath))) {
      return res.status(404).json({ error: 'Project path not found' });
    }

    const files = await getFiles(projectPath, projectPath);
    return res.status(200).json({ files: files.sort() });
  } catch (error: any) {
    console.error('[ProjectFiles] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
