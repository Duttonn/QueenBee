/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GITHUB_CLIENT_ID: string;
    readonly VITE_API_URL: string;
    readonly VITE_SOCKET_URL: string;
    readonly VITE_APP_MODE: 'web' | 'app';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
