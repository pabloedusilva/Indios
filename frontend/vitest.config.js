import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Forçar uso de esbuild ao invés de rolldown para evitar problemas de bindings nativos
  optimizeDeps: {
    disabled: true,
  },
})