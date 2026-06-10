import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Desarrollo local: Vite sirve el frontend y hace proxy de /api → backend.
 * Producción (Docker): Nginx sirve los estáticos y hace proxy de /api
 * (ver docker/nginx/default.conf). El frontend siempre usa baseURL '/api'.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server:
    mode === 'development'
      ? {
          port: 5173,
          proxy: {
            '/api': {
              target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
              changeOrigin: true,
            },
          },
        }
      : undefined,
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}))
