import { useState, useRef, useEffect } from 'react';

/**
 * 输入框组件（spec M1 T1.5）。
 * Enter 发送，Shift+Enter 换行；流式中显示停止按钮。
 */
interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  /** 是否正在流式生成 */
  streaming: boolean;
  /** 是否禁用（无激活配置/无角色） */
  disabled?: boolean;
  /** 禁用原因提示 */
  disabledReason?: string;
}

export function Composer({ onSend, onStop, streaming, disabled, disabledReason }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || streaming || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-border p-3">
      {disabled && disabledReason && (
        <p className="mb-2 text-xs text-text-muted">{disabledReason}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? '请先配置 API 并选择角色' : '输入消息...（Enter 发送，Shift+Enter 换行）'
          }
          disabled={disabled || streaming}
          rows={1}
          className="input min-h-[40px] flex-1 resize-none"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="shrink-0 rounded bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90"
          >
            停止
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="shrink-0 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            发送
          </button>
        )}
      </div>
    </div>
  );
}
