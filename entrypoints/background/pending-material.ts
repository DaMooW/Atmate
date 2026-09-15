/**
 * 暂存素材（M2 T2.5，D11/D16）。
 *
 * 侧边栏未打开时，划词消息暂存于此。
 * 浮动按钮点击后 sidePanel.open()，等 sidepanel 发送 AT_PANEL_READY 后转发暂存。
 *
 * 注意：这是内存状态，SW 被杀后丢失。
 * 但浮动按钮点击会触发 sidePanel.open()，sidepanel 打开后用户可以重新划词，
 * 或者 SW 被杀前暂存的消息丢失是可接受的（用户仍可看到浮动按钮，重新点击即可）。
 */

import type { SelectionSendPayload } from '~/core/messages';

let pendingMaterial: SelectionSendPayload | null = null;

/** 暂存素材（覆盖旧暂存，以最新选区为准） */
export function setPending(payload: SelectionSendPayload): void {
  pendingMaterial = payload;
}

/** 取出暂存并清空 */
export function getPendingAndClear(): SelectionSendPayload | null {
  const material = pendingMaterial;
  pendingMaterial = null;
  return material;
}

/** 是否有暂存 */
export function hasPending(): boolean {
  return pendingMaterial !== null;
}

/**
 * 测试用：重置暂存状态。
 * 仅在测试中调用，生产代码不应使用。
 */
export function _resetPendingForTesting(): void {
  pendingMaterial = null;
}
