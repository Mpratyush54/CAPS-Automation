import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['returns-columns-mart-priorities.trycloudflare.com',
      'pond-interval-hewlett-consecutive.trycloudflare.com'
    ],
  },
})
