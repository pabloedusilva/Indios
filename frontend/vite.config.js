import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function cleanLogger() {
  return {
    name: 'clean-logger',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        setTimeout(async () => {
          console.clear()
          console.log('Frontend: ✅ ONLINE')
          try {
            const r = await fetch('http://localhost:3333/api/health')
            if (r.ok) console.log('Backend:  ✅ CONECTADO')
            else console.log('Backend:  ❌ OFFLINE')
          } catch {
            console.log('Backend:  ❌ OFFLINE')
          }
        }, 300)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    cleanLogger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.png', 'icons/*.png'],
      manifest: {
        name: 'Índios Churrasco Gourmet',
        short_name: 'Índios CG',
        description: 'Sistema de Gestão de Pedidos — Índios Churrasco Gourmet',
        theme_color: '#C93517',
        background_color: '#F7F5F2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/logo.png',
            sizes: '620x620',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Índios Churrasco Gourmet',
          },
        ],
      },
      workbox: {
        // Estratégias de cache
        runtimeCaching: [
          {
            // API — network first: sempre tenta buscar dados frescos, cai no cache se offline
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts — stale while revalidate
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Imagens — cache first
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // ativar só para testar o SW em dev
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // ── Configuração de Build ───────────────────────────────────
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Garantir que arquivos da pasta public (incluindo _redirects) sejam copiados
    copyPublicDir: true,
  },
  // ── Proxy de desenvolvimento ────────────────────────────────
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
})

