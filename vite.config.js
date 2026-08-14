import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174 es el puerto preferido; si está ocupado, Vite usa el siguiente libre.
    port: 5174,
    strictPort: false,
  },
})
