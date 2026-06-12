import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 40001,
    strictPort: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
