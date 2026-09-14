import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 项目结构完整性冒烟：替代原 "1+1=2"，验证关键文件与产物存在。
 * M0 管道最低保障；M1 起 core/infra 有真实用例后本文件仍保留作为结构基线。
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('项目结构完整性', () => {
  it('关键源码文件存在', () => {
    const files = [
      'entrypoints/background.ts',
      'entrypoints/content.ts',
      'entrypoints/sidepanel/main.tsx',
      'entrypoints/sidepanel/index.html',
      'components/App.tsx',
      'wxt.config.ts',
      'vitest.config.ts',
      'package.json',
    ];
    for (const f of files) {
      expect(existsSync(resolve(ROOT, f))).toBe(true);
    }
  });

  it('图标产物存在（四个尺寸）', () => {
    for (const size of [16, 32, 48, 128]) {
      expect(existsSync(resolve(ROOT, `public/icon/${size}.png`))).toBe(true);
    }
  });

  it('规范文档存在', () => {
    for (const f of ['roadmap.md', 'techniqueStack.md', 'mission.md', 'AGENTS.md']) {
      expect(existsSync(resolve(ROOT, f))).toBe(true);
    }
  });

  it('测试目录结构已建立', () => {
    expect(existsSync(resolve(ROOT, 'tests/core'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'tests/infra'))).toBe(true);
  });
});
