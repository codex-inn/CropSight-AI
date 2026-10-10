import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({\n  base: '/CropSight-AI/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts'
  }
});
