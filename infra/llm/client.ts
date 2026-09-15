/**
 * LLM 流式客户端（techniqueStack §6）
 *
 * OpenAI 兼容协议，支持：
 * - 流式请求 + SSE 解析
 * - AbortController 停止
 * - 错误分类（中文可读）
 * - collectUsage 探测降级（端点不支持 include_usage 时自动重试一次）
 */

import { buildRequest, buildUrl, buildHeaders } from './requestBuilder';
import { parseSSE } from './sseParser';
import { classifyHttpError, classifyNetworkError, LLMError } from './errors';
import type { ApiConfig, ChatMessage, Role } from '../../core/types';
import type { SSECallbacks } from './sseParser';

export interface StreamChatOptions extends SSECallbacks {
  /** UI 偏好：是否启用基础指令 */
  baseDirectiveEnabled: boolean;
}

export interface StreamChatResult {
  /** 完整正文 */
  content: string;
  /** 完整思维链 */
  reasoning: string;
  /** usage 数据（如有） */
  usage?: { prompt: number; completion: number; total: number };
  /** 本次请求是否实际使用了 collectUsage */
  collectUsageUsed: boolean;
}

export interface StreamChatHandle {
  /** 停止生成 */
  abort: () => void;
  /** Promise，resolve 时流结束 */
  promise: Promise<StreamChatResult>;
}

/**
 * 发起流式聊天请求。
 *
 * @param config API 配置
 * @param role 当前会话角色
 * @param history 历史消息
 * @param currentMessage 当前用户消息
 * @param options 选项（含回调）
 * @returns 句柄：abort() 停止，promise 等待完成
 */
export function streamChat(
  config: ApiConfig,
  role: Role,
  history: ChatMessage[],
  currentMessage: ChatMessage,
  options: StreamChatOptions,
): StreamChatHandle {
  const controller = new AbortController();

  const promise = doStreamChat(config, role, history, currentMessage, options, controller);

  return {
    abort: () => controller.abort(),
    promise,
  };
}

async function doStreamChat(
  config: ApiConfig,
  role: Role,
  history: ChatMessage[],
  currentMessage: ChatMessage,
  options: StreamChatOptions,
  controller: AbortController,
): Promise<StreamChatResult> {
  // collectUsage 探测逻辑：
  // - collectUsageSupported === true：直接带 include_usage
  // - collectUsageSupported === false：不带
  // - collectUsageSupported === null：首次探测，带 include_usage，若 400 则降级重试
  const shouldTryUsage = config.collectUsage && config.collectUsageSupported !== false;

  const request = buildRequest(config, role, history, currentMessage, {
    stream: true,
    includeUsage: shouldTryUsage,
    baseDirectiveEnabled: options.baseDirectiveEnabled,
  });

  try {
    const response = await fetch(buildUrl(config.baseUrl), {
      method: 'POST',
      headers: buildHeaders(config.apiKey),
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        // 忽略解析失败
      }

      // collectUsage 探测降级：首次请求带 include_usage 遇到 400，去掉重试一次
      if (response.status === 400 && shouldTryUsage && config.collectUsageSupported === null) {
        return retryWithoutUsage(config, role, history, currentMessage, options, controller);
      }

      throw classifyHttpError(response.status, body);
    }

    if (!response.body) {
      throw new LLMError('unknown', '响应体为空');
    }

    const result = await parseSSE(response.body, {
      onContent: options.onContent,
      onReasoning: options.onReasoning,
      onUsage: options.onUsage,
      onDone: options.onDone,
      onError: options.onError,
    });

    return {
      content: result.content,
      reasoning: result.reasoning,
      usage: result.usage,
      collectUsageUsed: shouldTryUsage,
    };
  } catch (error) {
    if (error instanceof LLMError) throw error;
    throw classifyNetworkError(error);
  }
}

/**
 * 不带 include_usage 重试一次，并标记探测结果。
 */
async function retryWithoutUsage(
  config: ApiConfig,
  role: Role,
  history: ChatMessage[],
  currentMessage: ChatMessage,
  options: StreamChatOptions,
  controller: AbortController,
): Promise<StreamChatResult> {
  const request = buildRequest(config, role, history, currentMessage, {
    stream: true,
    includeUsage: false,
    baseDirectiveEnabled: options.baseDirectiveEnabled,
  });

  try {
    const response = await fetch(buildUrl(config.baseUrl), {
      method: 'POST',
      headers: buildHeaders(config.apiKey),
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        // 忽略
      }
      throw classifyHttpError(response.status, body);
    }

    if (!response.body) {
      throw new LLMError('unknown', '响应体为空');
    }

    const result = await parseSSE(response.body, {
      onContent: options.onContent,
      onReasoning: options.onReasoning,
      onUsage: options.onUsage,
      onDone: options.onDone,
      onError: options.onError,
    });

    return {
      content: result.content,
      reasoning: result.reasoning,
      usage: result.usage,
      collectUsageUsed: false,
    };
  } catch (error) {
    if (error instanceof LLMError) throw error;
    throw classifyNetworkError(error);
  }
}
