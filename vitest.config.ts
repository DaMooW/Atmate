import { defineConfig } from 'vitest/config';

/**
 * M0 仅打通管道（允许 0 用例）；M1 起 core 域层单测落在 tests/（tech §10）。
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    environment: 'node',
  },
});
