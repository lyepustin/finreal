import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443,
      host: 'finreal.ddns.net'
    },
    fs: {
      allow: ['.']
    },
    proxy: {},
    cors: {
      origin: ['https://finreal.ddns.net', 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    },
    watch: {
      usePolling: true
    },
    allowedHosts: ['finreal.ddns.net', 'localhost']
  },
  preview: {
    port: 5173,
    strictPort: true
  }
}); 