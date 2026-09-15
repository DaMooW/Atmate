import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import type { ChatMessage } from '../../core/types';

/**
 * 单条消息渲染（spec M1 T1.5）。
 * user 消息右对齐，assistant 消息左对齐，Markdown + 代码高亮。
 */
interface Props {
  message: ChatMessage;
  /** 是否正在流式生成中（显示光标） */
  streaming?: boolean;
}

export function MessageItem({ message, streaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'rounded-br-md bg-primary text-white shadow-sm'
            : 'rounded-bl-md border border-border bg-surface text-text shadow-sm'
        }`}
      >
        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="markdown-body text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {message.content}
            </ReactMarkdown>
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-text-muted" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
