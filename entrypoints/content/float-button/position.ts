/**
 * 浮动按钮定位纯函数（M2 T2.2）。
 *
 * 计算按钮在视口中的位置：
 * - 默认：选区右下角 + 8px 偏移
 * - 右溢出：左移到视口右边缘内
 * - 下溢出：上移到选区上方（显示在选区上方而非下方）
 *
 * 纯函数，无 DOM 副作用，可在 L1 单测中覆盖。
 */

export interface ButtonPosition {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

/** 按钮与选区的间距（px） */
export const BUTTON_OFFSET = 8;

/**
 * 计算浮动按钮位置。
 *
 * @param rect - 选区的 getBoundingClientRect() 结果
 * @param viewport - 视口尺寸（window.innerWidth / innerHeight）
 * @param buttonSize - 按钮边长（正方形，默认 32px）
 * @returns 按钮左上角的视口坐标
 */
export function calcButtonPosition(
  rect: DOMRect,
  viewport: ViewportSize,
  buttonSize = 32,
): ButtonPosition {
  // 默认：选区右下角 + 偏移
  let x = rect.right + BUTTON_OFFSET;
  let y = rect.bottom + BUTTON_OFFSET;

  // 右溢出：左移到视口右边缘内
  if (x + buttonSize > viewport.width) {
    x = viewport.width - buttonSize - BUTTON_OFFSET;
  }

  // 下溢出：上移到选区上方（而非下方）
  if (y + buttonSize > viewport.height) {
    y = rect.top - buttonSize - BUTTON_OFFSET;
    // 如果上方也溢出（选区在视口顶部），则贴顶
    if (y < 0) {
      y = BUTTON_OFFSET;
    }
  }

  // 左溢出保护（极端情况：选区在视口左边缘外）
  if (x < 0) {
    x = BUTTON_OFFSET;
  }

  return { x, y };
}
