/**
 * App mode detection hook.
 * 
 * VITE_APP_MODE=web  → free web preview (no git, no local IDE, ZIP download only)
 * VITE_APP_MODE=app  → full desktop/paid experience (default)
 */

export type AppMode = 'web' | 'app';

const mode: AppMode = (import.meta.env.VITE_APP_MODE as AppMode) || 'app';

export function useAppMode() {
  return {
    mode,
    isWeb: mode === 'web',
    isApp: mode === 'app',
  };
}
