/**
 * sidepanel 打开状态维护（M2 T2.5，D16）。
 *
 * 通过 long-lived port 检测 sidepanel 是否打开：
 * - sidepanel 启动时 chrome.runtime.connect({ name: 'at-sidepanel' })
 * - background 收到 onConnect → panelOpen = true
 * - sidepanel 关闭时 port 自动断开 → onDisconnect → panelOpen = false
 *
 * 注意：这是内存状态，SW 被杀后会重置为 false。
 * 但 sidepanel 重新连接时会再次触发 onConnect，状态会恢复。
 * 若 SW 被杀时 sidepanel 仍打开，下次消息到达时 panelOpen 可能短暂为 false，
 * 此时会走"显示浮动按钮"分支——用户点击后 sidePanel.open() 会重新激活 sidepanel，
 * sidepanel 重新 connect，状态恢复正确。这是可接受的降级行为。
 */

import { SIDEPANEL_PORT_NAME } from '~/core/messages';

let panelOpen = false;

/** sidepanel 是否打开 */
export function isPanelOpen(): boolean {
  return panelOpen;
}

/**
 * 初始化 panelOpen 状态监听。
 * 在 background main() 中调用一次。
 */
export function initPanelState(): void {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === SIDEPANEL_PORT_NAME) {
      panelOpen = true;
      port.onDisconnect.addListener(() => {
        panelOpen = false;
      });
    }
  });
}

/**
 * 测试用：重置 panelOpen 状态。
 * 仅在测试中调用，生产代码不应使用。
 */
export function _resetPanelStateForTesting(): void {
  panelOpen = false;
}
