import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * 输入框组件（spec M1 T1.5，M2 T2.4 扩展）。
 * Enter 发送，Shift+Enter 换行；流式中显示停止按钮。
 *
 * M2 扩展：通过 ref 暴露 setText/appendText 方法，供素材卡片"采用"时填入。
 */

export interface ComposerHandle {
  /** 设置输入框文本（覆盖） */
  setText: (text: string) => void;
  /** 追加文本到输入框（换行分隔） */
  appendText: (text: string) => void;
  /** 获取当前输入框文本 */
  getText: () => string;
  /** 聚焦输入框 */
  focus: () => void;
}

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

export const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { onSend, onStop, streaming, disabled, disabledReason },
  ref,
) {
  const [text, setTextState] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    setText: (newText: string) => {
      setTextState(newText);
    },
    appendText: (newText: string) => {
      setTextState((prev) => (prev ? `${prev}\n\n${newText}` : newText));
    },
    getText: () => text,
    focus: () => textareaRef.current?.focus(),
  }));

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
    setTextState('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
      {disabled && disabledReason && (
        <p className="mb-2 text-xs text-text-muted">{disabledReason}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setTextState(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '输入消息...' : '输入消息...（Enter 发送，Shift+Enter 换行）'}
          disabled={disabled || streaming}
          rows={1}
          className="input min-h-[40px] flex-1 resize-none"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="shrink-0 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90"
          >
            停止
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            发送
          </button>
        )}
      </div>
    </div>
  );
});
