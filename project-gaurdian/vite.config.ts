import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:5000';
  const apiProxy = {
    '/api': {
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      // Vertex/ADK MiFID justification can take 10–30s; avoid proxy cutoffs
      timeout: 600_000,
      proxyTimeout: 600_000,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: apiProxy,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      allowedHosts: ['.localhost', '.127.0.0.1', 'guardian-app-359026735934.us-central1.run.app'],
      host: '0.0.0.0',
      proxy: apiProxy,
    },
  };
});
