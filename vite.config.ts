import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { universesApi } from './server/universesPlugin';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), universesApi()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    // El móvil entra por la IP de la Wi-Fi, no por localhost.
    allowedHosts: true,
    cors: true,
    watch: {
      ignored: ['**/dist/**', '**/data/**'],
    },
  },
  preview: {
    host: true,
    port: 5180,
    strictPort: true,
  },
});
