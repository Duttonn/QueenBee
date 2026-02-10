import fs from 'fs-extra';
import path from 'path';

export interface StyleSample {
  path: string;
  content: string;
}

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'vendor', '.next', 'coverage', '__pycache__']);

async function findFilesByExtension(dir: string, ext: string, limit: number, results: string[] = []): Promise<string[]> {
  if (results.length >= limit) return results;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= limit) break;
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          await findFilesByExtension(fullPath, ext, limit, results);
        }
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return results;
}

export class StyleScraper {
  /**
   * Scrapes stylistic samples from the project based on file extension.
   */
  static async getSamples(projectPath: string, targetFile: string, limit: number = 2): Promise<StyleSample[]> {
    const ext = path.extname(targetFile);
    if (!ext) return [];

    console.log(`[StyleScraper] Scraping style samples for *${ext} in ${projectPath}...`);

    try {
      const files = await findFilesByExtension(projectPath, ext, limit + 5);
      const filteredFiles = files.filter(f => !f.endsWith(targetFile));

      const samples: StyleSample[] = [];
      for (const filePath of filteredFiles.slice(0, limit)) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const snippet = lines.length > 50
          ? lines.slice(0, 50).join('\n') + '\n... (truncated)'
          : content;

        samples.push({
          path: path.relative(projectPath, filePath),
          content: snippet
        });
      }

      return samples;
    } catch (error) {
      console.error('[StyleScraper] Failed to scrape samples:', error);
      return [];
    }
  }

  /**
   * Formats samples for inclusion in a system prompt.
   */
  static formatForPrompt(samples: StyleSample[]): string {
    if (samples.length === 0) return '';

    let output = '\n# USER STYLE SAMPLES (Mimic this structure/formatting)\n';
    for (const sample of samples) {
      output += `\nFILE: ${sample.path}\n\`\`\`\n${sample.content}\n\`\`\`\n`;
    }
    return output;
  }
}
