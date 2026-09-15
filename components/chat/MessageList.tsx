import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import type { ChatMessage } from '../../core/types';

/**
 * 消息列表（spec M1 T1.5 / UI 改版 T-UI.6）。
 * 自动滚动到底部，流式增量更新时仅末条消息重渲染。
 * 空状态根据是否已配置 API 动态显示引导。
 */
interface Props {
  messages: ChatMessage[];
  /** 正在流式生成的消息 ID */
  streamingMessageId?: string | null;
  /** 错误信息（展示在消息流末尾） */
  error?: string | null;
  /** 重试回调 */
  onRetry?: () => void;
  /** 是否显示 API 配置引导（未配置任何 API 时为 true） */
  showSetupGuide?: boolean;
  /** 点击"去配置 API"按钮的回调 */
  onNavigateToSettings?: () => void;
}

export function MessageList({
  messages,
  streamingMessageId,
  error,
  onRetry,
  showSetupGuide = false,
  onNavigateToSettings,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息或流式增量时自动滚动到底部
  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, lastContent]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center px-6">
          {showSetupGuide ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary"
                >
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <p className="text-sm font-medium">欢迎使用在伴 Atmate</p>
              <p className="mt-1 text-xs text-text-muted">先配置一个 API 端点，即可开始对话</p>
              {onNavigateToSettings && (
                <button
                  onClick={onNavigateToSettings}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90"
                >
                  去配置 API
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-text-muted">
              <p className="text-sm">开始一段对话</p>
              <p className="mt-1 text-xs">输入消息或从网页划词发送</p>
            </div>
          )}
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
