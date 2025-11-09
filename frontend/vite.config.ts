import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const rootEnvDir = path.resolve(__dirname, '..');
  const rootEnv = loadEnv(mode, rootEnvDir, '');
  const projectEnv = loadEnv(mode, __dirname, '');
  const env = {
    ...process.env,
    ...rootEnv,
    ...projectEnv
  } as Record<string, string | undefined>;
  const devPort = Number(env.FRONT_PORT ?? env.VITE_DEV_SERVER_PORT ?? '5173');
  const previewPort = Number(env.FRONT_PREVIEW_PORT ?? env.FRONT_PORT ?? '4173');
  const backendUrl = env.VITE_API_URL ?? 'http://localhost:3001';

  const isTest = mode === 'test' || env.VITEST;

  return {
    plugins: [react()],
    envDir: rootEnvDir,
    envPrefix: ['VITE_', 'FRONT_'],
    resolve: {
      alias: {
        ...(isTest ? { recharts: path.resolve(__dirname, 'src/test-utils/recharts-stub.tsx') } : {})
      }
    },
    server: {
      host: '0.0.0.0',
      port: devPort,
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/vite.config.*']
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: previewPort
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts'
    }
  };
});
