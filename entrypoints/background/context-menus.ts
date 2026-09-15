/**
 * 右键菜单（M2 T2.3，D14）。
 *
 * 职责：
 * - 创建右键菜单项"发送选中内容到在伴 AI 侧边栏"（selection 上下文）
 * - 点击菜单项时，取 selectionText + tab.title + tab.url，走与浮动按钮相同的分流逻辑
 * - selectionText 为空时忽略（不发送、不打开面板）
 */

import { handleSelectionSend } from './messaging-router';
import type { SelectionSendPayload } from '~/core/messages';

/** 右键菜单 ID */
export const CONTEXT_MENU_ID = 'at-send-selection';

/** 右键菜单标题 */
export const CONTEXT_MENU_TITLE = '发送选中内容到在伴 AI 侧边栏';

/**
 * 初始化右键菜单。
 * 在 background main() 中调用一次。
 */
export function initContextMenus(): void {
  // 移除旧菜单（防止重复创建）
  browser.contextMenus.removeAll(() => {
    // 创建 selection 上下文菜单
    browser.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: CONTEXT_MENU_TITLE,
      contexts: ['selection'],
    });
  });

  // 监听菜单点击
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;

    // selectionText 为空时忽略（用户可能在非文本区域右键）
    const selectionText = info.selectionText?.trim();
    if (!selectionText) return;

    // 构造 payload，走与浮动按钮相同的分流逻辑
    const payload: SelectionSendPayload = {
      text: info.selectionText ?? '', // 保留原始空白（不 trim），与浮动按钮行为一致
      title: tab?.title ?? '',
      url: tab?.url ?? '',
      source: 'context-menu',
    };

    handleSelectionSend(payload);
  });
}
