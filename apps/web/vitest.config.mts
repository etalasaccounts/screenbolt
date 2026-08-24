import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: root },
    ],
  },
});
