import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const isElectron = process.env.VITE_ELECTRON === 'true'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const electronPlugins: any[] = []

  if (isElectron) {
    const { default: electron } = await import('vite-plugin-electron')
    const { default: renderer } = await import('vite-plugin-electron-renderer')
    electronPlugins.push(
      electron([
        {
          entry: '../electron/main.ts',
          onstart(args: any) {
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
          onstart(options: any) {
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
    )
  }

  return {
    base: isElectron ? './' : '/',
    plugins: [
      react(),
      ...electronPlugins,
    ],
  }
})