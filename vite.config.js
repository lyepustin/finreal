import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443  // This helps with reverse proxy setups
    },
    fs: {
      allow: ['.']
    },
    proxy: {},
    cors: true,
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