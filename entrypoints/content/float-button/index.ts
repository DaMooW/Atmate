/**
 * 浮动按钮（M2 T2.2，D2/D16）。
 *
 * 职责：
 * - 创建 Shadow DOM 隔离的浮动按钮（不依赖站点 CSS，不污染站点）
 * - show(x, y)：显示在指定位置
 * - hide()：隐藏
 * - destroy()：移除 DOM，清理事件监听
 * - 点击事件：通知调用方（调用方发送 AT_FLOAT_BUTTON_CLICK 给 background）
 *
 * 仅在侧边栏未打开时显示（D16 分流逻辑由调用方控制）。
 */

import { FLOAT_BUTTON_CSS, ATMATE_ICON_SVG } from './style';

export interface FloatButton {
  /** 显示按钮在指定视口坐标 */
  show: (x: number, y: number) => void;
  /** 隐藏按钮 */
  hide: () => void;
  /** 按钮是否可见 */
  isVisible: () => boolean;
  /** 移除 DOM，清理事件监听 */
  destroy: () => void;
}

/**
 * 创建浮动按钮。
 *
 * @param onClick - 按钮点击回调（调用方负责发送消息给 background）
 * @returns 浮动按钮实例
 */
export function createFloatButton(onClick: () => void): FloatButton {
  // 创建宿主元素（挂在 document.body 下）
  const host = document.createElement('div');
  host.className = 'atmate-float-button-host';

  // 创建 Shadow DOM（open 模式，便于调试）
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // 注入样式
  const style = document.createElement('style');
  style.textContent = FLOAT_BUTTON_CSS;
  shadowRoot.appendChild(style);

  // 创建按钮
  const button = document.createElement('button');
  button.className = 'atmate-float-button';
  button.type = 'button';
  button.setAttribute('aria-label', '发送到在伴 AI 侧边栏');
  button.innerHTML = ATMATE_ICON_SVG;

  // 创建 tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'atmate-float-button-tooltip';
  tooltip.textContent = '发送到在伴';

  // 组装
  shadowRoot.appendChild(button);
  shadowRoot.appendChild(tooltip);

  // 点击事件
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  };
  button.addEventListener('click', handleClick);

  // 挂载到 body
  document.body.appendChild(host);

  return {
    show(x: number, y: number) {
      host.style.left = `${x}px`;
      host.style.top = `${y}px`;
      host.classList.add('visible');
    },

    hide() {
      host.classList.remove('visible');
    },

    isVisible() {
      return host.classList.contains('visible');
    },

    destroy() {
      button.removeEventListener('click', handleClick);
      host.remove();
    },
  };
}
