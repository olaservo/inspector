import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'
import type { ModuleFormat } from 'rollup'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv) => {
  const isMainProcess = mode === 'main'
  
  return {
    build: {
      outDir: 'dist-electron',
      emptyOutDir: isMainProcess, // Only clean on main process build
      target: 'node18',
      rollupOptions: {
        external: ['electron', 'path', 'url'],
        input: path.resolve(__dirname, isMainProcess ? 'main.ts' : 'preload.ts'),
        output: {
          format: (isMainProcess ? 'es' : 'cjs') as ModuleFormat,
          entryFileNames: isMainProcess ? 'main.js' : 'preload.cjs'
        }
      }
    }
  }
})
