import { contextLevel, contextPercent, type ContextLevel } from '../../core/tokens';

/**
 * Token 状态条（spec M1 T1.6）。
 * 常驻显示上下文占用与上限，三段变色，达限禁发提示。
 */
interface Props {
  /** 当前上下文已用 token（估算或精确） */
  used: number;
  /** 上下文上限 token */
  limit: number;
  /** 会话累计 token */
  cumulative?: number;
  /** 是否为估算模式（数字前加 ≈） */
  estimated?: boolean;
}

const LEVEL_COLORS: Record<ContextLevel, { bar: string; text: string }> = {
  normal: { bar: 'bg-primary', text: 'text-text-muted' },
  warning: { bar: 'bg-warning', text: 'text-warning' },
  danger: { bar: 'bg-danger', text: 'text-danger' },
};

export function TokenStatusBar({ used, limit, cumulative, estimated = true }: Props) {
  const percent = contextPercent(used, limit);
  const level = contextLevel(percent);
  const colors = LEVEL_COLORS[level];
  const reached = used >= limit;

  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className={colors.text} title={estimated ? '按字符数估算，±15%' : 'API 返回精确值'}>
          {estimated && '≈'}
          {used.toLocaleString()} / {limit.toLocaleString()} tokens
        </span>
        {cumulative !== undefined && (
          <span className="text-text-muted" title="会话累计 token">
            累计 {estimated && '≈'}
            {cumulative.toLocaleString()}
          </span>
        )}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {reached && <p className="mt-1 text-xs text-danger">上下文已满，无法发送更多消息</p>}
    </div>
  );
}
