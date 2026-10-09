import { defineConfig } from 'vitest/config';

// Tests corren solo sobre logica pura y repositorios (entorno node, sin DOM).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
