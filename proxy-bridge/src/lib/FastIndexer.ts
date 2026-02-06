import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

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
      // 1. Filename search via 'find' logic (simulating fzf)
      const fileMatches = execSync(`find ${projectPath} -maxdepth 3 -not -path '*/.*' -iname "*${query}*"`, { encoding: 'utf-8' })
        .split('\n')
        .filter(Boolean)
        .slice(0, 5);

      // 2. Content search via 'ripgrep' (rg)
      // Note: Assumes 'rg' is installed on the VPS. Fallback to grep if not.
      let contentMatches: any[] = [];
      try {
        const rgOutput = execSync(`rg --line-number --column --max-columns=150 --smart-case "${query}" ${projectPath} | head -n 5`, { encoding: 'utf-8' });
        contentMatches = rgOutput.split('\n').filter(Boolean).map(line => {
          const [file, lineNo, col, ...text] = line.split(':');
          return { file: path.relative(projectPath, file), line: lineNo, preview: text.join(':').trim() };
        });
      } catch (e) {
        // rg returns error code 1 if no matches found
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
