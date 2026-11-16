import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    fs: {
      deny: [
        path.resolve(__dirname, 'data') + '/**',
        path.resolve(__dirname, 'server') + '/**',
        path.resolve(__dirname, 'tests') + '/**',
        path.resolve(__dirname, 'server.ts'),
        path.resolve(__dirname, '.env*'),
        path.resolve(__dirname, 'package.json'),
        path.resolve(__dirname, 'package-lock.json'),
        path.resolve(__dirname, 'tsconfig.json'),
      ],
    },
  },
});
