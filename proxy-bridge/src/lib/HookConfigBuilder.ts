import fs from 'fs-extra';

export interface HookSpec {
  type: 'formatter' | 'typecheck' | 'console_log_audit' | 'block_md_creation' | 'custom';
  name: string;
  description: string;
  event: 'PreToolUse' | 'PostToolUse' | 'Stop';
  matcher?: string;
  command: string;
}

class HookConfigBuilder {
  private specs: HookSpec[] = [];

  static getPresets(): HookSpec[] {
    return [
      {
        type: 'formatter',
        name: 'Prettier Auto-Format',
        description: 'Run Prettier after every TypeScript/JavaScript file edit',
        event: 'PostToolUse',
        matcher: 'Edit|Write',
        command: 'if echo "$CLAUDE_TOOL_INPUT" | grep -qE "\\.(ts|tsx|js|jsx)\\""; then prettier --write "$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\'path\') or d.get(\'file_path\',\'\'))")" 2>/dev/null || true; fi'
      },
      {
        type: 'typecheck',
        name: 'TypeScript Check',
        description: 'Run tsc --noEmit after TypeScript edits to catch type errors',
        event: 'PostToolUse',
        matcher: 'Edit|Write',
        command: 'if echo "$CLAUDE_TOOL_INPUT" | grep -qE "\\.(ts|tsx)\\""; then tsc --noEmit 2>&1 | head -20 || true; fi'
      },
      {
        type: 'console_log_audit',
        name: 'Console.log Audit',
        description: 'Warn if modified files contain console.log statements',
        event: 'Stop',
        command: 'git diff --name-only HEAD 2>/dev/null | grep -E "\\.(ts|tsx|js|jsx)$" | xargs grep -l "console\\.log" 2>/dev/null | while read f; do echo "WARNING: console.log found in $f"; done'
      },
      {
        type: 'block_md_creation',
        name: 'Block Unnecessary Markdown',
        description: 'Warn before creating .md documentation files',
        event: 'PreToolUse',
        matcher: 'Write',
        command: 'if echo "$CLAUDE_TOOL_INPUT" | grep -qE "\\.md\\""; then echo "WARNING: Creating markdown file. Ensure this is explicitly requested." >&2; fi'
      }
    ];
  }

  addHook(spec: HookSpec): this {
    this.specs.push(spec);
    return this;
  }

  addPreset(type: HookSpec['type']): this {
    const preset = HookConfigBuilder.getPresets().find(p => p.type === type);
    if (preset) this.specs.push(preset);
    return this;
  }

  toHooksJson(): Record<string, any[]> {
    const hooks: Record<string, any[]> = {};

    for (const spec of this.specs) {
      if (!hooks[spec.event]) hooks[spec.event] = [];
      const entry: any = { hooks: [{ type: 'command', command: spec.command }] };
      if (spec.matcher) entry.matcher = spec.matcher;
      hooks[spec.event].push(entry);
    }

    return hooks;
  }

  async mergeIntoSettings(settingsPath: string): Promise<void> {
    let settings: any = {};
    if (await fs.pathExists(settingsPath)) {
      settings = await fs.readJson(settingsPath);
    }
    settings.hooks = this.toHooksJson();
    await fs.writeJson(settingsPath, settings, { spaces: 2 });
  }
}

export { HookConfigBuilder };
export const hookConfigBuilder = new HookConfigBuilder();
