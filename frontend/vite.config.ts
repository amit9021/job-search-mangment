import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), '');
  const env = { ...process.env, ...loadedEnv } as Record<string, string | undefined>;
  const devPort = Number(env.FRONT_PORT ?? env.VITE_DEV_SERVER_PORT ?? '5173');
  const backendUrl = env.VITE_API_URL ?? 'http://localhost:3001';

  const isTest = mode === 'test' || process.env.VITEST;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        ...(isTest ? { recharts: path.resolve(__dirname, 'src/test-utils/recharts-stub.tsx') } : {})
      }
    },
    server: {
      port: devPort,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts'
    }
  };
});
