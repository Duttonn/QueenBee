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
}
