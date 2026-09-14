/**
 * 模型能力表（spec M1 D7 / requirements §4.8）
 *
 * OpenAI 兼容协议无标准 API 动态查询模型能力，故维护预填表。
 * 匹配规则：精确匹配优先，其次前缀匹配（如 deepseek-*），未命中走默认通用配置。
 */

import type { ThinkingLevel } from './types';

export type ThinkingType = 'reasoning_effort' | 'budget_tokens' | 'none' | 'custom';

export interface ModelCapability {
  thinkingType: ThinkingType;
  /** 该模型支持的 level 值（thinkingType=none 时为空数组） */
  levels: string[];
  /** 默认选中的 level */
  defaultLevel: string;
}

type ModelCapabilitiesMap = Record<string, ModelCapability>;

/**
 * 预填常见模型能力。
 * key 为 modelId，支持精确匹配；带 * 后缀的为前缀匹配（如 deepseek-*）。
 */
const CAPABILITIES: ModelCapabilitiesMap = {
  // DeepSeek
  'deepseek-chat': {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },
  'deepseek-reasoner': {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },
  'deepseek-*': {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },

  // OpenAI
  o1: {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },
  'o1-mini': {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },
  o3: {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },
  'o3-mini': {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },
  'gpt-4o': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'gpt-4o-mini': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'gpt-4.1': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'gpt-4.1-mini': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'gpt-4.1-nano': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'gpt-*': { thinkingType: 'none', levels: [], defaultLevel: '' },

  // 智谱 GLM
  'glm-4.5': {
    thinkingType: 'reasoning_effort',
    levels: ['low', 'medium', 'high'],
    defaultLevel: 'medium',
  },
  'glm-4-plus': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'glm-4': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'glm-4-air': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'glm-4-flash': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'glm-*': { thinkingType: 'none', levels: [], defaultLevel: '' },

  // Kimi (Moonshot)
  'moonshot-v1-8k': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'moonshot-v1-32k': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'moonshot-v1-128k': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'moonshot-*': { thinkingType: 'none', levels: [], defaultLevel: '' },

  // Anthropic（通过 OpenAI 兼容代理接入时）
  'claude-3-5-sonnet-*': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'claude-3-opus-*': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'claude-*': { thinkingType: 'none', levels: [], defaultLevel: '' },

  // 通义千问
  'qwen-plus': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'qwen-max': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'qwen-turbo': { thinkingType: 'none', levels: [], defaultLevel: '' },
  'qwen-*': { thinkingType: 'none', levels: [], defaultLevel: '' },
};

/** 未命中能力表时的默认通用配置：四档可选，用户可自行切换 */
const DEFAULT_CAPABILITY: ModelCapability = {
  thinkingType: 'reasoning_effort',
  levels: ['low', 'medium', 'high'],
  defaultLevel: 'medium',
};

/**
 * 查询模型能力。
 * 精确匹配 → 前缀匹配 → 默认通用配置。
 */
export function getModelCapability(modelId: string): ModelCapability {
  if (!modelId) return DEFAULT_CAPABILITY;
  // 精确匹配
  if (CAPABILITIES[modelId]) return CAPABILITIES[modelId]!;
  // 前缀匹配（遍历所有带 * 后缀的 key）
  for (const [key, cap] of Object.entries(CAPABILITIES)) {
    if (key.endsWith('*')) {
      const prefix = key.slice(0, -1);
      if (modelId.startsWith(prefix)) return cap;
    }
  }
  return DEFAULT_CAPABILITY;
}

/**
 * 将模型能力的 level 映射为 ThinkingLevel。
 * 模型能力表中的 level 字符串（low/medium/high）对应 ThinkingLevel 的 light/medium/deep。
 */
export function levelToThinkingLevel(level: string): ThinkingLevel {
  switch (level) {
    case 'low':
      return 'light';
    case 'medium':
      return 'medium';
    case 'high':
      return 'deep';
    default:
      return 'off';
  }
}

/**
 * 将 ThinkingLevel 映射为模型能力表中的 level 字符串。
 */
export function thinkingLevelToLevel(level: ThinkingLevel): string {
  switch (level) {
    case 'light':
      return 'low';
    case 'medium':
      return 'medium';
    case 'deep':
      return 'high';
    default:
      return '';
  }
}
