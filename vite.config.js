import { defineConfig } from 'vite';
import { offlineAppPlugin } from './src/pwa/viteOfflinePlugin.js';
export default defineConfig({
  base: './',
  plugins: [offlineAppPlugin()],
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { copyPublicDir: false, target: 'es2022', rollupOptions: { output: { manualChunks: { three: ['three'] } } } }
});
