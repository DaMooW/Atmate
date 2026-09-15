/**
 * contextLimit 预填表（tech §7）
 * modelId → 上下文上限 token 数。
 * 命中自动填，未命中要求手填（保存前必填校验）。
 * 支持精确匹配 + 前缀匹配。
 */

type ContextLimitMap = Record<string, number>;

const LIMITS: ContextLimitMap = {
  // OpenAI
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4.1': 1047576,
  'gpt-4.1-mini': 1047576,
  'gpt-4.1-nano': 1047576,
  o1: 200000,
  'o1-mini': 128000,
  o3: 200000,
  'o3-mini': 200000,
  'gpt-4-turbo': 128000,
  'gpt-*': 128000,

  // DeepSeek
  'deepseek-chat': 128000,
  'deepseek-reasoner': 128000,
  'deepseek-*': 128000,

  // 智谱 GLM
  'glm-4.5': 128000,
  'glm-4-plus': 128000,
  'glm-4': 128000,
  'glm-4-air': 128000,
  'glm-4-flash': 128000,
  'glm-*': 128000,

  // Kimi (Moonshot)
  'moonshot-v1-8k': 8000,
  'moonshot-v1-32k': 32000,
  'moonshot-v1-128k': 128000,
  'moonshot-*': 128000,

  // Anthropic
  'claude-3-5-sonnet-*': 200000,
  'claude-3-opus-*': 200000,
  'claude-3-haiku-*': 200000,
  'claude-*': 200000,

  // 通义千问
  'qwen-plus': 131072,
  'qwen-max': 32768,
  'qwen-turbo': 131072,
  'qwen-*': 131072,

  // 硅基流动常见模型
  'Qwen/Qwen2.5-72B-Instruct': 131072,
  'Qwen/*': 131072,
  'deepseek-ai/DeepSeek-V3': 128000,
  'deepseek-ai/DeepSeek-R1': 128000,
  'deepseek-ai/*': 128000,
};

/** 未命中时返回 null，表示需要用户手填 */
export function getContextLimit(modelId: string): number | null {
  if (!modelId) return null;
  if (LIMITS[modelId] !== undefined) return LIMITS[modelId]!;
  for (const [key, limit] of Object.entries(LIMITS)) {
    if (key.endsWith('*')) {
      const prefix = key.slice(0, -1);
      if (modelId.startsWith(prefix)) return limit;
    }
  }
  return null;
}
