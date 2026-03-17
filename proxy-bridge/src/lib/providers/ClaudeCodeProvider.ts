import { LLMProvider } from '../LLMProvider';
import { LLMMessage, LLMProviderOptions, LLMResponse } from '../types/llm';
import { spawnSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * ClaudeCodeProvider
 *
 * Powers QueenBee with a Claude.ai subscription (no API key required).
 * Uses the official @anthropic-ai/claude-agent-sdk which spawns the
 * locally-installed `claude` binary. Auth is inherited from `claude auth login`.
 *
 * Compatible with: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5
 */
export class ClaudeCodeProvider extends LLMProvider {
  id = 'claude-code';

  /** Returns true if credentials exist OR the claude binary is findable. */
  hasKey(): boolean {
    // Claude Code stores credentials in ~/.config/claude/ (OAuth login)
    // Older API-key flow used ~/.config/anthropic/
    const configDirs = [
      path.join(os.homedir(), '.config', 'claude'),
      path.join(os.homedir(), '.config', 'anthropic'),
    ];
    for (const configDir of configDirs) {
      if (fs.existsSync(configDir)) {
        try {
          const files = fs.readdirSync(configDir);
          if (files.some(f => { try { return fs.statSync(path.join(configDir, f)).size > 0; } catch { return false; } })) {
            return true;
          }
        } catch {}
      }
    }
    // Fallback: check binary in extended PATH (homebrew, npm-global)
    const extPath = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH ?? ''}`;
    const result = spawnSync('which', ['claude'], { encoding: 'utf-8', env: { ...process.env, PATH: extPath } });
    return result.status === 0;
  }

  /** Locate the `claude` binary (PATH or common install locations). */
  private findClaudeBinary(): string | undefined {
    // Check absolute paths directly (which only works for bare names in PATH)
    const absoluteCandidates = [
      path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
      '/usr/bin/claude',
      path.join(os.homedir(), '.local', 'bin', 'claude'),
    ];
    for (const c of absoluteCandidates) {
      try {
        fs.accessSync(c, fs.constants.X_OK);
        return c;
      } catch {}
    }
    // Fall back to PATH resolution
    const extPath = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH ?? ''}`;
    const r = spawnSync('which', ['claude'], { encoding: 'utf-8', env: { ...process.env, PATH: extPath } });
    if (r.status === 0 && r.stdout?.trim()) return r.stdout.trim();
    return 'claude'; // let the SDK resolve via PATH
  }

  /** Convert LLMMessage[] into a single prompt string for the SDK. */
  private formatMessages(messages: LLMMessage[]): string {
    const lines: string[] = [];
    for (const m of messages) {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      if (m.role === 'system') {
        lines.push(`<system>\n${content}\n</system>`);
      } else if (m.role === 'user') {
        lines.push(`Human: ${content}`);
      } else if (m.role === 'assistant') {
        lines.push(`Assistant: ${content}`);
      }
    }
    return lines.join('\n\n');
  }

  async chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse> {
    const { unstable_v2_prompt } = await import('@anthropic-ai/claude-agent-sdk');
    const prompt = this.formatMessages(messages);
    const model = options?.model || 'claude-opus-4-6';

    const result = await unstable_v2_prompt(prompt, {
      model,
      pathToClaudeCodeExecutable: this.findClaudeBinary(),
      env: { ...process.env } as Record<string, string>,
    });

    if (result.type !== 'result') {
      throw new Error(`[ClaudeCode] Unexpected response type: ${(result as any).type}`);
    }
    if (result.subtype !== 'success') {
      throw new Error(`[ClaudeCode] Error subtype '${result.subtype}'`);
    }

    const successResult = result as import('@anthropic-ai/claude-agent-sdk').SDKResultSuccess;
    return {
      id: `claude-code-${Date.now()}`,
      model,
      content: successResult.result,
      usage: {
        prompt_tokens: successResult.usage?.input_tokens ?? 0,
        completion_tokens: successResult.usage?.output_tokens ?? 0,
        total_tokens: (successResult.usage?.input_tokens ?? 0) + (successResult.usage?.output_tokens ?? 0),
      },
    };
  }

  async *chatStream(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse> {
    const { unstable_v2_createSession } = await import('@anthropic-ai/claude-agent-sdk');
    const model = options?.model || 'claude-opus-4-6';
    const prompt = this.formatMessages(messages);

    await using session = unstable_v2_createSession({
      model,
      pathToClaudeCodeExecutable: this.findClaudeBinary(),
      env: { ...process.env } as Record<string, string>,
    });

    await session.send(prompt);

    for await (const msg of session.stream()) {
      if (msg.type === 'stream_event') {
        const event = (msg as any).event;
        if (event?.type === 'content_block_delta' && event?.delta?.type === 'text_delta') {
          yield {
            id: `claude-code-stream-${Date.now()}`,
            model,
            content: event.delta.text,
          };
        }
      } else if (msg.type === 'result' && msg.subtype === 'success') {
        // Final result — emit any remaining content not already streamed
      }
    }
  }
}
