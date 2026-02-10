import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolExecutor } from '../ToolExecutor';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';

// Mock dependencies
vi.mock('../socket-instance', () => ({
  broadcast: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, callback) => {
    if (typeof opts === 'function') {
      opts(null, 'mock output', '');
    } else if (callback) {
      callback(null, 'mock output', '');
    }
    return { stdout: { on: vi.fn() }, stderr: { on: vi.fn() }, on: vi.fn() };
  }),
}));

describe('ToolExecutor - Trinity Upgrade', () => {
  let executor: ToolExecutor;
  const projectPath = path.resolve('./test-project-executor');

  beforeEach(async () => {
    executor = new ToolExecutor();
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    vi.clearAllMocks();
  });

  describe('run_shell (Atomic Tool Resilience)', () => {
    it('should execute a simple command directly', async () => {
      const tool = {
        name: 'run_shell',
        arguments: { command: 'ls' },
        id: 'call-1'
      };
      
      await executor.execute(tool, { projectPath });
      
      expect(exec).toHaveBeenCalledWith('ls', expect.any(Object), expect.any(Function));
    });

    it('should use a temporary script for complex commands (ghostwriter pattern)', async () => {
      const complexCommand = `cat <<EOF > test.txt\nline1\nline2\nEOF`;
      const tool = {
        name: 'run_shell',
        arguments: { command: complexCommand },
        id: 'call-2'
      };
      
      await executor.execute(tool, { projectPath });
      
      // Check if exec was called with a script execution
      const lastCall = (exec as any).mock.calls.find((call: any[]) => typeof call[0] === 'string' && call[0].startsWith('./agent_cmd_'));
      expect(lastCall).toBeDefined();
      expect(lastCall[0]).toMatch(/\.\/agent_cmd_\d+\.sh/);
    });
  });

  describe('read_file (Semantic Context Pruning)', () => {
    it('should return full content for small files', async () => {
      const smallFilePath = path.join(projectPath, 'small.txt');
      await fs.writeFile(smallFilePath, 'small content');
      
      const tool = {
        name: 'read_file',
        arguments: { path: 'small.txt' },
        id: 'call-3'
      };
      
      const result = await executor.execute(tool, { projectPath });
      expect(result).toBe('small content');
    });

    it('should return a symbol map for large files (>200 lines)', async () => {
      const largeFilePath = path.join(projectPath, 'large.ts');
      const lines = Array.from({ length: 250 }, (_, i) => `export function func${i}() {}`);
      await fs.writeFile(largeFilePath, lines.join('\n'));
      
      const tool = {
        name: 'read_file',
        arguments: { path: 'large.ts' },
        id: 'call-4'
      };
      
      const result = await executor.execute(tool, { projectPath });
      expect(result).toContain('FILE SUMMARY');
      expect(result).toContain('Symbol Map:');
      expect(result).toContain('Line 1: export function func0() {}');
    });

    it('should support read_file_range for targeted reading', async () => {
      const filePath = path.join(projectPath, 'range.txt');
      const lines = ['line1', 'line2', 'line3', 'line4', 'line5'];
      await fs.writeFile(filePath, lines.join('\n'));
      
      const tool = {
        name: 'read_file_range',
        arguments: { path: 'range.txt', start: 2, end: 4 },
        id: 'call-5'
      };
      
      const result = await executor.execute(tool, { projectPath });
      expect(result).toBe('line2\nline3\nline4');
    });
  });
});