import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
const apiOrigin = 'https://127.0.0.1:18443';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: {
      '/v1': {
        target: apiOrigin, secure: true, changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (upstream, request) => {
            // Only the fixed local development origin may cross this proxy.
            // Missing or foreign Origins remain unchanged and fail server guards.
            if (request.headers.origin === 'http://127.0.0.1:5173') upstream.setHeader('Origin', apiOrigin);
          });
        },
      },
    },
  },
});
