/**
 * P18-15: AstSearchTool — structural code search using @ast-grep/napi
 *
 * Enables pattern-matching on AST nodes across 25+ languages.
 * Supports `$VAR` meta-variables (matches any single node) and
 * `$$$VARS` (matches any sequence).
 *
 * Tools provided:
 *  - ast_search:  find all occurrences of a structural pattern
 *  - ast_rewrite: replace all occurrences of a structural pattern
 */

import fs from 'fs-extra';
import path from 'path';

// Language-specific parsers from @ast-grep/napi
type LangParser = {
  parse: (code: string) => { root: () => AstNode };
  findInFiles?: (config: any, callback: any) => Promise<void>;
};

type AstNode = {
  findAll: (rule: { rule: { pattern: string } }) => AstNode[];
  range: () => { start: { line: number; column: number; index: number }; end: { index: number } };
  text: () => string;
  replace: (replacement: string) => string;
};

/** Get language parser module from @ast-grep/napi. */
function getLangParser(language: string): LangParser {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@ast-grep/napi');
  const langMap: Record<string, LangParser> = {
    ts: mod.ts, tsx: mod.tsx,
    js: mod.js, jsx: mod.jsx,
    html: mod.html, css: mod.css,
  };
  return langMap[language.toLowerCase()] ?? mod.ts;
}

export interface AstMatch {
  file: string;
  line: number;
  column: number;
  text: string;
}

export interface AstRewriteResult {
  file: string;
  replacements: number;
}

/** Collect source files matching the language extension under rootDir. */
async function collectFiles(rootDir: string, language: string, subPath?: string): Promise<string[]> {
  const extMap: Record<string, string[]> = {
    ts: ['.ts'], tsx: ['.tsx'], js: ['.js'], jsx: ['.jsx'],
    html: ['.html'], css: ['.css'],
  };
  const exts = extMap[language.toLowerCase()] ?? ['.ts'];
  const searchRoot = subPath ? path.join(rootDir, subPath) : rootDir;
  if (!(await fs.pathExists(searchRoot))) return [];

  const files: string[] = [];
  const walk = async (dir: string) => {
    let entries: fs.Dirent[];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          await walk(full);
        }
      } else if (exts.some(ext => entry.name.endsWith(ext))) {
        files.push(full);
      }
    }
  };
  await walk(searchRoot);
  return files;
}

export class AstSearchTool {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Search for a structural pattern across files.
   * @param pattern - AST pattern with optional $VAR meta-variables
   * @param language - 'ts' | 'tsx' | 'js' | 'jsx' | 'html' | 'css'
   * @param subPath  - optional relative sub-path to restrict search
   * @param limit    - max results (default 50)
   */
  async search(
    pattern: string,
    language: string,
    subPath?: string,
    limit = 50
  ): Promise<AstMatch[]> {
    const files = await collectFiles(this.projectPath, language, subPath);
    if (files.length === 0) return [];

    const langParser = getLangParser(language);
    const matches: AstMatch[] = [];

    for (const file of files) {
      if (matches.length >= limit) break;
      try {
        const content = await fs.readFile(file, 'utf-8');
        const sg = langParser.parse(content);
        const root = sg.root();
        const found = root.findAll({ rule: { pattern } });

        for (const node of found) {
          if (matches.length >= limit) break;
          const range = node.range();
          const lines = content.split('\n');
          const lineText = lines[range.start.line] ?? '';
          matches.push({
            file: path.relative(this.projectPath, file),
            line: range.start.line + 1,
            column: range.start.column + 1,
            text: lineText.trim(),
          });
        }
      } catch {
        // Skip unparseable files
      }
    }

    return matches;
  }

  /**
   * Rewrite structural pattern in files (in-place).
   * Returns count of files modified and total replacements.
   */
  async rewrite(
    pattern: string,
    replacement: string,
    language: string,
    subPath?: string
  ): Promise<{ filesModified: number; totalReplacements: number; results: AstRewriteResult[] }> {
    const files = await collectFiles(this.projectPath, language, subPath);
    const results: AstRewriteResult[] = [];
    let totalReplacements = 0;

    const langParser = getLangParser(language);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const sg = langParser.parse(content);
        const root = sg.root();
        const found = root.findAll({ rule: { pattern } });

        if (found.length === 0) continue;

        // Apply replacements in reverse order to preserve byte offsets
        let newContent = content;
        const edits = found.map(node => {
          const range = node.range();
          return {
            start: range.start.index,
            end: range.end.index,
            text: node.replace(replacement),
          };
        }).sort((a, b) => b.start - a.start);

        for (const edit of edits) {
          newContent = newContent.slice(0, edit.start) + edit.text + newContent.slice(edit.end);
        }

        await fs.writeFile(file, newContent, 'utf-8');

        const count = found.length;
        totalReplacements += count;
        results.push({ file: path.relative(this.projectPath, file), replacements: count });
      } catch {
        // Skip files that fail
      }
    }

    return { filesModified: results.length, totalReplacements, results };
  }
}
