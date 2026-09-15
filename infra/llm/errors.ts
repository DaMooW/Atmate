/**
 * LLM 错误分类（techniqueStack §6 / NFR-4）
 *
 * HTTP 状态码 → 中文可读错误类型，供 UI 展示与重试决策。
 */

export type LLMErrorType =
  | 'auth' // 401/403：API Key 无效或无权限
  | 'not_found' // 404：Base URL 或模型 ID 有误
  | 'rate_limit' // 429：限流
  | 'bad_request' // 400：请求参数错误
  | 'server' // 5xx：服务端错误
  | 'network' // 网络连接失败
  | 'aborted' // 用户主动停止
  | 'unknown'; // 其他

export class LLMError extends Error {
  readonly type: LLMErrorType;
  readonly status?: number;
  readonly raw?: unknown;

  constructor(type: LLMErrorType, message: string, status?: number, raw?: unknown) {
    super(message);
    this.name = 'LLMError';
    this.type = type;
    this.status = status;
    this.raw = raw;
  }
}

/**
 * 根据 HTTP 状态码分类错误。
 */
export function classifyHttpError(status: number, body?: unknown): LLMError {
  let type: LLMErrorType;
  let message: string;

  switch (status) {
    case 401:
    case 403:
      type = 'auth';
      message = 'API Key 无效或无权限，请检查 Key 是否正确';
      break;
    case 404:
      type = 'not_found';
      message = '请求地址不存在，请检查 Base URL 和模型 ID 是否正确';
      break;
    case 429:
      type = 'rate_limit';
      message = '请求过于频繁，已被限流，请稍后重试';
      break;
    case 400:
      type = 'bad_request';
      message = '请求参数有误，请检查配置';
      break;
    default:
      if (status >= 500) {
        type = 'server';
        message = `服务端错误（${status}），请稍后重试或联系服务方`;
      } else {
        type = 'unknown';
        message = `未知错误（HTTP ${status}）`;
      }
  }

  // 尝试从响应体提取更具体的错误信息
  if (body && typeof body === 'object') {
    const err = (body as { error?: { message?: string } }).error;
    if (err?.message) {
      message = `${message}：${err.message}`;
    }
  }

  return new LLMError(type, message, status, body);
}

/**
 * 将 fetch 抛出的网络错误分类。
 */
export function classifyNetworkError(error: unknown): LLMError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new LLMError('aborted', '已停止生成', undefined, error);
  }
  if (error instanceof TypeError) {
    return new LLMError(
      'network',
      '网络连接失败，请检查网络或 Base URL 是否可访问',
      undefined,
      error,
    );
  }
  return new LLMError(
    'unknown',
    error instanceof Error ? error.message : '未知错误',
    undefined,
    error,
  );
}
