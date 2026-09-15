import { describe, it, expect, beforeEach, vi } from 'vitest';
import { streamChat } from '../../infra/llm/client';
import type { ApiConfig, ChatMessage, Role } from '../../core/types';

const mockConfig: ApiConfig = {
  id: 'cfg1',
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

const mockRole: Role = {
  id: 'role1',
  name: '翻译官',
  systemPrompt: '你是翻译官。',
  builtin: true,
};

const currentMessage: ChatMessage = {
  id: 'm1',
  role: 'user',
  content: '翻译',
  createdAt: 1,
};

function mockStreamResponse(chunks: Array<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body,
    json: async () => ({}),
  } as Response);
}

function mockErrorResponse(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    body: null,
    json: async () => body ?? {},
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('infra/llm/client · streamChat', () => {
  it('成功流式返回完整内容', async () => {
    vi.stubGlobal(
      'fetch',
      mockStreamResponse([
        { choices: [{ delta: { content: '你' } }] },
        { choices: [{ delta: { content: '好' } }] },
      ]),
    );
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    const result = await handle.promise;
    expect(result.content).toBe('你好');
    expect(result.collectUsageUsed).toBe(true);
  });

  it('onContent 回调接收增量', async () => {
    vi.stubGlobal('fetch', mockStreamResponse([{ choices: [{ delta: { content: 'hi' } }] }]));
    const chunks: string[] = [];
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
      onContent: (d) => chunks.push(d),
    });
    await handle.promise;
    expect(chunks).toEqual(['hi']);
  });

  it('401 抛出 auth 错误', async () => {
    vi.stubGlobal('fetch', mockErrorResponse(401));
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    await expect(handle.promise).rejects.toMatchObject({ type: 'auth' });
  });

  it('404 抛出 not_found 错误', async () => {
    vi.stubGlobal('fetch', mockErrorResponse(404));
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    await expect(handle.promise).rejects.toMatchObject({ type: 'not_found' });
  });

  it('429 抛出 rate_limit 错误', async () => {
    vi.stubGlobal('fetch', mockErrorResponse(429));
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    await expect(handle.promise).rejects.toMatchObject({ type: 'rate_limit' });
  });

  it('网络错误抛出 network 错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    await expect(handle.promise).rejects.toMatchObject({ type: 'network' });
  });

  it('abort 停止生成', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          }),
      ),
    );
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    handle.abort();
    await expect(handle.promise).rejects.toMatchObject({ type: 'aborted' });
  });

  it('collectUsage 探测降级：首次 400 后不带 include_usage 重试', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        body: null,
        json: async () => ({ error: { message: 'unknown field stream_options' } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
              ),
            );
            controller.close();
          },
        }),
        json: async () => ({}),
      } as Response);
    vi.stubGlobal('fetch', fetchSpy);

    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    const result = await handle.promise;

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // 第一次请求带 stream_options
    const firstBody = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(firstBody.stream_options).toEqual({ include_usage: true });
    // 第二次请求不带 stream_options
    const secondBody = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
    expect(secondBody.stream_options).toBeUndefined();
    expect(result.content).toBe('ok');
    expect(result.collectUsageUsed).toBe(false);
  });

  it('collectUsageSupported=false 时直接不带 include_usage', async () => {
    const config: ApiConfig = { ...mockConfig, collectUsageSupported: false };
    const fetchSpy = mockStreamResponse([{ choices: [{ delta: { content: 'x' } }] }]);
    vi.stubGlobal('fetch', fetchSpy);

    const handle = streamChat(config, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    await handle.promise;

    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.stream_options).toBeUndefined();
  });

  it('collectUsage=false 时不带 include_usage', async () => {
    const config: ApiConfig = { ...mockConfig, collectUsage: false };
    const fetchSpy = mockStreamResponse([{ choices: [{ delta: { content: 'x' } }] }]);
    vi.stubGlobal('fetch', fetchSpy);

    const handle = streamChat(config, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    await handle.promise;

    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.stream_options).toBeUndefined();
  });

  it('usage 数据透传', async () => {
    vi.stubGlobal(
      'fetch',
      mockStreamResponse([
        { choices: [{ delta: { content: 'hi' } }] },
        { usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } },
      ]),
    );
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    const result = await handle.promise;
    expect(result.usage).toEqual({ prompt: 5, completion: 2, total: 7 });
  });

  it('请求 URL 正确', async () => {
    const fetchSpy = mockStreamResponse([]);
    vi.stubGlobal('fetch', fetchSpy);
    const handle = streamChat(mockConfig, mockRole, [], currentMessage, {
      baseDirectiveEnabled: false,
    });
    await handle.promise;
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://api.example.com/v1/chat/completions');
  });
});
