import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import {
  BADGE,
  BUBBLE,
  insideRoundRect,
  insideTriangle,
  crc32,
  chunk,
  encodePng,
  render,
} from '../../scripts/icon-engine.mjs';

describe('insideRoundRect', () => {
  const rect = { x0: 0.1, y0: 0.1, x1: 0.9, y1: 0.9, r: 0.2 };

  it('矩形中心在内部', () => {
    expect(insideRoundRect(0.5, 0.5, rect)).toBe(true);
  });

  it('矩形外部返回 false', () => {
    expect(insideRoundRect(0.0, 0.5, rect)).toBe(false);
    expect(insideRoundRect(1.0, 0.5, rect)).toBe(false);
    expect(insideRoundRect(0.5, 0.0, rect)).toBe(false);
    expect(insideRoundRect(0.5, 1.0, rect)).toBe(false);
  });

  it('圆角区域内的点返回 true（靠近角但在圆弧内）', () => {
    // 左上角圆角中心在 (0.3, 0.3)，半径 0.2；点 (0.35, 0.35) 距中心 ≈0.071 < 0.2
    expect(insideRoundRect(0.35, 0.35, rect)).toBe(true);
  });

  it('圆角区域外的角点返回 false（在矩形边界框内但在圆弧外）', () => {
    // 左上角 (0.1, 0.1) 距圆角中心 (0.3, 0.3) ≈0.283 > 0.2
    expect(insideRoundRect(0.12, 0.12, rect)).toBe(false);
  });

  it('直边上的点返回 true（略靠内以规避 0.1+0.2 浮点误差）', () => {
    expect(insideRoundRect(0.5, 0.15, rect)).toBe(true); // 上边中点略靠内
    expect(insideRoundRect(0.15, 0.5, rect)).toBe(true); // 左边中点略靠内
  });

  it('BADGE 常量覆盖中心且排除角落', () => {
    expect(insideRoundRect(0.5, 0.5, BADGE)).toBe(true);
    expect(insideRoundRect(0.01, 0.01, BADGE)).toBe(false);
  });
});

describe('insideTriangle', () => {
  const tri = [
    [0.0, 0.0],
    [1.0, 0.0],
    [0.5, 1.0],
  ] as const;

  it('三角形重心在内部', () => {
    expect(insideTriangle(0.5, 0.33, tri)).toBe(true);
  });

  it('三角形外部返回 false', () => {
    expect(insideTriangle(0.5, 1.1, tri)).toBe(false); // 顶点上方
    expect(insideTriangle(0.0, 0.5, tri)).toBe(false); // 左侧（x=0 处三角形只有 y=0 一个点）
  });

  it('三个顶点在边界上（返回 true，边界属于内部）', () => {
    expect(insideTriangle(0.0, 0.0, tri)).toBe(true);
    expect(insideTriangle(1.0, 0.0, tri)).toBe(true);
    expect(insideTriangle(0.5, 1.0, tri)).toBe(true);
  });

  it('底边中点在边界上', () => {
    expect(insideTriangle(0.5, 0.0, tri)).toBe(true);
  });

  it('BUBBLE + TAIL 组合区域中心不透明', () => {
    // BUBBLE 中心 (0.5, 0.41) 在内部
    expect(insideRoundRect(0.5, 0.41, BUBBLE)).toBe(true);
  });
});

describe('crc32', () => {
  it('空 Buffer 返回 0', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });

  it('标准测试向量 "123456789" 返回 0xCBF43926', () => {
    expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
  });

  it('单字节 Buffer 计算正确', () => {
    // CRC32 of [0x00] = 0xd202ef8d
    expect(crc32(Buffer.from([0x00]))).toBe(0xd202ef8d);
  });
});

