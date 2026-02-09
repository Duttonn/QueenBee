import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.html', '.svg', '.png', '.txt'];
const PROJECT_ROOT = process.cwd();

/**
 * File API for reading and writing source files
 * Used by the customization panel for source code editing
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const filePath = req.query.path as string || (req.body as any)?.path;
    let baseDir = (req.query.projectPath as string) || (req.body as any)?.projectPath || PROJECT_ROOT;

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    // Handle tilde in project path
    if (baseDir.startsWith('~')) {
        baseDir = baseDir.replace('~', os.homedir());
    }

    // Security: Resolve path relative to baseDir and normalize
    const absolutePath = path.isAbsolute(filePath) 
        ? path.normalize(filePath) 
        : path.resolve(baseDir, filePath);
    
    // Security check: ensure baseDir is absolute
    const absoluteBaseDir = path.isAbsolute(baseDir) ? baseDir : path.resolve(PROJECT_ROOT, baseDir);

    // Security: Validate path is within the requested baseDir or project root
    if (!absolutePath.startsWith(path.normalize(absoluteBaseDir)) && !absolutePath.startsWith(path.normalize(PROJECT_ROOT))) {
        return res.status(403).json({
            error: 'Access denied',
            message: `File path must be within the project directory. Resolved: ${absolutePath}`
        });
    }

    // Security: Validate file extension
    const ext = path.extname(absolutePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(403).json({
            error: 'Invalid file type',
            message: `Only these extensions are allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        });
    }

    // Security: Prevent path traversal (extra check)
    if (absolutePath.includes('..') && !absolutePath.startsWith(PROJECT_ROOT)) {
         return res.status(403).json({ error: 'Path traversal not allowed' });
    }

    try {
        if (req.method === 'GET') {
            // Read file
            const content = await fs.readFile(absolutePath, 'utf-8');
            const stats = await fs.stat(absolutePath);

            return res.status(200).json({
                path: absolutePath,
                content,
                size: stats.size,
                modified: stats.mtime.toISOString()
            });
        }

        if (req.method === 'PUT') {
            // Write file
            const { content } = req.body;

            if (typeof content !== 'string') {
                return res.status(400).json({ error: 'Content must be a string' });
            }

            // Create backup before writing
            const backupPath = `${absolutePath}.backup`;
            try {
                const existing = await fs.readFile(absolutePath, 'utf-8');
                await fs.writeFile(backupPath, existing);
            } catch {
                // File might not exist yet, that's ok
            }

            // Write new content
            await fs.writeFile(absolutePath, content, 'utf-8');

            console.log(`[Files] Updated: ${absolutePath}`);

            return res.status(200).json({
                success: true,
                path: absolutePath,
                message: 'File saved successfully',
                backup: backupPath
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('[Files] Error:', error);

        if (error.code === 'ENOENT') {
            return res.status(404).json({
                error: 'File not found',
                path: absolutePath
            });
        }

        return res.status(500).json({
            error: 'File operation failed',
            message: error.message
        });
    }
}
