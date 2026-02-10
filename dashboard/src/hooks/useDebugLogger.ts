import { useEffect } from 'react';
import { useHiveStore } from '../store/useHiveStore';

/**
 * useDebugLogger: Global hook to provide transparency into frontend activity.
 * Logs socket events and state mutations to the browser console.
 */
export function useDebugLogger() {
  const store = useHiveStore();

  useEffect(() => {
    // 1. Initial State Log
    console.group('%c🐝 Queen Bee Debugger Initialized', 'color: #3b82f6; font-weight: bold; font-size: 12px;');
    console.log('[Store] Current Projects:', store.projects.length);
    console.log('[Store] Selected Project:', store.selectedProjectId);
    console.log('[Store] Active Thread:', store.activeThreadId);
    console.groupEnd();

    // 2. Intercept Socket Events (via monkey-patching or standard listeners if exposed)
    // For now, we'll rely on the existing socket instance if we can get it
    const socket = (store as any).socket;
    if (socket) {
      const originalEmit = socket.emit;
      socket.emit = function(event: string, ...args: any[]) {
        // Use console.debug to avoid infinite loop with App.tsx console.log relay
        console.debug(`%c[Socket OUT] %c${event}`, 'color: #10b981; font-weight: bold;', 'color: #374151;', ...args);
        return originalEmit.apply(this, [event, ...args]);
      };

      socket.onAny((event: string, ...args: any[]) => {
        console.debug(`%c[Socket IN] %c${event}`, 'color: #3b82f6; font-weight: bold;', 'color: #374151;', ...args);
      });
    }

    return () => {
      // Cleanup if needed
    };
  }, [store.socket]); // Only re-run if socket changes

  // 3. Log significant state changes
  useEffect(() => {
    if (store.selectedProjectId) {
      console.debug('%c[Store] Project Changed:', 'color: #f59e0b; font-weight: bold;', store.selectedProjectId);
    }
  }, [store.selectedProjectId]);

  useEffect(() => {
    if (store.activeThreadId) {
      console.debug('%c[Store] Thread Changed:', 'color: #f59e0b; font-weight: bold;', store.activeThreadId);
    }
  }, [store.activeThreadId]);
}
