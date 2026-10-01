import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5173),
    proxy: {
      '/api': 'http://localhost:3001',
      '/api/render/logs/stream': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 4173),
    allowedHosts: ['.onrender.com', 'render-web-4f5v.onrender.com'],
  },
})
