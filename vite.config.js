import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  // .env.local is gitignored and has gone missing once already. Without it the
  // build still succeeds and quietly ships an app with no Firebase config —
  // it loads, it looks fine, and nothing can sign in or sync. Stop here
  // instead, where it is obvious.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_APP_ID',
    ].filter(key => !env[key])
    if (missing.length) {
      throw new Error(
        `Bygget stoppat: Firebase-konfigurationen saknas (${missing.join(', ')}).\n` +
        'Skapa .env.local innan du bygger, annars hamnar en app utan backend live.'
      )
    }
  }

  return {
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
  }
})
