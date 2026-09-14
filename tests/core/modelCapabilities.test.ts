import { describe, it, expect } from 'vitest';
import {
  getModelCapability,
  levelToThinkingLevel,
  thinkingLevelToLevel,
} from '../../core/modelCapabilities';

describe('core/modelCapabilities · getModelCapability', () => {
  it('精确匹配 deepseek-chat', () => {
    const cap = getModelCapability('deepseek-chat');
    expect(cap.thinkingType).toBe('reasoning_effort');
    expect(cap.levels).toEqual(['low', 'medium', 'high']);
    expect(cap.defaultLevel).toBe('medium');
  });

  it('精确匹配 gpt-4o（不支持思维链）', () => {
    const cap = getModelCapability('gpt-4o');
    expect(cap.thinkingType).toBe('none');
    expect(cap.levels).toEqual([]);
  });

  it('前缀匹配 deepseek-*', () => {
    const cap = getModelCapability('deepseek-unknown-model');
    expect(cap.thinkingType).toBe('reasoning_effort');
  });

  it('前缀匹配 gpt-*（不支持思维链）', () => {
    const cap = getModelCapability('gpt-4-turbo');
    expect(cap.thinkingType).toBe('none');
  });

  it('前缀匹配 glm-*', () => {
    const cap = getModelCapability('glm-4-airx');
    expect(cap.thinkingType).toBe('none');
  });

  it('精确匹配 glm-4.5（支持思维链）', () => {
    const cap = getModelCapability('glm-4.5');
    expect(cap.thinkingType).toBe('reasoning_effort');
  });

  it('未命中的模型返回默认通用配置', () => {
    const cap = getModelCapability('unknown-model-xyz');
    expect(cap.thinkingType).toBe('reasoning_effort');
    expect(cap.levels).toEqual(['low', 'medium', 'high']);
  });

  it('空字符串返回默认配置', () => {
    const cap = getModelCapability('');
    expect(cap.thinkingType).toBe('reasoning_effort');
  });

  it('o1 支持 reasoning_effort', () => {
    const cap = getModelCapability('o1');
    expect(cap.thinkingType).toBe('reasoning_effort');
  });
});

describe('core/modelCapabilities · level 转换', () => {
  it('levelToThinkingLevel', () => {
    expect(levelToThinkingLevel('low')).toBe('light');
    expect(levelToThinkingLevel('medium')).toBe('medium');
    expect(levelToThinkingLevel('high')).toBe('deep');
    expect(levelToThinkingLevel('')).toBe('off');
    expect(levelToThinkingLevel('unknown')).toBe('off');
  });

  it('thinkingLevelToLevel', () => {
    expect(thinkingLevelToLevel('light')).toBe('low');
    expect(thinkingLevelToLevel('medium')).toBe('medium');
    expect(thinkingLevelToLevel('deep')).toBe('high');
    expect(thinkingLevelToLevel('off')).toBe('');
  });
});
