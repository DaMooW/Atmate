import { useState } from 'react';
import type { MaterialCard as MaterialCardType } from './materialTypes';
import { estimateTextTokens } from './promptBuilder';

/**
 * 单张素材卡片（M2 T2.4，D3/D18/D19/D20/D23）。
 *
 * 功能：
 * - 来源角标（浮动按钮/右键菜单/自动填充）
 * - 页面标题 + URL
 * - 可编辑原文
 * - 上下文档位切换（selection/containing-paragraph/nearby/page，D23：所有档位数据已预采集）
 * - token 预览
 * - 已采用状态标识（D18：创建后默认已采用）
 * - 移除按钮（D19：移除后不参与本次发送的 prompt 组装）
 */

interface Props {
  card: MaterialCardType;
  /** 移除卡片：不参与本次发送的 prompt 组装 */
  onRemove: (cardId: string) => void;
  /** 更新卡片字段（原文编辑、档位切换、补充说明、采用状态切换） */
  onUpdate: (cardId: string, updates: Partial<MaterialCardType>) => void;
}

/** 来源角标显示文本 */
const SOURCE_LABEL: Record<MaterialCardType['source'], string> = {
  'float-button': '浮动按钮',
  'context-menu': '右键菜单',
  'auto-fill': '自动填充',
};

/** 上下文档位选项（D20：默认 containing-paragraph） */
const CONTEXT_SCOPE_OPTIONS: Array<{ value: MaterialCardType['contextScope']; label: string }> = [
  { value: 'selection', label: '仅选区' },
  { value: 'containing-paragraph', label: '所在段落' },
  { value: 'nearby', label: '±相邻段落' },
  { value: 'page', label: '整页正文' },
];

export function MaterialCard({ card, onRemove, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);

  // 估算 token（原文）
  const estimatedTokens = estimateTextTokens(card.text);

  return (
    <div className="bg-surface-secondary rounded-lg border border-border p-3">
      {/* 顶部：已采用标识 + 来源角标 + 页面信息 + 移除按钮 */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* D18：已采用状态标识 */}
            <span className="rounded bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success">
              已采用
            </span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {SOURCE_LABEL[card.source]}
            </span>
            <span className="truncate text-xs text-text-muted">{card.title || '无标题'}</span>
          </div>
          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block truncate text-xs text-text-muted hover:text-primary"
            >
              {card.url}
            </a>
          )}
        </div>
        <button
          onClick={() => onRemove(card.id)}
          className="hover:bg-surface-hover shrink-0 rounded p-1 text-text-muted hover:text-danger"
          title="移除（不参与本次发送）"
          aria-label="移除素材卡片"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
          </svg>
        </button>
      </div>

      {/* 原文（可编辑） */}
      <div className="mb-2">
        {editing ? (
          <textarea
            value={card.text}
            onChange={(e) => onUpdate(card.id, { text: e.target.value })}
            onBlur={() => setEditing(false)}
            autoFocus
            rows={3}
            aria-label="编辑原文"
            className="w-full rounded border border-border bg-surface p-2 text-sm"
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="cursor-text rounded border border-transparent bg-surface p-2 text-sm hover:border-border"
            title="点击编辑原文"
          >
            {card.text}
          </div>
        )}
      </div>

      {/* 上下文档位切换（D20：默认所在段落） */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-text-muted">上下文：</span>
        <div className="flex flex-wrap gap-1">
          {CONTEXT_SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate(card.id, { contextScope: opt.value })}
              className={`rounded px-2 py-0.5 text-xs ${
                card.contextScope === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-surface-hover text-text-muted hover:bg-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 底部：token 预览 + 发送时自动带入提示（D19） */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">约 {estimatedTokens} tokens</span>
        <span className="text-xs text-text-muted">发送时自动带入</span>
      </div>
    </div>
  );
}
