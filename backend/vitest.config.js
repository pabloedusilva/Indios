import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.js'],
  },
  esbuild: {
    target: 'node14'
  },
  // Forçar uso de esbuild ao invés de rolldown para evitar problemas de bindings nativos
  optimizeDeps: {
    disabled: true,
  },
})