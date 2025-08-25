import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ignore-sourcemap-errors',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.map')) {
            res.statusCode = 404;
            res.end();
            return;
          }
          next();
        });
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react', 'firebase', '@firebase/auth', 'jspdf'],
  },
  build: {
    sourcemap: false,
  },
  css: {
    devSourcemap: false,
  }
});