describe('chunk', () => {
  it('IEND chunk 结构正确（长度 0 + 类型 + CRC）', () => {
    const buf = chunk('IEND', Buffer.alloc(0));
    expect(buf.length).toBe(12); // 4 len + 4 type + 0 data + 4 crc
    expect(buf.readUInt32BE(0)).toBe(0);
    expect(buf.toString('ascii', 4, 8)).toBe('IEND');
  });

  it('chunk 长度字段与 data 长度一致', () => {
    const data = Buffer.from([1, 2, 3, 4]);
    const buf = chunk('tEXt', data);
    expect(buf.readUInt32BE(0)).toBe(4);
  });
});

describe('encodePng', () => {
  const size = 4;
  const rgba = Buffer.alloc(size * size * 4, 255); // 全白不透明
  const png = encodePng(size, rgba);

  it('以 PNG magic bytes 开头', () => {
    const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    expect(Array.from(png.subarray(0, 8))).toEqual(magic);
  });

  it('IHDR chunk 尺寸正确', () => {
    // magic(8) + len(4) + type(4) = offset 16 开始 IHDR data
    expect(png.toString('ascii', 12, 16)).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(size); // width
    expect(png.readUInt32BE(20)).toBe(size); // height
    expect(png[24]).toBe(8); // bit depth
    expect(png[25]).toBe(6); // color type RGBA
  });

  it('以 IEND chunk 结尾', () => {
    expect(png.toString('ascii', png.length - 8, png.length - 4)).toBe('IEND');
  });

  it('IDAT 数据可被 zlib 解压还原为原始 raw 数据', () => {
    // 找到 IDAT chunk
    let offset = 8; // after magic
    let idatData = null;
    while (offset < png.length) {
      const len = png.readUInt32BE(offset);
      const type = png.toString('ascii', offset + 4, offset + 8);
      if (type === 'IDAT') {
        idatData = png.subarray(offset + 8, offset + 8 + len);
        break;
      }
      offset += 12 + len;
    }
    expect(idatData).not.toBeNull();
    const raw = inflateSync(idatData!);
    // raw = (stride + 1) * size，每行行首一个 filter byte(0)
    expect(raw.length).toBe((size * 4 + 1) * size);
    expect(raw[0]).toBe(0); // first filter byte
  });
});

describe('render', () => {
  it('输出 Buffer 尺寸为 size × size × 4', () => {
    for (const size of [16, 32, 48, 128]) {
      const buf = render(size);
      expect(buf.length).toBe(size * size * 4);
    }
  });

  it('图像四角（badge 外）为全透明', () => {
    const size = 32;
    const buf = render(size);
    // 左上角像素 (0,0) 的 alpha 通道
    const alpha = buf[3]; // pixel (0,0) alpha at offset 3
    expect(alpha).toBe(0);
    // 右上角 (size-1, 0)
    const trAlpha = buf[(size - 1) * 4 + 3];
    expect(trAlpha).toBe(0);
    // 左下角 (0, size-1)
    const blAlpha = buf[(size - 1) * size * 4 + 3];
    expect(blAlpha).toBe(0);
  });

  it('图像中心（badge 内）不透明', () => {
    const size = 32;
    const buf = render(size);
    const centerIdx = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4;
    expect(buf[centerIdx + 3]).toBe(255);
  });

  it('气泡区域中心为白色（RGB 接近 255）', () => {
    const size = 32;
    const buf = render(size);
    // BUBBLE 中心约在归一化 (0.5, 0.41)
    const px = Math.floor(0.5 * size);
    const py = Math.floor(0.41 * size);
    const idx = (py * size + px) * 4;
    expect(buf[idx]).toBeGreaterThan(250); // R
    expect(buf[idx + 1]).toBeGreaterThan(250); // G
    expect(buf[idx + 2]).toBeGreaterThan(250); // B
  });

  it('16px 小尺寸也能正常渲染（不崩溃、非全零）', () => {
    const buf = render(16);
    let nonZero = 0;
    for (let i = 0; i < buf.length; i += 4) {
      if (buf.readUInt8(i + 3) > 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(0);
  });
});
