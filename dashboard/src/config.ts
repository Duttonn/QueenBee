/**
 * Centralized API configuration for Queen Bee Dashboard
 */
export const API_BASE = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://127.0.0.1:3000';
export const API_BASE_WS = API_BASE.replace(/^http/, 'ws');
