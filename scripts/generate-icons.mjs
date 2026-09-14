/**
 * 生成扩展图标：public/icon/{16,32,48,128}.png
 *
 * 纯函数（几何/编码/渲染）已提取到 icon-engine.mjs，可单测；
 * 本文件仅负责文件系统写入。
 *
 * 为什么手写 PNG 编码：不引入任何第三方依赖，也不需要字体渲染（字标在 16px 下
 * 依赖字体反而不稳），换来的是确定性的、可重复的图标产物。
 *
 * 用法：node scripts/generate-icons.mjs
 * 依据：specs/20260913-m0-init「修订记录 D9」；技能参考 chrome-extensions/references/extensions/icons.md
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng, render } from './icon-engine.mjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icon');
const SIZES = [16, 32, 48, 128];

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = join(OUT_DIR, `${size}.png`);
  const png = encodePng(size, render(size));
  writeFileSync(file, png);
  console.log(`✓ icon/${size}.png  ${size}×${size}  ${png.length} bytes`);
}
