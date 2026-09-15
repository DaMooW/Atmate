import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * 测试规范见 techniqueStack §10（四层金字塔）。
 * - 默认 environment: node（L1 core / L2 infra 测试）
 * - L3 组件测试在文件顶部加 `// @vitest-environment jsdom` 逐文件切换（vitest 5 已移除 environmentMatchGlobs）
 * M1 起 passWithNoTests: false（roadmap §1 DoD，无测试的核心逻辑变更不得提交）。
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
    environment: 'node',
  },
  resolve: {
    alias: {
      // WXT 项目中 `~` 指向项目根目录，测试时需同样配置
      '~': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
