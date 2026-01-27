import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Plugin to prevent trailing slash redirects (required for Google OAuth)
    {
      name: 'prevent-trailing-slash',
      configureServer(server) {
        return () => {
          // Insert middleware at the very beginning to intercept requests
          server.middlewares.use((req, res, next) => {
            // Handle root path - serve index.html without redirecting
            if (req.url === '/' && req.method === 'GET') {
              req.url = '/index.html'
              next()
              return
            }
            // Redirect any non-root URL with trailing slash to remove it
            if (req.url && req.url !== '/' && req.url.endsWith('/') && req.method === 'GET') {
              const newUrl = req.url.slice(0, -1) + (req.url.includes('?') ? '' : '')
              res.writeHead(301, { Location: newUrl })
              res.end()
              return
            }
            next()
          })
        }
      }
    }
  ],
  server: {
    host: 'localhost',
    port: 5176,
    strictPort: false, // Allow Vite to use next available port if 5176 is busy
  },
  base: '/',
  appType: 'spa',
})
