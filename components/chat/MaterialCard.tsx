import { useState } from 'react';
import type { MaterialCard as MaterialCardType } from './materialTypes';
import { estimateTextTokens } from './promptBuilder';

/**
 * 单张素材卡片（M2 T2.4，D3）。
 *
 * 功能：
 * - 来源角标（浮动按钮/右键菜单/自动填充）
 * - 页面标题 + URL
 * - 可编辑原文
 * - 上下文档位切换（selection/nearby/page）
 * - 用户补充说明
 * - token 预览
 * - 采用 / 丢弃
 */

interface Props {
  card: MaterialCardType;
  /** 采用卡片：将组装后的文本填入输入框 */
  onAdopt: (card: MaterialCardType) => void;
  /** 丢弃卡片：从列表中移除 */
  onDiscard: (cardId: string) => void;
  /** 更新卡片字段（原文编辑、档位切换、补充说明） */
  onUpdate: (cardId: string, updates: Partial<MaterialCardType>) => void;
}

/** 来源角标显示文本 */
const SOURCE_LABEL: Record<MaterialCardType['source'], string> = {
  'float-button': '浮动按钮',
  'context-menu': '右键菜单',
  'auto-fill': '自动填充',
};

/** 上下文档位选项 */
const CONTEXT_SCOPE_OPTIONS: Array<{ value: MaterialCardType['contextScope']; label: string }> = [
  { value: 'selection', label: '仅选区' },
  { value: 'nearby', label: '±相邻段落' },
  { value: 'page', label: '整页正文' },
];

export function MaterialCard({ card, onAdopt, onDiscard, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);

  // 估算 token（原文 + 补充说明）
  const estimatedTokens = estimateTextTokens(card.text) + estimateTextTokens(card.userNote);

  return (
    <div className="bg-surface-secondary rounded-lg border border-border p-3">
      {/* 顶部：来源角标 + 页面信息 + 丢弃按钮 */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
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
          onClick={() => onDiscard(card.id)}
          className="hover:bg-surface-hover shrink-0 rounded p-1 text-text-muted hover:text-danger"
          title="丢弃"
          aria-label="丢弃素材卡片"
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

      {/* 上下文档位切换 */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-text-muted">上下文：</span>
        <div className="flex gap-1">
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

      {/* 用户补充说明 */}
      <div className="mb-2">
        <input
          type="text"
          value={card.userNote}
          onChange={(e) => onUpdate(card.id, { userNote: e.target.value })}
          placeholder="补充说明（可选）..."
          className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
        />
      </div>

      {/* 底部：token 预览 + 采用按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">约 {estimatedTokens} tokens</span>
        <button
          onClick={() => onAdopt(card)}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
        >
          采用
        </button>
      </div>
    </div>
  );
}
