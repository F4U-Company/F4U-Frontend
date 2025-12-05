import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'msal-vendor': ['@azure/msal-browser', '@azure/msal-react'],
          'map-vendor': ['leaflet', 'maplibre-gl', 'globe.gl'],
        },
      },
    },
  },
  // Asegurar que import.meta.env esté disponible
  define: {
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
  },
  optimizeDeps: {
    exclude: ['@vitest/ui'],
  },
});
