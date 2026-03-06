/**
 * CodemapService — Persistent codebase map
 *
 * Maintains `.queenbee/codemap.json` with file tree + module descriptions.
 * Scans .ts/.tsx/.js/.jsx files, extracts exports, JSDoc summaries, and line counts.
 */

import fs from 'fs-extra';
import path from 'path';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface CodemapEntry {
  filePath: string;
  exports: string[];
  description: string;
  lineCount: number;
  updatedAt: string;
}

export interface Codemap {
  rootDir: string;
  builtAt: string;
  entries: Record<string, CodemapEntry>;
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.queenbee', '.cache',
  'coverage', '.turbo', '.vercel',
]);

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const EXPORT_RE = /export\s+(?:async\s+)?(?:function|class|interface|const|type|abstract\s+class)\s+(\w+)/g;

const JSDOC_RE = /\/\*\*([\s\S]*?)\*\//;

/* ─── Service ───────────────────────────────────────────────────────── */

export class CodemapService {
  private map: Codemap | null = null;
  private defaultRoot: string;

  constructor(defaultRoot?: string) {
    this.defaultRoot = defaultRoot || process.cwd();
  }

  /* ── Build full codemap ─────────────────────────────────────────── */

  async buildCodemap(rootDir?: string): Promise<Codemap> {
    const root = rootDir || this.defaultRoot;
    const entries: Record<string, CodemapEntry> = {};

    await this.scanDir(root, root, entries);

    this.map = {
      rootDir: root,
      builtAt: new Date().toISOString(),
      entries,
    };

    await this.persist(root);
    return this.map;
  }

  /* ── Update single entry ────────────────────────────────────────── */

  async updateEntry(filePath: string, content: string): Promise<void> {
    if (!this.map) {
      await this.loadFromDisk(this.defaultRoot);
    }
    if (!this.map) {
      this.map = {
        rootDir: this.defaultRoot,
        builtAt: new Date().toISOString(),
        entries: {},
      };
    }

    const relPath = path.relative(this.map.rootDir, filePath);
    const entry = this.parseFileContent(relPath, content);
    this.map.entries[relPath] = entry;

    await this.persist(this.map.rootDir);
  }

  /* ── Set active root ────────────────────────────────────────────── */

  setRoot(rootDir: string): void {
    if (rootDir !== this.defaultRoot) {
      this.defaultRoot = rootDir;
      this.map = null; // force reload for new root
    }
  }

  /* ── Get current map ────────────────────────────────────────────── */

  async getCodemap(): Promise<Codemap | null> {
    if (this.map) return this.map;
    await this.loadFromDisk(this.defaultRoot);
    return this.map;
  }

  /* ── Private helpers ────────────────────────────────────────────── */

  private async scanDir(
    dir: string,
    rootDir: string,
    entries: Record<string, CodemapEntry>,
  ): Promise<void> {
    let items: string[];
    try {
      items = await fs.readdir(dir);
    } catch {
      return;
    }

    for (const item of items) {
      if (SKIP_DIRS.has(item)) continue;

      const fullPath = path.join(dir, item);
      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        await this.scanDir(fullPath, rootDir, entries);
      } else if (CODE_EXTENSIONS.has(path.extname(item))) {
        const relPath = path.relative(rootDir, fullPath);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          entries[relPath] = this.parseFileContent(relPath, content);
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  private parseFileContent(relPath: string, content: string): CodemapEntry {
    // Extract exports
    const exports: string[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(EXPORT_RE.source, 'g');
    while ((match = re.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Extract first JSDoc summary
    const jsdocMatch = content.match(JSDOC_RE);
    let description = '';
    if (jsdocMatch) {
      const body = jsdocMatch[1];
      const lines = body
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .filter((l) => l.length > 0);
      // Take first non-@ line, or first line overall
      const summaryLine = lines.find((l) => !l.startsWith('@')) || lines[0] || '';
      description = summaryLine;
    }

    return {
      filePath: relPath,
      exports,
      description,
      lineCount: content.split('\n').length,
      updatedAt: new Date().toISOString(),
    };
  }

  private codemapPath(rootDir: string): string {
    return path.join(rootDir, '.queenbee', 'codemap.json');
  }

  private async persist(rootDir: string): Promise<void> {
    if (!this.map) return;
    const filePath = this.codemapPath(rootDir);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, this.map, { spaces: 2 });
  }

  private async loadFromDisk(rootDir: string): Promise<void> {
    const filePath = this.codemapPath(rootDir);
    if (await fs.pathExists(filePath)) {
      try {
        this.map = await fs.readJson(filePath);
      } catch {
        this.map = null;
      }
    }
  }
}

/* ─── Singleton ─────────────────────────────────────────────────────── */

export const codemapService = new CodemapService();
