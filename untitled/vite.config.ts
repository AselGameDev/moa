import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      fs: {
        deny: [
          path.resolve(__dirname, 'data') + '/**',
          path.resolve(__dirname, 'server') + '/**',
          path.resolve(__dirname, 'tests') + '/**',
          path.resolve(__dirname, 'server.ts'),
          path.resolve(__dirname, '.env*'),
          path.resolve(__dirname, 'package.json'),
          path.resolve(__dirname, 'package-lock.json'),
          path.resolve(__dirname, 'bun.lock'),
          path.resolve(__dirname, 'tsconfig.json')
        ]
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
            'vendor-icons': ['lucide-react']
          }
        }
      }
    }
  };
});
