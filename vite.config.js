import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  VitePWA({
    registerType: 'autoUpdate',
    devOptions: {
      enabled: true
    },
    manifest: {
      name: 'CAPS Automation',
      short_name: 'CAPS',
      description: 'Event Automation Platform',
      theme_color: '#000000',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: '/icons/pwa-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/pwa-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  })
  ],
  server: {
    port: 5174,

    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
    allowedHosts: [
      'returns-columns-mart-priorities.trycloudflare.com',
      'pond-interval-hewlett-consecutive.trycloudflare.com',
      '.trycloudflare.com'
    ],
  },
})
