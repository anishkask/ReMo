import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5177,
    strictPort: true, // Enforce port 5177 - fail if port is in use instead of auto-incrementing
  },
})
