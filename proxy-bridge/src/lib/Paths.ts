import path from 'path';
import os from 'os';

/**
 * Paths: Central utility for resolving system paths.
 * Fixes hardcoded /home/fish paths.
 */
export class Paths {
  /**
   * Resolves the Codex home directory.
   * Priority: CODEX_HOME env var > ~/.codex
   */
  static getCodexHome(): string {
    if (process.env.CODEX_HOME) {
      return path.resolve(process.env.CODEX_HOME);
    }
    return path.join(os.homedir(), '.codex');
  }

  /**
   * Resolves the Hive state file path.
   */
  static getHiveStatePath(): string {
    return path.join(this.getCodexHome(), 'hive_state.json');
  }

  /**
   * Resolves the Auth storage path (Keyring).
   */
  static getAuthPath(): string {
    return path.join(this.getCodexHome(), 'auth.json');
  }

  /**
   * Resolves the User States directory.
   */
  static getUserStatesDir(): string {
    return path.join(this.getCodexHome(), 'user_states');
  }

  /**
   * Resolves the Search Index path.
   */
  static getSearchIndexPath(): string {
    return path.join(this.getCodexHome(), 'search_index.json');
  }

  /**
   * Resolves the Backups directory.
   */
  static getBackupDir(): string {
    return path.join(this.getCodexHome(), 'backups');
  }

  /**
   * Resolves the Config file path.
   */
  static getConfigPath(): string {
    return path.join(this.getCodexHome(), 'config.yaml');
  }

  /**
   * Resolves the GitHub Token path.
   */
  static getGitHubTokenPath(): string {
    return path.join(this.getCodexHome(), 'github-token.json');
  }

  /**
   * Resolves the Auth Profiles path.
   */
  static getAuthProfilesPath(): string {
    return path.join(this.getCodexHome(), 'auth-profiles.json');
  }

  /**
   * Resolves the workspace root (parent of proxy-bridge).
   */
  static getWorkspaceRoot(): string {
    return path.resolve(process.cwd(), '..');
  }

  /**
   * Resolves the GSD_TASKS.md path.
   */
  static getGSDTasksPath(): string {
    return path.join(this.getWorkspaceRoot(), 'GSD_TASKS.md');
  }

  /**
   * Resolves the worktrees directory.
   */
  static getWorktreesDir(): string {
    return path.join(this.getWorkspaceRoot(), 'worktrees');
  }

  /**
   * Resolves the shared data directory.
   */
  static getDataDir(): string {
    return path.join(this.getWorkspaceRoot(), 'data');
  }

  /**
   * Resolves the logs directory.
   */
  static getLogsDir(): string {
    return path.join(process.cwd(), 'logs');
  }

  /**
   * Resolves the local data directory inside proxy-bridge.
   */
  static getProxyBridgeDataDir(): string {
    return path.join(process.cwd(), 'data');
  }

  /**
   * Resolves the root of the proxy-bridge Next.js app.
   */
  static getProxyBridgeRoot(): string {
    return process.cwd();
  }
}