/**
 * Token 计量（techniqueStack §7）
 *
 * 三级策略，按优先级降级：
 * 1. 精确：API 返回 usage → 逐条消息记录，会话累计求和
 * 2. 估算（无 usage 时）：tokens ≈ ceil(总字符数 / 3.2)（混合系数，±15%）
 * 3. 校准【加分】：设置里允许用户改全局估算系数
 *
 * 引入浏览器端 BPE 库（js-tiktoken/gpt-tokenizer）暂缓，待 M5 评估。
 */

/** 默认估算系数（总字符数 / 3.2 ≈ token 数） */
export const DEFAULT_TOKEN_RATIO = 3.2;

/**
 * 估算文本的 token 数。
 *
 * 公式：tokens ≈ ceil(总字符数 / ratio)
 * 系数对中英混合在主流 BPE 分词下经验值 ±15%。
 *
 * @param text 输入文本
 * @param ratio 估算系数，默认 3.2
 * @returns 估算的 token 数
 */
export function estimateTokens(text: string, ratio: number = DEFAULT_TOKEN_RATIO): number {
  if (!text) return 0;
  return Math.ceil(text.length / ratio);
}

/**
 * 估算消息列表的总 token 数。
 *
 * 序列化所有消息（role + content）后估算，模拟实际发送的 token 开销。
 * 每条消息额外加 4 token 的 role/结构开销（经验值）。
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>,
  ratio: number = DEFAULT_TOKEN_RATIO,
): number {
  if (messages.length === 0) return 0;
  const serialized = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  // 每条消息额外 4 token 的结构开销
  return estimateTokens(serialized, ratio) + messages.length * 4;
}

/**
 * 计算单轮对话的 token 消耗。
 * 用于会话累计：本轮 user + assistant 的 token 估算（或精确值）。
 */
export function estimateRoundTokens(
  userMessage: { content: string },
  assistantMessage: { content: string; usage?: { total: number } },
  ratio: number = DEFAULT_TOKEN_RATIO,
): number {
  // 有精确 usage 时用精确值
  if (assistantMessage.usage?.total) {
    return assistantMessage.usage.total;
  }
  // 无 usage 时估算 user + assistant
  return (
    estimateTokens(userMessage.content, ratio) + estimateTokens(assistantMessage.content, ratio)
  );
}

/**
 * 计算上下文占用百分比。
 */
export function contextPercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, (used / limit) * 100);
}

/**
 * 上下文状态等级（用于三段变色）。
 */
export type ContextLevel = 'normal' | 'warning' | 'danger';

/**
 * 根据占用百分比判断等级。
 * - <70%: normal
 * - ≥70% 且 <90%: warning
 * - ≥90%: danger
 */
export function contextLevel(percent: number): ContextLevel {
  if (percent >= 90) return 'danger';
  if (percent >= 70) return 'warning';
  return 'normal';
}

/**
 * 是否达到发送限制（占用 ≥ 上限）。
 */
export function isContextLimitReached(used: number, limit: number): boolean {
  return used >= limit;
}
