import { EventEmitter } from 'events';

export type ArchitectPhase = 'plan' | 'prompts' | 'launch';

class SessionManager extends EventEmitter {
  private threadControllers = new Map<string, AbortController>();
  private activeThreads = new Set<string>();
  private architectPhases = new Map<string, ArchitectPhase>();
  private providerMap = new Map<string, string>();
  private apiKeyMap = new Map<string, string>();
  private modelMap = new Map<string, string>();
  private pendingRoundtableMessages = new Map<string, string[]>();
  private swarmThreads = new Map<string, Set<string>>(); // swarmId -> Set<threadId>

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
    // NOTE: architectPhases intentionally NOT cleaned here — it must persist across requests.
    // Use cleanupFull() or abortThread() to wipe it.
    this.emit('thread_cleaned', threadId);
  }

  cleanupFull(threadId: string) {
    this.cleanup(threadId);
    this.architectPhases.delete(threadId);
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
      this.architectPhases.delete(threadId);
      this.emit('thread_aborted', threadId);
    }
  }

  getActiveThreads(): string[] {
    return Array.from(this.activeThreads);
  }

  getArchitectPhase(threadId: string): ArchitectPhase {
    return this.architectPhases.get(threadId) || 'plan';
  }

  setArchitectPhase(threadId: string, phase: ArchitectPhase) {
    this.architectPhases.set(threadId, phase);
  }

  getProvider(threadId: string): string | undefined {
    return this.providerMap.get(threadId);
  }

  setProvider(threadId: string, providerId: string) {
    this.providerMap.set(threadId, providerId);
  }

  getApiKey(threadId: string): string | undefined {
    return this.apiKeyMap.get(threadId);
  }

  setApiKey(threadId: string, apiKey: string) {
    this.apiKeyMap.set(threadId, apiKey);
  }

  getModel(threadId: string): string | undefined {
    return this.modelMap.get(threadId);
  }

  setModel(threadId: string, model: string) {
    this.modelMap.set(threadId, model);
  }
}

// Attach to globalThis to survive Next.js HMR reloads in dev mode
const globalForSession = globalThis as any;
export const sessionManager: SessionManager = globalForSession.__sessionManager || (globalForSession.__sessionManager = new SessionManager());