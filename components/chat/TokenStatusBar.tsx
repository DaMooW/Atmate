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
    <div className="shrink-0 border-t border-border px-4 py-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={colors.text}
          title={`当前对话历史占用的上下文 token / 模型上下文上限。进度条显示占用比例，接近上限时无法发送新消息。${estimated ? '当前为按字符数估算值（±15%），在 API 配置中勾选「请求用量统计」可获得精确值。' : '当前为 API 返回的精确值。'}`}
        >
          {estimated && '≈'}
          {used.toLocaleString()} / {limit.toLocaleString()} tokens
        </span>
        {cumulative !== undefined && (
          <span
            className="shrink-0 text-text-muted"
            title="本会话从开始到现在累计消耗的 token 数（每轮对话累加，只增不减），用于统计对话总用量。"
          >
            累计 {estimated && '≈'}
            {cumulative.toLocaleString()}
          </span>
        )}
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
          style={{ width: `${Math.max(percent, used > 0 ? 1 : 0)}%` }}
        />
      </div>
      {reached && <p className="mt-1.5 text-xs text-danger">上下文已满，无法发送更多消息</p>}
    </div>
  );
}
