import { URL, fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Served from a subpath on GitHub Pages (set by CI); '/' for local dev.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  // Load env (VITE_API_URL etc.) from the monorepo root .env.
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
