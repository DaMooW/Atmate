/**
 * 请求构造（techniqueStack §6）
 *
 * OpenAI 兼容协议 POST {baseUrl}/chat/completions。
 * 含思维强度字段注入、system 拼装、stream 标志、collectUsage。
 */

import { buildThinkingBody } from '../../core/thinking';
import { buildSystemMessage } from '../../core/systemPrompt';
import type { ApiConfig, ChatMessage, Role } from '../../core/types';

export interface BuildRequestOptions {
  /** 是否流式请求 */
  stream: boolean;
  /** 是否请求 usage（stream_options.include_usage） */
  includeUsage?: boolean;
  /** UI 偏好：是否启用基础指令 */
  baseDirectiveEnabled: boolean;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  stream_options?: { include_usage: boolean };
  // 思维强度字段（按 mapping 注入不同结构）
  [key: string]: unknown;
}

/**
 * 构造完整的 chat completions 请求体。
 *
 * @param config API 配置
 * @param role 当前会话角色
 * @param history 历史消息（不含 system，不含当前用户消息）
 * @param currentMessage 当前用户消息
 * @param options 请求选项
 */
export function buildRequest(
  config: ApiConfig,
  role: Role,
  history: ChatMessage[],
  currentMessage: ChatMessage,
  options: BuildRequestOptions,
): ChatCompletionRequest {
  // 1. 拼装 system message
  const systemMsg = buildSystemMessage(role, {
    baseDirectiveEnabled: options.baseDirectiveEnabled,
  });

  // 2. 历史消息（过滤掉 system，因为我们自己拼装）
  const historyMsgs = history
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  // 3. 当前用户消息
  const userMsg = { role: currentMessage.role, content: currentMessage.content };

  // 4. 基础请求体
  const request: ChatCompletionRequest = {
    model: config.modelId,
    messages: [systemMsg, ...historyMsgs, userMsg],
    stream: options.stream,
  };

  // 5. 思维强度字段注入
  if (config.thinking.enabled) {
    const thinkingBody = buildThinkingBody(config.thinking);
    Object.assign(request, thinkingBody);
  }

  // 6. collectUsage：流式时附 stream_options
  if (options.stream && options.includeUsage) {
    request.stream_options = { include_usage: true };
  }

  // 7. 附加请求体（M5 预留）
  if (config.extraBody) {
    Object.assign(request, config.extraBody);
  }

  // 8. 温度（M5 预留）
  if (config.temperature !== undefined) {
    request.temperature = config.temperature;
  }

  return request;
}

/**
 * 构造请求 URL（去掉 baseUrl 末尾斜杠，拼接 /chat/completions）。
 */
export function buildUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

/**
 * 构造请求头。
 */
export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}
