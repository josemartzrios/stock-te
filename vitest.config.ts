import { defineConfig } from 'vitest/config';

// Tests corren solo sobre la logica pura de src/domain (entorno node, sin DOM).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/domain/**/*.test.ts'],
  },
});
