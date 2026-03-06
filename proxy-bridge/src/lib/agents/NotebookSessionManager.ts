import { NotebookSession } from './NotebookSession';

/**
 * Manages active NotebookSessions, allowing swarms to switch context
 * between different "notebooks" (collections of sources + memory).
 */
export class NotebookSessionManager {
  private sessions: Map<string, NotebookSession> = new Map();

  register(sessionId: string, session: NotebookSession) {
    this.sessions.set(sessionId, session);
  }

  get(sessionId: string): NotebookSession | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export const notebookSessionManager = new NotebookSessionManager();
