import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * 分工（requirements D6）：ESLint 管代码质量，格式交给 Prettier（config-prettier 收尾）。
 */
export default defineConfig([
  globalIgnores(['.wxt/**', '.output/**', 'dist/**', 'coverage/**']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Node 侧脚本（scripts/、根目录 config）：显式声明用到的 Node 全局，
    // 不为几个只读全局引入额外依赖（如 `globals` 包）。
    files: ['scripts/**/*.{js,mjs}', '*.config.{js,mjs}'],
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' },
    },
  },
  prettier,
]);
