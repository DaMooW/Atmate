/**
 * API 配置连接测试（spec M1 T1.2）
 * 发送一条最小非流式请求验证配置是否可用。
 */

import type { ApiConfig } from '../../core/types';

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  status?: number;
}

/**
 * 测试 API 配置是否可用。
 * 发送一条最小请求（非流式），验证 Base URL、API Key、模型 ID 是否正确。
 */
export async function testConnection(config: ApiConfig): Promise<ConnectionTestResult> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        max_tokens: 1,
      }),
    });

    if (response.ok) {
      return { ok: true, message: '连接成功', status: response.status };
    }

    // 尝试读取错误详情
    let errorDetail = '';
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      errorDetail = data.error?.message ?? '';
    } catch {
      // 忽略解析错误
    }

    const message = classifyError(response.status, errorDetail);
    return { ok: false, message, status: response.status };
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      return { ok: false, message: '网络连接失败，请检查 Base URL 和网络' };
    }
    return { ok: false, message: `连接失败：${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * 将 HTTP 状态码分类为中文提示（tech §6 错误分类）。
 */
function classifyError(status: number, detail: string): string {
  const suffix = detail ? `（${detail}）` : '';
  switch (status) {
    case 401:
    case 403:
      return `API Key 无效或无权限${suffix}`;
    case 404:
      return `Base URL 或模型 ID 有误${suffix}`;
    case 429:
      return `请求限流，请稍后重试${suffix}`;
    case 400:
      return `请求参数错误${suffix}`;
    default:
      if (status >= 500) {
        return `服务端错误（${status}）${suffix}`;
      }
      return `请求失败（HTTP ${status}）${suffix}`;
  }
}
