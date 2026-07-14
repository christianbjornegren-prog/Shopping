import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Shopping/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'CHRELIN – Smart inköpslista',
        short_name: 'CHRELIN',
        description: 'Smart inköpslista för svenska matvarubutiker',
        lang: 'sv',
        theme_color: '#16a34a',
        background_color: '#0c1017',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Shopping/',
        start_url: '/Shopping/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // App shell only. Firestore/Auth calls always hit the network and are
        // never cached, so shared-list data is never served stale.
        navigateFallbackDenylist: [/^\/__/, /\/join/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
}))
