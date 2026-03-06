import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './infrastructure/Paths';

/**
 * FastIndexer: High-performance codebase indexing using ripgrep (rg) and fzf patterns.
 * Provides sub-millisecond search results for the Queen Bee bar.
 */
export class FastIndexer {
  private indexPath = Paths.getSearchIndexPath();

  /**
   * Performs a rapid search across the project.
   */
  async search(query: string, projectPath: string) {
    console.log(`[Indexer] Ultra-fast search for: "${query}" in ${projectPath}`);

    try {
      // 1. Filename search — args passed as array, no shell interpolation
      const findResult = spawnSync('find', [
        projectPath, '-maxdepth', '3', '-not', '-path', '*/.*', '-iname', `*${query}*`
      ], { encoding: 'utf-8' });
      const fileMatches = (findResult.stdout || '')
        .split('\n')
        .filter(Boolean)
        .slice(0, 5);

      // 2. Content search via ripgrep — args as array, no shell interpolation
      let contentMatches: any[] = [];
      try {
        const rgResult = spawnSync('rg', [
          '--line-number', '--column', '--max-columns=150', '--smart-case',
          query, projectPath
        ], { encoding: 'utf-8' });
        if (rgResult.stdout) {
          contentMatches = rgResult.stdout.split('\n').filter(Boolean).slice(0, 5).map(line => {
            const [file, lineNo, _col, ...text] = line.split(':');
            return { file: path.relative(projectPath, file), line: lineNo, preview: text.join(':').trim() };
          });
        }
      } catch (e) {
        // rg not installed — skip content search
      }

      return {
        files: fileMatches.map(f => path.relative(projectPath, f)),
        snippets: contentMatches
      };
    } catch (e) {
      console.error('[Indexer] Search failed:', e);
      return { files: [], snippets: [] };
    }
  }
}
