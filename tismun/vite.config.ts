import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Flags are globbed as URLs; left to the default 4 kB limit Vite would
    // inline most of the 271 SVGs as base64 and add ~200 kB to the bundle
    // every visitor downloads — for fifteen flags they will actually see.
    assetsInlineLimit: (filePath) => (/flag-icons[\\/]flags[\\/]/.test(filePath) ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@dnd-kit')) return 'dnd';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
