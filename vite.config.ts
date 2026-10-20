import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { universesApi } from './server/universesPlugin';

function githubPagesSpa() {
  return {
    name: 'github-pages-spa',
    closeBundle() {
      const dist = path.resolve('dist');
      const index = path.join(dist, 'index.html');
      if (!fs.existsSync(index)) return;
      fs.mkdirSync(path.join(dist, 'crear', 'nuevo'), { recursive: true });
      fs.copyFileSync(index, path.join(dist, 'crear', 'index.html'));
      fs.copyFileSync(index, path.join(dist, 'crear', 'nuevo', 'index.html'));
      const base = (process.env.VITE_BASE || '/').replace(/\/?$/, '/');
      fs.writeFileSync(
        path.join(dist, '404.html'),
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lumen</title><script>sessionStorage.setItem('lumen.path',location.pathname+location.search+location.hash);location.replace('${base}');</script>`,
      );
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), universesApi(), githubPagesSpa()],
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
