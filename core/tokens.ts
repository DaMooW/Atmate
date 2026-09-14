/**
 * Token 估算（techniqueStack §7）
 *
 * M1 简化版：按字符数估算（中文约 1 char = 1 token，英文约 4 chars = 1 token）。
 * T1.8 会完善为更精确的估算（基于 cl100k_base 等分词规则的近似）。
 * 精确模式（API usage）在流式结束后覆盖估算值。
 */

/**
 * 估算文本的 token 数。
 *
 * 规则：
 * - CJK 统一表意文字（中文/日文/韩文）：1 字符 ≈ 1 token
 * - 其他字符（英文/数字/标点/空白）：4 字符 ≈ 1 token
 *
 * @param text 输入文本
 * @returns 估算的 token 数
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let cjkCount = 0;
  let otherCount = 0;

  for (const char of text) {
    const code = char.codePointAt(0)!;
    // CJK 统一表意文字范围
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
      (code >= 0x3040 && code <= 0x30ff) || // Hiragana + Katakana
      (code >= 0xac00 && code <= 0xd7af) // Hangul Syllables
    ) {
      cjkCount++;
    } else {
      otherCount++;
    }
  }

  return cjkCount + Math.ceil(otherCount / 4);
}

/**
 * 估算消息列表的总 token 数。
 */
export function estimateMessagesTokens(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
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
