/**
 * P19-08: Session Continuity Export
 * 
 * Exports full session context in formats compatible with Claude Code, Cursor, Gemini, Copilot.
 * Based on cli-continues pattern (yigitkonur/cli-continues).
 */

import fs from 'fs-extra';
import path from 'path';

export interface SessionExportOptions {
  sessionId: string;
  format: 'claude-code' | 'cursor' | 'generic';
}

/**
 * Export session for Claude Code (CONTINUATION.md format)
 */
export async function exportForClaudeCode(projectPath: string, sessionId: string): Promise<string> {
  const sessionsDir = path.join(projectPath, '.queenbee', 'sessions');
  const sessionFile = path.join(sessionsDir, `${sessionId}.jsonl`);
  
  if (!await fs.pathExists(sessionFile)) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const lines = (await fs.readFile(sessionFile, 'utf-8')).split('\n').filter(l => l.trim());
  
  // Extract key information
  const messages: Array<{ role: string; content: string }> = [];
  let task = '';
  const triedApproaches: string[] = [];
  const blockers: string[] = [];
  const fileManifest: string[] = [];

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      messages.push(msg);
      
      // Extract task from first user message
      if (!task && msg.role === 'user') {
        task = msg.content?.slice(0, 200) || '';
      }
      
      // Extract tried approaches and blockers from assistant messages
      if (msg.role === 'assistant' && msg.content) {
        const content = msg.content;
        
        // Look for common patterns
        if (content.includes('tried') || content.includes('attempted')) {
          triedApproaches.push(content.slice(0, 300));
        }
        if (content.includes('blocked') || content.includes('cannot') || content.includes('error')) {
          blockers.push(content.slice(0, 300));
        }
      }
      
      // Extract file paths from tool calls
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.arguments?.filePath) {
            fileManifest.push(tc.arguments.filePath);
          }
        }
      }
    } catch { /* skip malformed */ }
  }

  // Build CONTINUATION.md
  const md = [
    `# Session Continuation`,
    ``,
    `## Task`,
    task || '(No explicit task description)',
    ``,
    `## Tried Approaches`,
    triedApproaches.length > 0 
      ? triedApproaches.slice(0, 5).map((a, i) => `${i + 1}. ${a}`).join('\n')
      : 'No approaches recorded yet.',
    ``,
    `## Current Blockers`,
    blockers.length > 0
      ? blockers.slice(0, 3).map((b, i) => `${i + 1}. ${b}`).join('\n')
      : 'None identified.',
    ``,
    `## Relevant Files`,
    [...new Set(fileManifest)].slice(0, 20).join('\n') || '(No files modified)',
  ];

  return md.join('\n');
}

/**
 * Export session for Cursor (.cursor/context.json format)
 */
export async function exportForCursor(projectPath: string, sessionId: string): Promise<string> {
  const sessionsDir = path.join(projectPath, '.queenbee', 'sessions');
  const sessionFile = path.join(sessionsDir, `${sessionId}.jsonl`);
  
  if (!await fs.pathExists(sessionFile)) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const lines = (await fs.readFile(sessionFile, 'utf-8')).split('\n').filter(l => l.trim());
  
  const conversations: Array<{ role: string; content: string }> = [];
  const contextFiles: string[] = [];

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      if (msg.role && msg.content) {
        conversations.push({ role: msg.role, content: msg.content?.slice(0, 2000) });
      }
      
      // Extract files for Cursor context
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.arguments?.filePath) {
            contextFiles.push(tc.arguments.filePath);
          }
        }
      }
    } catch { /* skip */ }
  }

  // Cursor format
  const cursorContext = {
    version: 1,
    sessionId,
    conversations,
    contextFiles: [...new Set(contextFiles)],
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(cursorContext, null, 2);
}

/**
 * Export session in generic JSON format
 */
export async function exportGeneric(projectPath: string, sessionId: string): Promise<string> {
  const sessionsDir = path.join(projectPath, '.queenbee', 'sessions');
  const sessionFile = path.join(sessionsDir, `${sessionId}.jsonl`);
  
  if (!await fs.pathExists(sessionFile)) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const lines = (await fs.readFile(sessionFile, 'utf-8')).split('\n').filter(l => l.trim());
  const messages = [];

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch { /* skip */ }
  }

  return JSON.stringify({ sessionId, messages, exportedAt: new Date().toISOString() }, null, 2);
}

/**
 * Main export function
 */
export async function exportSession(projectPath: string, sessionId: string, format: 'claude-code' | 'cursor' | 'generic' = 'generic'): Promise<string> {
  switch (format) {
    case 'claude-code':
      return exportForClaudeCode(projectPath, sessionId);
    case 'cursor':
      return exportForCursor(projectPath, sessionId);
    case 'generic':
    default:
      return exportGeneric(projectPath, sessionId);
  }
}
