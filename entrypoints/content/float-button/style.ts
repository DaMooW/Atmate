/**
 * 浮动按钮内联 CSS（M2 T2.2）。
 *
 * 样式全部内联在 Shadow DOM 内，不依赖站点 CSS，也不污染站点。
 * 按钮：32×32 圆形，深色半透明背景，Atmate 图标，hover 变亮，tooltip。
 * z-index 设为最大值，确保在所有站点元素之上。
 */

export const FLOAT_BUTTON_CSS = `
  .atmate-float-button-host {
    position: fixed;
    z-index: 2147483647;
    display: none;
  }

  .atmate-float-button-host.visible {
    display: block;
  }

  .atmate-float-button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(32, 33, 36, 0.9);
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
    transition: background 0.15s ease, transform 0.1s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .atmate-float-button:hover {
    background: rgba(32, 33, 36, 1);
    transform: scale(1.08);
  }

  .atmate-float-button:active {
    transform: scale(0.95);
  }

  .atmate-float-button svg {
    width: 18px;
    height: 18px;
    fill: #fff;
  }

  .atmate-float-button-tooltip {
    position: absolute;
    top: 50%;
    right: calc(100% + 8px);
    transform: translateY(-50%);
    background: rgba(32, 33, 36, 0.95);
    color: #fff;
    font-size: 12px;
    line-height: 1.4;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .atmate-float-button-host:hover .atmate-float-button-tooltip {
    opacity: 1;
  }
`;

/**
 * Atmate 图标 SVG（内联，不依赖外部图片）。
 * 简化版：对话气泡 + 文字光标，代表"发送到 AI 侧边栏"。
 */
export const ATMATE_ICON_SVG = `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
    <path d="M7 9h10M7 12h6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </svg>
`;
