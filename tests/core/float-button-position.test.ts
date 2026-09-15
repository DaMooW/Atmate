// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { calcButtonPosition, BUTTON_OFFSET } from '../../entrypoints/content/float-button/position';

/**
 * L1 单测：浮动按钮定位纯函数（M2 T2.2）。
 *
 * 覆盖：正常右下角、右溢出左移、下溢出上移、同时溢出、视口角落。
 */

// 构造测试用的 DOMRect
function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    left: 100,
    top: 100,
    right: 200,
    bottom: 120,
    width: 100,
    height: 20,
    x: 100,
    y: 100,
    toJSON: () => ({}),
    ...overrides,
  };
}

const VIEWPORT = { width: 1000, height: 800 };
const BUTTON_SIZE = 32;

describe('content/float-button/position · calcButtonPosition', () => {
  it('正常情况：按钮在选区右下角 + 偏移', () => {
    const rect = makeRect({ right: 200, bottom: 120 });
    const pos = calcButtonPosition(rect, VIEWPORT, BUTTON_SIZE);
    expect(pos.x).toBe(200 + BUTTON_OFFSET);
    expect(pos.y).toBe(120 + BUTTON_OFFSET);
  });

  it('右溢出：按钮左移到视口右边缘内', () => {
    // 选区 right = 980，按钮 x = 988 + 32 = 1020 > 1000
    const rect = makeRect({ right: 980, bottom: 120 });
    const pos = calcButtonPosition(rect, VIEWPORT, BUTTON_SIZE);
    expect(pos.x).toBe(VIEWPORT.width - BUTTON_SIZE - BUTTON_OFFSET); // 960
    expect(pos.x + BUTTON_SIZE).toBeLessThanOrEqual(VIEWPORT.width);
  });

  it('下溢出：按钮上移到选区上方', () => {
    // 选区 bottom = 780，按钮 y = 788 + 32 = 820 > 800
    const rect = makeRect({ right: 200, bottom: 780, top: 760 });
    const pos = calcButtonPosition(rect, VIEWPORT, BUTTON_SIZE);
    // 应该在选区上方：top - buttonSize - offset
    expect(pos.y).toBe(760 - BUTTON_SIZE - BUTTON_OFFSET); // 720
    expect(pos.y + BUTTON_SIZE).toBeLessThanOrEqual(VIEWPORT.height);
  });

  it('同时溢出（右下）：左移 + 上移', () => {
    const rect = makeRect({ right: 980, bottom: 780, top: 760 });
    const pos = calcButtonPosition(rect, VIEWPORT, BUTTON_SIZE);
    expect(pos.x).toBe(VIEWPORT.width - BUTTON_SIZE - BUTTON_OFFSET);
    expect(pos.y).toBe(760 - BUTTON_SIZE - BUTTON_OFFSET);
  });

  it('选区在视口左上角：按钮不溢出左/上边缘', () => {
    const rect = makeRect({ left: 0, top: 0, right: 50, bottom: 20 });
    const pos = calcButtonPosition(rect, VIEWPORT, BUTTON_SIZE);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  it('选区在视口右下角且上方也无空间：贴顶显示', () => {
    // 选区 top = 10，bottom = 790（几乎占满视口）
    const rect = makeRect({ right: 980, bottom: 790, top: 10 });
    const pos = calcButtonPosition(rect, VIEWPORT, BUTTON_SIZE);
    // 下溢出时尝试上移，但上方也溢出（top - 32 - 8 < 0），所以贴顶
    expect(pos.y).toBe(BUTTON_OFFSET);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  it('默认按钮尺寸为 32px', () => {
    const rect = makeRect({ right: 200, bottom: 120 });
    const pos = calcButtonPosition(rect, VIEWPORT); // 不传 buttonSize
    expect(pos.x).toBe(200 + BUTTON_OFFSET);
    expect(pos.y).toBe(120 + BUTTON_OFFSET);
  });

  it('自定义按钮尺寸', () => {
    const rect = makeRect({ right: 200, bottom: 120 });
    const pos = calcButtonPosition(rect, VIEWPORT, 48);
    expect(pos.x).toBe(200 + BUTTON_OFFSET);
    expect(pos.y).toBe(120 + BUTTON_OFFSET);
  });
});
