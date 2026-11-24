import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [react()],
  build: {
    outDir: 'js',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve('src/main.jsx'),
      formats: ['es'],
      fileName: () => 'shell.js',
    },
  },
});
