import { defineConfig } from 'vitest/config';

/**
 * 测试规范见 techniqueStack §10（四层金字塔）。
 * - 默认 environment: node（L1 core / L2 infra 测试）
 * - L3 组件测试在文件顶部加 `// @vitest-environment jsdom` 逐文件切换（vitest 5 已移除 environmentMatchGlobs）
 * M0 过渡期 passWithNoTests: true；M1 收尾时关闭（roadmap §1 DoD）。
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    environment: 'node',
  },
});
