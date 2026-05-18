import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/endless-slice/',
  plugins: [react()],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/shared') },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});
