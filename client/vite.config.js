import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // --- ADD THIS 'server' BLOCK ---
  server: {
    proxy: {
      // This says: "any request that starts with /api..."
      '/api': {
        // "...should be forwarded to my backend server"
        target: 'http://localhost:5000', 
        changeOrigin: true,
      },
    },
  },
})