import { describe, it, expect } from 'vitest';
import { classifyHttpError, classifyNetworkError, LLMError } from '../../infra/llm/errors';

describe('infra/llm/errors · classifyHttpError', () => {
  it('401 → auth', () => {
    const err = classifyHttpError(401);
    expect(err).toBeInstanceOf(LLMError);
    expect(err.type).toBe('auth');
    expect(err.status).toBe(401);
    expect(err.message).toContain('API Key');
  });

  it('403 → auth', () => {
    expect(classifyHttpError(403).type).toBe('auth');
  });

  it('404 → not_found', () => {
    const err = classifyHttpError(404);
    expect(err.type).toBe('not_found');
    expect(err.message).toContain('Base URL');
  });

  it('429 → rate_limit', () => {
    const err = classifyHttpError(429);
    expect(err.type).toBe('rate_limit');
    expect(err.message).toContain('限流');
  });

  it('400 → bad_request', () => {
    expect(classifyHttpError(400).type).toBe('bad_request');
  });

  it('500 → server', () => {
    const err = classifyHttpError(500);
    expect(err.type).toBe('server');
    expect(err.message).toContain('服务端错误');
  });

  it('502 → server', () => {
    expect(classifyHttpError(502).type).toBe('server');
  });

  it('418 → unknown', () => {
    expect(classifyHttpError(418).type).toBe('unknown');
  });

  it('从响应体提取 error.message', () => {
    const err = classifyHttpError(401, { error: { message: 'Invalid API key' } });
    expect(err.message).toContain('Invalid API key');
  });

  it('响应体无 error 时不崩溃', () => {
    const err = classifyHttpError(500, { message: 'plain error' });
    expect(err.type).toBe('server');
  });
});

describe('infra/llm/errors · classifyNetworkError', () => {
  it('AbortError → aborted', () => {
    const err = classifyNetworkError(new DOMException('aborted', 'AbortError'));
    expect(err.type).toBe('aborted');
    expect(err.message).toContain('已停止');
  });

  it('TypeError → network', () => {
    const err = classifyNetworkError(new TypeError('Failed to fetch'));
    expect(err.type).toBe('network');
    expect(err.message).toContain('网络连接失败');
  });

  it('普通 Error → unknown', () => {
    const err = classifyNetworkError(new Error('something'));
    expect(err.type).toBe('unknown');
    expect(err.message).toBe('something');
  });

  it('非 Error 对象 → unknown', () => {
    const err = classifyNetworkError('string error');
    expect(err.type).toBe('unknown');
  });
});
