/**
 * 思维强度映射构造（tech §5 ThinkingConfig / spec M1 T1.2）
 * 将 Thinking 配置转换为请求体中的字段。
 * 纯函数，可单测。
 */

import type { Thinking, ThinkingLevel } from './types';

/**
 * 根据 Thinking 配置构造请求体中应注入的思维强度字段。
 * level=off 时返回空对象（不注入任何字段）。
 *
 * @returns 要合并进请求体的对象，如 { reasoning_effort: "medium" } 或 { thinking: { type: "enabled", budget_tokens: 8000 } }
 */
export function buildThinkingBody(thinking: Thinking): Record<string, unknown> {
  if (!thinking.enabled || thinking.level === 'off') {
    return {};
  }

  const { config, level } = thinking;
  const levelValue = config.values[level as Exclude<ThinkingLevel, 'off'>];

  switch (config.mapping) {
    case 'reasoning_effort':
      return { reasoning_effort: levelValue };

    case 'budget_tokens':
      return {
        thinking: {
          type: 'enabled',
          budget_tokens: Number(levelValue),
        },
      };

    case 'custom': {
      if (!config.customTemplate) return {};
      // {{level}} 插值：替换为当前档位对应的值
      const interpolated = config.customTemplate.replace(/\{\{level\}\}/g, String(levelValue));
      try {
        return JSON.parse(interpolated) as Record<string, unknown>;
      } catch {
        // 模板不是合法 JSON 时，返回空对象（调用方应在保存前校验）
        return {};
      }
    }

    default:
      return {};
  }
}

/**
 * 创建默认的 Thinking 配置。
 * @param mapping 映射方式
 * @param levels 各档位的值
 */
export function createDefaultThinking(
  mapping: 'reasoning_effort' | 'budget_tokens' | 'custom' = 'reasoning_effort',
): Thinking {
  const values: Record<Exclude<ThinkingLevel, 'off'>, string | number> = mapping === 'budget_tokens'
    ? { light: 2000, medium: 4000, deep: 8000 }
    : { light: 'low', medium: 'medium', deep: 'high' };

  return {
    enabled: true,
    level: 'medium',
    config: {
      mapping,
      values,
      customTemplate: mapping === 'custom' ? '{"reasoning_effort":"{{level}}"}' : undefined,
    },
  };
}
