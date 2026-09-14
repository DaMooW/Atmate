import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import type { ChatMessage } from '../../core/types';

/**
 * 消息列表（spec M1 T1.5）。
 * 自动滚动到底部，流式增量更新时仅末条消息重渲染。
 */
interface Props {
  messages: ChatMessage[];
  /** 正在流式生成的消息 ID */
  streamingMessageId?: string | null;
  /** 错误信息（展示在消息流末尾） */
  error?: string | null;
  /** 重试回调 */
  onRetry?: () => void;
}

export function MessageList({ messages, streamingMessageId, error, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息或流式增量时自动滚动到底部
  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, lastContent]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-text-muted">
            <p className="text-sm">开始一段对话</p>
            <p className="mt-1 text-xs">输入消息或从网页划词发送</p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} streaming={streamingMessageId === msg.id} />
      ))}

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
          <p className="text-sm text-danger">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 rounded bg-danger px-3 py-1 text-xs font-medium text-white hover:bg-danger/90"
            >
              重试
            </button>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
