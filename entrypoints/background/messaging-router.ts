/**
 * 消息路由与分流（M2 T2.5，D16 核心）。
 *
 * 分流逻辑：
 * - AT_SELECTION_SEND（来自 content script / 右键菜单）：
 *   - panelOpen === true → 直接转发 AT_SELECTION_DELIVER 给 sidepanel → 回复 { delivered: true }
 *   - panelOpen === false → 暂存 payload → 回复 { delivered: false, showFloatButton: true }
 * - AT_FLOAT_BUTTON_CLICK（来自 content script）：
 *   - sidePanel.open({ windowId }) → 暂存的 payload 等 AT_PANEL_READY 后转发
 * - AT_PANEL_READY（来自 sidepanel）：
 *   - 有暂存 → 转发 AT_SELECTION_DELIVER → 清空暂存
 *   - 无暂存 → 忽略
 */

import { isPanelOpen } from './panel-state';
import { setPending, hasPending, getPendingAndClear } from './pending-material';
import type {
  SelectionSendPayload,
  SelectionSendResponse,
  ExtensionMessage,
} from '~/core/messages';

/** background onMessage 的 sender 类型（只需 tab.windowId） */
interface MessageSender {
  tab?: { windowId?: number };
}

/**
 * 处理选区消息（分流核心）。
 * @param payload - 选区消息 payload
 * @returns 分流结果（回复给 content script）
 */
export function handleSelectionSend(payload: SelectionSendPayload): SelectionSendResponse {
  if (isPanelOpen()) {
    // 侧边栏已打开：直接转发给 sidepanel（零点击）
    browser.runtime.sendMessage({ type: 'AT_SELECTION_DELIVER', payload });
    return { delivered: true };
  }

  // 侧边栏未打开：暂存，回复 content script 显示浮动按钮
  setPending(payload);
  return { delivered: false, showFloatButton: true };
}

/**
 * 处理浮动按钮点击。
 * @param windowId - 当前窗口 ID（用于 sidePanel.open）
 */
export function handleFloatButtonClick(windowId: number): void {
  browser.sidePanel.open({ windowId });
  // 暂存的 payload 已在 pending-material 中
  // sidepanel 打开后会发送 AT_PANEL_READY，触发转发
}

/**
 * 处理 sidepanel 就绪通知。
 * 有暂存则转发，无暂存则忽略。
 */
export function handlePanelReady(): void {
  if (hasPending()) {
    const payload = getPendingAndClear();
    if (payload) {
      browser.runtime.sendMessage({ type: 'AT_SELECTION_DELIVER', payload });
    }
  }
}

/**
 * background onMessage 统一入口。
 * 根据消息类型分发到对应处理函数。
 *
 * @param message - 消息对象
 * @param sender - 发送者信息（含 tab，用于获取 windowId）
 * @param sendResponse - 回复函数（异步回复需 return true）
 * @returns true 表示异步回复（保持通道开放），false 表示同步回复或不回复
 */
export function handleMessage(
  message: ExtensionMessage,
  sender: MessageSender,
  sendResponse: (response: SelectionSendResponse) => void,
): boolean {
  switch (message.type) {
    case 'AT_SELECTION_SEND': {
      const response = handleSelectionSend(message.payload);
      sendResponse(response);
      return false; // 同步回复
    }
    case 'AT_FLOAT_BUTTON_CLICK': {
      const windowId = sender.tab?.windowId;
      if (windowId !== undefined) {
        handleFloatButtonClick(windowId);
      }
      return false; // 不需要回复
    }
    case 'AT_PANEL_READY': {
      handlePanelReady();
      return false; // 不需要回复
    }
    default:
      return false; // 未知消息，不处理
  }
}
