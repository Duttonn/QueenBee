import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.html'];
const ALLOWED_ROOTS = [
    '/Users/ndn18/PersonalProjects/QueenBee/dashboard',
    '/Users/ndn18/PersonalProjects/QueenBee/proxy-bridge',
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

    // Security: Validate path is within allowed directories
    const normalizedPath = path.normalize(filePath);
    const isAllowed = ALLOWED_ROOTS.some(root => normalizedPath.startsWith(root));

    if (!isAllowed) {
        return res.status(403).json({
            error: 'Access denied',
            message: 'File path must be within allowed project directories'
        });
    }

    // Security: Validate file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(403).json({
            error: 'Invalid file type',
            message: `Only these extensions are allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        });
    }

    // Security: Prevent path traversal
    if (normalizedPath.includes('..')) {
        return res.status(403).json({ error: 'Path traversal not allowed' });
    }

    try {
        if (req.method === 'GET') {
            // Read file
            const content = await fs.readFile(normalizedPath, 'utf-8');
            const stats = await fs.stat(normalizedPath);

            return res.status(200).json({
                path: normalizedPath,
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
            const backupPath = `${normalizedPath}.backup`;
            try {
                const existing = await fs.readFile(normalizedPath, 'utf-8');
                await fs.writeFile(backupPath, existing);
            } catch {
                // File might not exist yet, that's ok
            }

            // Write new content
            await fs.writeFile(normalizedPath, content, 'utf-8');

            console.log(`[Files] Updated: ${normalizedPath}`);

            return res.status(200).json({
                success: true,
                path: normalizedPath,
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
                path: normalizedPath
            });
        }

        return res.status(500).json({
            error: 'File operation failed',
            message: error.message
        });
    }
}
