import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: '../electron/main.ts', // Correct path relative to vite.config.ts
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'], // Only electron is external
              output: {
                format: 'cjs', // Force CommonJS output for main process
              },
            },
          },
        },
      },
      {
        entry: '../electron/preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete.
          options.reload()
        },
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
})