/**
 * P18-01: HashlineIndex — per-line content-hash index for surgical edits
 *
 * Pattern from oh-my-opencode: before editing, read_file returns a hash per line.
 * The agent passes those hashes back with hashline_edit to prove it's patching
 * the correct version of the file. Any stale hash causes the edit to fail rather
 * than silently clobber concurrent changes — lifting edit success from ~7% → ~68%.
 */

import crypto from 'crypto';
import fs from 'fs-extra';

export interface LineEntry {
  lineNumber: number; // 1-indexed
  hash: string;       // SHA-256 (hex, first 12 chars) of the line content
  content: string;
}

export interface HashlineEditOperation {
  lineNumber: number; // 1-indexed line to replace
  expectedHash: string; // Must match current hash of that line
  newContent: string;   // Replacement content (use '' to delete the line)
}

export interface HashlineEditResult {
  success: boolean;
  appliedCount: number;
  failedOps: Array<{ lineNumber: number; reason: string }>;
  newContent?: string;
}

/** Compute a short SHA-256 hash of a string (first 12 hex chars). */
function hashLine(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

/** Build a line-hash index from raw file content. */
export function buildIndex(content: string): LineEntry[] {
  return content.split('\n').map((line, idx) => ({
    lineNumber: idx + 1,
    hash: hashLine(line),
    content: line,
  }));
}

/**
 * Read a file and return its lines annotated with content hashes.
 * The agent passes these hashes back in hashline_edit to validate changes.
 */
export async function indexFile(absolutePath: string): Promise<LineEntry[]> {
  const content = await fs.readFile(absolutePath, 'utf-8');
  return buildIndex(content);
}

/**
 * Apply a set of line-level edits to a file, validating that each line's
 * current hash matches the expected hash before patching.
 *
 * Ops are sorted by lineNumber descending so that earlier-line edits don't
 * shift subsequent line numbers during application.
 */
export async function applyHashlineEdits(
  absolutePath: string,
  ops: HashlineEditOperation[]
): Promise<HashlineEditResult> {
  const content = await fs.readFile(absolutePath, 'utf-8');
  const lines = content.split('\n');

  const failedOps: Array<{ lineNumber: number; reason: string }> = [];
  const validOps: HashlineEditOperation[] = [];

  // Validate all ops first
  for (const op of ops) {
    const idx = op.lineNumber - 1;
    if (idx < 0 || idx >= lines.length) {
      failedOps.push({ lineNumber: op.lineNumber, reason: `Line ${op.lineNumber} out of range (file has ${lines.length} lines)` });
      continue;
    }
    const currentHash = hashLine(lines[idx]);
    if (currentHash !== op.expectedHash) {
      failedOps.push({
        lineNumber: op.lineNumber,
        reason: `Hash mismatch at line ${op.lineNumber}: expected ${op.expectedHash}, got ${currentHash}. Re-read the file first.`,
      });
      continue;
    }
    validOps.push(op);
  }

  if (failedOps.length > 0) {
    return { success: false, appliedCount: 0, failedOps };
  }

  // Apply ops in reverse line order to preserve line numbers
  const sorted = [...validOps].sort((a, b) => b.lineNumber - a.lineNumber);
  for (const op of sorted) {
    const idx = op.lineNumber - 1;
    if (op.newContent === '') {
      lines.splice(idx, 1); // Delete line
    } else {
      lines[idx] = op.newContent; // Replace line
    }
  }

  const newContent = lines.join('\n');
  await fs.writeFile(absolutePath, newContent, 'utf-8');

  return {
    success: true,
    appliedCount: validOps.length,
    failedOps: [],
    newContent,
  };
}
