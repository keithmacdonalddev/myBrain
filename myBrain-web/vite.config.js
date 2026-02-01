import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy API requests to the backend server
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/notes': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/tasks': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/filters': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/profile': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/images': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/events': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/tags': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/life-areas': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/projects': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/saved-locations': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/weather': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/analytics': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/logs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/settings': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/files': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/folders': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/share': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/connections': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/item-shares': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/messages': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/reports': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/dashboard': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/feedback': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // WebSocket proxy for real-time features
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
