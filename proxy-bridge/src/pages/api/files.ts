import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../lib/Paths';

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.html'];
const PROJECT_ROOT = Paths.getProxyBridgeRoot();
const ALLOWED_ROOTS = [
    PROJECT_ROOT,
    Paths.getWorkspaceRoot(),
    Paths.getCloudWorkspacesDir(),
];

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

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    // Security: Resolve path relative to PROJECT_ROOT and normalize
    const absolutePath = path.isAbsolute(filePath) 
        ? path.normalize(filePath) 
        : path.resolve(PROJECT_ROOT, filePath);
    
    // Security: Validate path is within allowed directories
    const isAllowed = ALLOWED_ROOTS.some(root => absolutePath.startsWith(path.normalize(root)));

    if (!isAllowed) {
        return res.status(403).json({
            error: 'Access denied',
            message: `File path must be within allowed project directories. Resolved: ${absolutePath}`
        });
    }

    // Security: Prevent path traversal (extra check)
    if (absolutePath.includes('..') && !absolutePath.startsWith(PROJECT_ROOT)) {
         return res.status(403).json({ error: 'Path traversal not allowed' });
    }

    try {
        const stats = await fs.stat(absolutePath);

        if (req.method === 'GET') {
            if (stats.isDirectory()) {
                const files = await fs.readdir(absolutePath);
                return res.status(200).json({
                    path: absolutePath,
                    isDirectory: true,
                    files
                });
            }

            // Security: Validate file extension for files only
            const ext = path.extname(absolutePath).toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                return res.status(403).json({
                    error: 'Invalid file type',
                    message: `Only these extensions are allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
                });
            }

            // Read file
            const content = await fs.readFile(absolutePath, 'utf-8');

            return res.status(200).json({
                path: absolutePath,
                isDirectory: false,
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
