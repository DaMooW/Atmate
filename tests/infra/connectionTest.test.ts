import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testConnection } from '../../infra/llm/connectionTest';
import type { ApiConfig } from '../../core/types';

/**
 * L2 infra 层测试：连接测试（spec M1 T1.2）。
 * mock 全局 fetch，验证各种 HTTP 状态和网络错误的分类。
 */

const mockConfig: ApiConfig = {
  id: 'test',
  name: 'Test',
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'sk-test',
  modelId: 'test-model',
  contextLimit: 128000,
  thinking: {
    enabled: false,
    level: 'off',
    config: {
      mapping: 'reasoning_effort',
      values: { light: 'low', medium: 'medium', deep: 'high' },
    },
  },
  collectUsage: true,
  collectUsageSupported: null,
  vision: false,
};

function mockFetchResponse(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body ?? {},
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('infra/llm/connectionTest', () => {
  it('200 成功', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { choices: [] }));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(true);
    expect(result.message).toBe('连接成功');
    expect(result.status).toBe(200);
  });

  it('401 分类为 API Key 无效', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(401, { error: { message: 'invalid key' } }));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('API Key');
  });

  it('403 分类为 API Key 无效', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(403));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('API Key');
  });

  it('404 分类为 Base URL 或模型 ID 有误', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(404));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Base URL');
  });

  it('429 分类为限流', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(429));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('限流');
  });

  it('400 分类为请求参数错误', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(400));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('请求参数');
  });

  it('500 分类为服务端错误', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(500));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('服务端错误');
  });

  it('网络错误（fetch 抛 TypeError）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('网络连接失败');
  });

  it('其他错误透传消息', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unknown error')));
    const result = await testConnection(mockConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('unknown error');
  });

  it('请求 URL 正确拼接（去掉末尾斜杠）', async () => {
    const fetchSpy = mockFetchResponse(200);
    vi.stubGlobal('fetch', fetchSpy);
    await testConnection({ ...mockConfig, baseUrl: 'https://api.example.com/v1/' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('请求头包含 Authorization', async () => {
    const fetchSpy = mockFetchResponse(200);
    vi.stubGlobal('fetch', fetchSpy);
    await testConnection(mockConfig);
    const [, options] = fetchSpy.mock.calls[0]!;
    expect((options as RequestInit).headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer sk-test' }),
    );
  });

  it('请求体包含 model 和 messages', async () => {
    const fetchSpy = mockFetchResponse(200);
    vi.stubGlobal('fetch', fetchSpy);
    await testConnection(mockConfig);
    const [, options] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.model).toBe('test-model');
    expect(body.stream).toBe(false);
    expect(body.messages).toHaveLength(1);
  });
});
