/**
 * content script 消息发送封装（M2 T2.2/T2.5/T2.6，D16）。
 *
 * 职责：
 * - 采集选区数据（文本、标题、URL、来源、上下文）
 * - 发送 AT_SELECTION_SEND 给 background
 * - 处理分流响应：
 *   - delivered: true → 侧边栏已打开，已直接投递（不显示浮动按钮）
 *   - showFloatButton: true → 侧边栏未打开，显示浮动按钮
 * - 浮动按钮点击时发送 AT_FLOAT_BUTTON_CLICK
 */

import type { SelectionSendPayload, SelectionSendResponse, MaterialSource } from '~/core/messages';
import type { ContextScope } from '~/core/types';
import { buildContextData } from '../context/page-content';

/** 网页侧支持的上下文档位（排除 pdf-full，PDF 页单独处理） */
type WebContextScope = Exclude<ContextScope, 'pdf-full'>;

/**
 * 采集当前选区和页面信息，构造 payload。
 *
 * @param selection - 当前 Selection 对象
 * @param source - 素材来源（float-button / context-menu / auto-fill）
 * @param contextScope - 上下文档位（默认 containing-paragraph，D20）
 * @returns 选区消息 payload（包含 contextData）
 */
export async function collectSelectionPayload(
  selection: Selection,
  source: MaterialSource = 'float-button',
  contextScope: WebContextScope = 'containing-paragraph',
): Promise<SelectionSendPayload> {
  // 根据上下文档位采集 contextData（T2.6）
  const contextData = await buildContextData(selection, contextScope);

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
