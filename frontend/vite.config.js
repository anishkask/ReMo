import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow binding to all network interfaces when needed
    port: 5177,
    strictPort: true, // Enforce port 5177 - fail if port is in use instead of auto-incrementing
  },
})
