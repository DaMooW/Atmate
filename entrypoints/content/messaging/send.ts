/**
 * content script 消息发送封装（M2 T2.2/T2.5/T2.6，D16/D23）。
 *
 * 职责：
 * - 采集选区数据（文本、标题、URL、来源、所有档位上下文）
 * - 发送 AT_SELECTION_SEND 给 background
 * - 处理分流响应：
 *   - delivered: true → 侧边栏已打开，已直接投递（不显示浮动按钮）
 *   - showFloatButton: true → 侧边栏未打开，显示浮动按钮
 * - 浮动按钮点击时发送 AT_FLOAT_BUTTON_CLICK
 */

import type { SelectionSendPayload, SelectionSendResponse, MaterialSource } from '~/core/messages';
import { buildContextData } from '../context/page-content';

/**
 * 采集当前选区和页面信息，构造 payload。
 *
 * D23：一次性采集所有档位的上下文数据（containing-paragraph / nearby / page），
 * 切换档位时直接使用已有数据。
 *
 * @param selection - 当前 Selection 对象
 * @param source - 素材来源（float-button / context-menu / auto-fill）
 * @returns 选区消息 payload（包含所有档位的 contextData）
 */
export async function collectSelectionPayload(
  selection: Selection,
  source: MaterialSource = 'float-button',
): Promise<SelectionSendPayload> {
  // 采集所有档位的上下文数据（D23）
  const contextData = await buildContextData(selection);

  return {
    text: selection.toString(),
    title: document.title,
    url: window.location.href,
    source,
    contextData,
  };
}

/**
 * 发送选区消息给 background，等待分流响应。
 *
 * @param payload - 选区消息 payload
 * @returns 分流响应（delivered / showFloatButton）
 */
export async function sendSelection(payload: SelectionSendPayload): Promise<SelectionSendResponse> {
  return browser.runtime.sendMessage({ type: 'AT_SELECTION_SEND', payload });
}

/**
 * 发送浮动按钮点击消息给 background。
 * background 会调用 sidePanel.open() 并转发暂存的素材。
 */
export async function sendFloatButtonClick(): Promise<void> {
  await browser.runtime.sendMessage({ type: 'AT_FLOAT_BUTTON_CLICK' });
}
