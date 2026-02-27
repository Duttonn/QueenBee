/**
 * P19-13: Experience Snapshot Export/Import (.qbx bundles)
 *
 * Allows users to export their agent's learned experience as a portable .qbx
 * bundle (ZIP archive) and import community/team bundles.
 *
 * .qbx format (ZIP):
 *   - experience-archive.jsonl  (filtered entries with performanceScore > 0.7)
 *   - evolved-config.json       (from .queenbee/)
 *   - evolution-directives.json (from .queenbee/)
 *   - meta.json                 (SnapshotMeta)
 */

import archiver from 'archiver';
import yauzl from 'yauzl';
import fs from 'fs-extra';
import path from 'path';

export interface SnapshotMeta {
  version: string;        // '1.0'
  exportedAt: string;
  domain: string;         // e.g. 'react/typescript' — user-supplied tag
  entryCount: number;
  queenbeeVersion: string;
}

const QUEENBEE_VERSION = '19.0';
const MIN_PERF_SCORE   = 0.7;

export class ExperienceSnapshotService {
  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  /**
   * Build a .qbx bundle (ZIP Buffer) from the project's experience archive.
   * Only includes entries with performanceScore > 0.7.
   */
  static async exportSnapshot(projectPath: string, domain: string = 'general'): Promise<Buffer> {
    const queenbeeDir = path.join(projectPath, '.queenbee');

    // --- 1. Load and filter archive entries ---
    const archivePath = path.join(queenbeeDir, 'experience-archive.jsonl');
    let filteredLines: string[] = [];

    if (await fs.pathExists(archivePath)) {
      const raw = await fs.readFile(archivePath, 'utf-8');
      filteredLines = raw
        .split('\n')
        .filter(Boolean)
        .filter(line => {
          try {
            const entry = JSON.parse(line);
            return (entry.performanceScore ?? 0) > MIN_PERF_SCORE;
          } catch {
            return false;
          }
        });
    }

    const filteredArchiveContent = filteredLines.join('\n') + (filteredLines.length > 0 ? '\n' : '');

    // --- 2. Load optional config files ---
    const evolvedConfigPath   = path.join(queenbeeDir, 'evolved-config.json');
    const directivesPath      = path.join(queenbeeDir, 'evolution-directives.json');
    const evolvedConfigContent   = (await fs.pathExists(evolvedConfigPath))
      ? await fs.readFile(evolvedConfigPath, 'utf-8')
      : JSON.stringify({});
    const directivesContent   = (await fs.pathExists(directivesPath))
      ? await fs.readFile(directivesPath, 'utf-8')
      : JSON.stringify({});

    // --- 3. Build meta ---
    const meta: SnapshotMeta = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      domain,
      entryCount: filteredLines.length,
      queenbeeVersion: QUEENBEE_VERSION,
    };

    // --- 4. Create ZIP archive in memory ---
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      const archive = archiver('zip', { zlib: { level: 6 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      archive.append(filteredArchiveContent, { name: 'experience-archive.jsonl' });
      archive.append(evolvedConfigContent,   { name: 'evolved-config.json' });
      archive.append(directivesContent,      { name: 'evolution-directives.json' });
      archive.append(JSON.stringify(meta, null, 2), { name: 'meta.json' });

      archive.finalize();
    });

    return buffer;
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  /**
   * Import a .qbx bundle (as a Buffer) into the project's experience archive.
   * Deduplicates entries by sessionId — existing sessionIds are skipped.
   * Returns counts of imported vs skipped entries.
   */
  static async importSnapshot(
    buffer: Buffer,
    projectPath: string
  ): Promise<{ imported: number; skipped: number }> {
    const queenbeeDir = path.join(projectPath, '.queenbee');
    await fs.ensureDir(queenbeeDir);

    // --- 1. Parse archive from buffer ---
    const files = await ExperienceSnapshotService.readZipFromBuffer(buffer);

    // --- 2. Get existing sessionIds for dedup ---
    const archivePath = path.join(queenbeeDir, 'experience-archive.jsonl');
    const existingSessionIds = new Set<string>();

    if (await fs.pathExists(archivePath)) {
      const existing = await fs.readFile(archivePath, 'utf-8');
      existing
        .split('\n')
        .filter(Boolean)
        .forEach(line => {
          try {
            const entry = JSON.parse(line);
            if (entry.sessionId) existingSessionIds.add(entry.sessionId);
          } catch { /* skip malformed */ }
        });
    }

    // --- 3. Process imported entries ---
    const archiveContent = files['experience-archive.jsonl'] || '';
    const lines = archiveContent
      .split('\n')
      .filter(Boolean);

    let imported = 0;
    let skipped  = 0;
    const newLines: string[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.sessionId && existingSessionIds.has(entry.sessionId)) {
          skipped++;
        } else {
          newLines.push(line);
          if (entry.sessionId) existingSessionIds.add(entry.sessionId);
          imported++;
        }
      } catch {
        skipped++;
      }
    }

    // --- 4. Append new entries ---
    if (newLines.length > 0) {
      await fs.appendFile(archivePath, newLines.join('\n') + '\n', 'utf-8');
    }

    return { imported, skipped };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Read all files from a ZIP buffer and return them as a name→content map.
   */
  private static readZipFromBuffer(buffer: Buffer): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const files: Record<string, string> = {};

      yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) {
          return reject(err || new Error('Failed to open zip buffer'));
        }

        zipfile.readEntry();

        zipfile.on('entry', (entry: yauzl.Entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry — skip
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr || !readStream) {
              return reject(streamErr || new Error('Failed to open entry stream'));
            }

            const chunks: Buffer[] = [];
            readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            readStream.on('end', () => {
              files[entry.fileName] = Buffer.concat(chunks).toString('utf-8');
              zipfile.readEntry();
            });
            readStream.on('error', reject);
          });
        });

        zipfile.on('end', () => resolve(files));
        zipfile.on('error', reject);
      });
    });
  }
}
