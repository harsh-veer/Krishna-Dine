import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Dev only: proxy API + WebSocket traffic to the local backend so no URLs are hardcoded in app code.
  const target = env.VITE_DEV_API_PROXY || 'http://localhost:5000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
