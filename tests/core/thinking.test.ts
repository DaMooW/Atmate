import { describe, it, expect } from 'vitest';
import { buildThinkingBody, createDefaultThinking } from '../../core/thinking';
import type { Thinking } from '../../core/types';

describe('core/thinking · buildThinkingBody', () => {
  it('level=off 时返回空对象', () => {
    const thinking: Thinking = {
      enabled: true,
      level: 'off',
      config: {
        mapping: 'reasoning_effort',
        values: { light: 'low', medium: 'medium', deep: 'high' },
      },
    };
    expect(buildThinkingBody(thinking)).toEqual({});
  });

  it('enabled=false 时返回空对象', () => {
    const thinking: Thinking = {
      enabled: false,
      level: 'medium',
      config: {
        mapping: 'reasoning_effort',
        values: { light: 'low', medium: 'medium', deep: 'high' },
      },
    };
    expect(buildThinkingBody(thinking)).toEqual({});
  });

  it('reasoning_effort 模式 light 档', () => {
    const thinking = createDefaultThinking('reasoning_effort');
    thinking.level = 'light';
    expect(buildThinkingBody(thinking)).toEqual({ reasoning_effort: 'low' });
  });

  it('reasoning_effort 模式 medium 档', () => {
    const thinking = createDefaultThinking('reasoning_effort');
    expect(buildThinkingBody(thinking)).toEqual({ reasoning_effort: 'medium' });
  });

  it('reasoning_effort 模式 deep 档', () => {
    const thinking = createDefaultThinking('reasoning_effort');
    thinking.level = 'deep';
    expect(buildThinkingBody(thinking)).toEqual({ reasoning_effort: 'high' });
  });

  it('budget_tokens 模式', () => {
    const thinking = createDefaultThinking('budget_tokens');
    thinking.level = 'deep';
    expect(buildThinkingBody(thinking)).toEqual({
      thinking: { type: 'enabled', budget_tokens: 8000 },
    });
  });

  it('budget_tokens light 档为 2000', () => {
    const thinking = createDefaultThinking('budget_tokens');
    thinking.level = 'light';
    expect(buildThinkingBody(thinking)).toEqual({
      thinking: { type: 'enabled', budget_tokens: 2000 },
    });
  });

  it('custom 模式正常插值', () => {
    const thinking: Thinking = {
      enabled: true,
      level: 'medium',
      config: {
        mapping: 'custom',
        values: { light: 'low', medium: 'medium', deep: 'high' },
        customTemplate: '{"reasoning_effort":"{{level}}"}',
      },
    };
    expect(buildThinkingBody(thinking)).toEqual({ reasoning_effort: 'medium' });
  });

  it('custom 模式模板非法 JSON 返回空对象', () => {
    const thinking: Thinking = {
      enabled: true,
      level: 'medium',
      config: {
        mapping: 'custom',
        values: { light: 'low', medium: 'medium', deep: 'high' },
        customTemplate: 'not json {{level}}',
      },
    };
    expect(buildThinkingBody(thinking)).toEqual({});
  });

  it('custom 模式无模板返回空对象', () => {
    const thinking: Thinking = {
      enabled: true,
      level: 'medium',
      config: {
        mapping: 'custom',
        values: { light: 'low', medium: 'medium', deep: 'high' },
      },
    };
    expect(buildThinkingBody(thinking)).toEqual({});
  });
});

describe('core/thinking · createDefaultThinking', () => {
  it('reasoning_effort 默认值', () => {
    const t = createDefaultThinking('reasoning_effort');
    expect(t.enabled).toBe(true);
    expect(t.level).toBe('medium');
    expect(t.config.mapping).toBe('reasoning_effort');
    expect(t.config.values.light).toBe('low');
    expect(t.config.values.deep).toBe('high');
  });

  it('budget_tokens 默认值', () => {
    const t = createDefaultThinking('budget_tokens');
    expect(t.config.mapping).toBe('budget_tokens');
    expect(t.config.values.light).toBe(2000);
    expect(t.config.values.medium).toBe(4000);
    expect(t.config.values.deep).toBe(8000);
  });

  it('custom 默认模板包含 {{level}}', () => {
    const t = createDefaultThinking('custom');
    expect(t.config.customTemplate).toContain('{{level}}');
  });
});
