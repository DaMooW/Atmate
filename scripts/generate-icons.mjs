/**
 * 生成扩展图标：public/icon/{16,32,48,128}.png
 *
 * 为什么手写 PNG 编码：不引入任何第三方依赖，也不需要字体渲染（字标在 16px 下
 * 依赖字体反而不稳），换来的是确定性的、可重复的图标产物。
 * 画法：先在 size×N 的超采样网格上做几何覆盖测试，再降采样得到抗锯齿边缘。
 *
 * 用法：node scripts/generate-icons.mjs
 * 依据：specs/20260913-m0-init「修订记录 D9」；技能参考 chrome-extensions/references/extensions/icons.md
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icon');
const SIZES = [16, 32, 48, 128];

// 品牌色：与 assets/style.css 的 --primary 同色系（#1f6feb），这里用同色相的垂直渐变
const GRADIENT_TOP = [43, 124, 240]; // #2b7cf0
const GRADIENT_BOTTOM = [26, 95, 208]; // #1a5fd0
const WHITE = [255, 255, 255];

/* ---------------------------------- 形状（归一化坐标 0..1） --------------------------------- */

const BADGE = { x0: 0.02, y0: 0.02, x1: 0.98, y1: 0.98, r: 0.22 };
// 对话气泡：产品内核是"划词 → 对话"，气泡在 16px 下仍是清晰剪影
const BUBBLE = { x0: 0.22, y0: 0.22, x1: 0.78, y1: 0.6, r: 0.13 };
const TAIL = [
  [0.32, 0.55],
  [0.52, 0.58],
  [0.36, 0.8],
];
const DOTS = [
  [0.385, 0.41, 0.055],
  [0.615, 0.41, 0.055],
];

function insideRoundRect(px, py, { x0, y0, x1, y1, r }) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.min(Math.max(px, x0 + r), x1 - r);
  const cy = Math.min(Math.max(py, y0 + r), y1 - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function insideTriangle(px, py, [a, b, c]) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const p = [px, py];
  const d1 = cross(a, b, p);
  const d2 = cross(b, c, p);
  const d3 = cross(c, a, p);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/* --------------------------------------- PNG 编码 --------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------- 绘制 ---------------------------------------- */

function render(size) {
  const ss = size <= 32 ? 8 : 4; // 小尺寸多采样，边缘更细腻
  const scale = size * ss;
  const samples = ss * ss;
  const acc = new Float64Array(size * size * 4); // 预乘 RGB + alpha 累加

  for (let y = 0; y < scale; y++) {
    for (let x = 0; x < scale; x++) {
      const nx = (x + 0.5) / scale;
      const ny = (y + 0.5) / scale;
      if (!insideRoundRect(nx, ny, BADGE)) continue;

      const base = GRADIENT_TOP.map((c, i) => c + (GRADIENT_BOTTOM[i] - c) * ny);
      const inDot = DOTS.some(([cx, cy, r]) => (nx - cx) ** 2 + (ny - cy) ** 2 <= r * r);
      const inBubble = insideRoundRect(nx, ny, BUBBLE) || insideTriangle(nx, ny, TAIL);
      const rgb = inDot || !inBubble ? base : WHITE;

      const i = (Math.floor(y / ss) * size + Math.floor(x / ss)) * 4;
      acc[i] += rgb[0];
      acc[i + 1] += rgb[1];
      acc[i + 2] += rgb[2];
      acc[i + 3] += 255;
    }
  }

  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const alphaSum = acc[i * 4 + 3];
    const coverage = alphaSum / 255 / samples;
    out[i * 4 + 3] = Math.round(coverage * 255);
    for (let c = 0; c < 3; c++) {
      // 反预乘：边缘像素取"已覆盖采样"的均色，避免半透明处发黑
      out[i * 4 + c] = alphaSum > 0 ? Math.round((acc[i * 4 + c] * 255) / alphaSum) : 0;
    }
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = join(OUT_DIR, `${size}.png`);
  const png = encodePng(size, render(size));
  writeFileSync(file, png);
  console.log(`✓ icon/${size}.png  ${size}×${size}  ${png.length} bytes`);
}
