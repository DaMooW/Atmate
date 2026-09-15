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
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser ? 'bg-primary text-white' : 'bg-surface-2 text-text'
        }`}
      >
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="markdown-body text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {message.content}
            </ReactMarkdown>
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-text-muted" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
