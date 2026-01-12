import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // UPDATE BAGIAN INI
      preview: {
        allowedHosts: [
          'lumina-31263065340.us-central1.run.app', // Domain asli Cloud Run
          'luminaphotocrm.com',                      // Domain custom kamu
          'www.luminaphotocrm.com', 'app.luminaphotocrm',                   // (Opsional) jika pakai www
        ], 
        host: '0.0.0.0',
        port: 8080,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setup.ts',
      }
    };
});
