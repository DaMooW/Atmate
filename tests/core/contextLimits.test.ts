import { describe, it, expect } from 'vitest';
import { getContextLimit } from '../../core/contextLimits';

describe('core/contextLimits · getContextLimit', () => {
  it('精确匹配 deepseek-chat', () => {
    expect(getContextLimit('deepseek-chat')).toBe(128000);
  });

  it('精确匹配 gpt-4o', () => {
    expect(getContextLimit('gpt-4o')).toBe(128000);
  });

  it('精确匹配 moonshot-v1-8k', () => {
    expect(getContextLimit('moonshot-v1-8k')).toBe(8000);
  });

  it('精确匹配 moonshot-v1-32k', () => {
    expect(getContextLimit('moonshot-v1-32k')).toBe(32000);
  });

  it('前缀匹配 deepseek-*', () => {
    expect(getContextLimit('deepseek-unknown')).toBe(128000);
  });

  it('前缀匹配 claude-*', () => {
    expect(getContextLimit('claude-3-5-sonnet-20241022')).toBe(200000);
  });

  it('前缀匹配 Qwen/*（聚合站命名）', () => {
    expect(getContextLimit('Qwen/Qwen2.5-72B-Instruct')).toBe(131072);
  });

  it('未命中返回 null', () => {
    expect(getContextLimit('unknown-model-xyz')).toBeNull();
  });

  it('空字符串返回 null', () => {
    expect(getContextLimit('')).toBeNull();
  });

  it('gpt-4.1 返回 1047576', () => {
    expect(getContextLimit('gpt-4.1')).toBe(1047576);
  });
});
