import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist-electron',
    emptyOutDir: true,
    target: 'node18',
    rollupOptions: {
      external: ['electron', 'path', 'url'],
      input: {
        main: path.resolve(__dirname, 'main.ts'),
        preload: path.resolve(__dirname, 'preload.ts')
      },
      output: {
        format: 'esm',
        entryFileNames: '[name].js'
      }
    }
  }
})
