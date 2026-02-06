import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { execSync } from 'child_process'

const isElectron = process.env.VITE_ELECTRON === 'true'

// https://vitejs.dev/config/
export default defineConfig({
  base: isElectron ? './' : '/',
  plugins: [
    react(),
    ...(isElectron ? [
      electron([
        {
          // Main-Process entry file of the Electron App.
          entry: '../electron/main.ts',
          onstart(args) {
            // Fix SyntaxError in Dev Mode: Remove 'export default' from generated .cjs
            try {
              execSync("sed -i '' 's/export default //g' dist-electron/main.cjs dist-electron/preload.cjs")
            } catch (e) {
              console.error('Failed to patch Electron files', e)
            }
            args.startup()
          },
          vite: {
            build: {
              minify: false,
              rollupOptions: {
                external: ['electron'],
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].cjs',
                  exports: 'none',
                  interop: 'auto',
                },
              },
            },
          },
        },
        {
          entry: '../electron/preload.ts',
          onstart(options) {
            try {
              execSync("sed -i '' 's/export default //g' dist-electron/preload.cjs")
            } catch (e) {}
            options.reload()
          },
          vite: {
            build: {
              minify: false,
              rollupOptions: {
                external: ['electron'],
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].cjs',
                  exports: 'none',
                  interop: 'auto',
                },
              },
            },
          },
        },
      ]),
      renderer(),
    ] : []),
  ],
})