import { EventEmitter } from 'events';

class SessionManager extends EventEmitter {
  private threadControllers = new Map<string, AbortController>();
  private activeThreads = new Set<string>();

  register(threadId: string) {
    this.activeThreads.add(threadId);
    if (!this.threadControllers.has(threadId)) {
      this.threadControllers.set(threadId, new AbortController());
    }
    this.emit('thread_registered', threadId);
  }

  cleanup(threadId: string) {
    this.activeThreads.delete(threadId);
    this.threadControllers.delete(threadId);
    this.emit('thread_cleaned', threadId);
  }

  isAborted(threadId: string): boolean {
    const controller = this.threadControllers.get(threadId);
    return controller ? controller.signal.aborted : false;
  }

  getSignal(threadId: string): AbortSignal {
    if (!this.threadControllers.has(threadId)) {
      this.threadControllers.set(threadId, new AbortController());
    }
    return this.threadControllers.get(threadId)!.signal;
  }

  abortThread(threadId: string) {
    const controller = this.threadControllers.get(threadId);
    if (controller) {
      controller.abort();
      this.threadControllers.delete(threadId);
      this.activeThreads.delete(threadId);
      this.emit('thread_aborted', threadId);
    }
  }

  getActiveThreads(): string[] {
    return Array.from(this.activeThreads);
  }
}

export const sessionManager = new SessionManager();