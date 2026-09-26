import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import zaloMiniApp from 'zmp-vite-plugin';

export default defineConfig({
  base: './',
  plugins: [react(), zaloMiniApp()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.module.js',
        chunkFileNames: 'assets/[name].module.js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css') ? 'assets/app.css' : 'assets/[name][extname]'
      }
    }
  }
});
