/**
 * 会话相关纯函数（spec M1 T1.7）。
 */

import type { ChatMessage, Session } from './types';

/**
 * 从消息列表生成会话标题。
 * 取首条用户消息前 20 字；无消息时返回"新会话"。
 */
export function generateSessionTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return '新会话';
  const content = firstUserMsg.content.trim();
  if (!content) return '新会话';
  return content.length > 20 ? `${content.slice(0, 20)}...` : content;
}

/**
 * 按 updatedAt 降序排序会话。
 */
export function sortSessionsByUpdatedAt(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 更新会话的消息和标题（发送消息后调用）。
 */
export function updateSessionMessages(
  sessions: Session[],
  sessionId: string,
  messages: ChatMessage[],
  title?: string,
): Session[] {
  return sessions.map((s) =>
    s.id === sessionId ? { ...s, messages, title: title ?? s.title, updatedAt: Date.now() } : s,
  );
}

/**
 * 删除会话。
 */
export function deleteSession(sessions: Session[], sessionId: string): Session[] {
  return sessions.filter((s) => s.id !== sessionId);
}

/**
 * 重命名会话。
 */
export function renameSession(sessions: Session[], sessionId: string, title: string): Session[] {
  return sessions.map((s) => (s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s));
}
