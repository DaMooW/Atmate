import { describe, it, expect } from 'vitest';
import { buildRequest, buildUrl, buildHeaders } from '../../infra/llm/requestBuilder';
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

const history: ChatMessage[] = [
  { id: 'm1', role: 'user', content: '你好', createdAt: 1 },
  { id: 'm2', role: 'assistant', content: '你好！有什么可以帮你？', createdAt: 2 },
];

const currentMessage: ChatMessage = {
  id: 'm3',
  role: 'user',
  content: '翻译这段文字',
  createdAt: 3,
};

describe('infra/llm/requestBuilder · buildRequest', () => {
  it('包含 model 和 messages', () => {
    const req = buildRequest(mockConfig, mockRole, history, currentMessage, {
      stream: true,
      baseDirectiveEnabled: false,
    });
    expect(req.model).toBe('test-model');
    expect(req.messages).toHaveLength(4); // system + 2 history + 1 current
  });

  it('第一条消息是 system', () => {
    const req = buildRequest(mockConfig, mockRole, history, currentMessage, {
      stream: true,
      baseDirectiveEnabled: false,
    });
    expect(req.messages[0]!.role).toBe('system');
    expect(req.messages[0]!.content).toBe('你是翻译官。');
  });

  it('基础指令开启时 system 包含基础指令', () => {
    const req = buildRequest(mockConfig, mockRole, history, currentMessage, {
      stream: true,
      baseDirectiveEnabled: true,
    });
    expect(req.messages[0]!.content).toContain('信息完备性');
  });

  it('历史消息中的 system 被过滤', () => {
    const historyWithSystem: ChatMessage[] = [
      { id: 's1', role: 'system', content: '旧 system', createdAt: 0 },
      ...history,
    ];
    const req = buildRequest(mockConfig, mockRole, historyWithSystem, currentMessage, {
      stream: true,
      baseDirectiveEnabled: false,
    });
    // 只有我们拼装的 system，历史中的 system 被过滤
    expect(req.messages.filter((m) => m.role === 'system')).toHaveLength(1);
  });

  it('stream 标志正确', () => {
    const req = buildRequest(mockConfig, mockRole, history, currentMessage, {
      stream: false,
      baseDirectiveEnabled: false,
    });
    expect(req.stream).toBe(false);
  });

  it('流式 + includeUsage 时附 stream_options', () => {
    const req = buildRequest(mockConfig, mockRole, history, currentMessage, {
      stream: true,
      includeUsage: true,
      baseDirectiveEnabled: false,
    });
    expect(req.stream_options).toEqual({ include_usage: true });
  });

  it('非流式时不附 stream_options', () => {
    const req = buildRequest(mockConfig, mockRole, history, currentMessage, {
      stream: false,
      includeUsage: true,
      baseDirectiveEnabled: false,
    });
    expect(req.stream_options).toBeUndefined();
  });

  it('思维强度开启时注入 reasoning_effort', () => {
    const configWithThinking: ApiConfig = {
      ...mockConfig,
      thinking: {
        enabled: true,
        level: 'medium',
        config: {
          mapping: 'reasoning_effort',
          values: { light: 'low', medium: 'medium', deep: 'high' },
        },
      },
    };
    const req = buildRequest(configWithThinking, mockRole, history, currentMessage, {
      stream: true,
      baseDirectiveEnabled: false,
    });
    expect(req.reasoning_effort).toBe('medium');
  });

  it('思维强度开启时注入 budget_tokens', () => {
    const configWithBudget: ApiConfig = {
      ...mockConfig,
      thinking: {
        enabled: true,
        level: 'deep',
        config: { mapping: 'budget_tokens', values: { light: 1024, medium: 4096, deep: 16384 } },
      },
    };
    const req = buildRequest(configWithBudget, mockRole, history, currentMessage, {
      stream: true,
      baseDirectiveEnabled: false,
    });
    expect(req.thinking).toEqual({ type: 'enabled', budget_tokens: 16384 });
  });

  it('extraBody 合并进请求体', () => {
    const configWithExtra: ApiConfig = {
      ...mockConfig,
      extraBody: { top_p: 0.9 },
    };
    const req = buildRequest(configWithExtra, mockRole, history, currentMessage, {
      stream: true,
      baseDirectiveEnabled: false,
    });
    expect(req.top_p).toBe(0.9);
  });

  it('temperature 注入', () => {
    const configWithTemp: ApiConfig = {
      ...mockConfig,
      temperature: 0.7,
    };
    const req = buildRequest(configWithTemp, mockRole, history, currentMessage, {
      stream: true,
      baseDirectiveEnabled: false,
    });
    expect(req.temperature).toBe(0.7);
  });
});

describe('infra/llm/requestBuilder · buildUrl', () => {
  it('正常拼接', () => {
    expect(buildUrl('https://api.example.com/v1')).toBe(
      'https://api.example.com/v1/chat/completions',
    );
  });

  it('去掉末尾斜杠', () => {
    expect(buildUrl('https://api.example.com/v1/')).toBe(
      'https://api.example.com/v1/chat/completions',
    );
  });

  it('去掉多个末尾斜杠', () => {
    expect(buildUrl('https://api.example.com/v1//')).toBe(
      'https://api.example.com/v1/chat/completions',
    );
  });
});

describe('infra/llm/requestBuilder · buildHeaders', () => {
  it('包含 Content-Type 和 Authorization', () => {
    const headers = buildHeaders('sk-abc');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer sk-abc');
  });
});
