import { describe, it, expect } from 'vitest';
import { createInitialState, DEFAULT_UI_PREFS } from '../../core/defaults';
import { SCHEMA_VERSION } from '../../core/schema';

describe('core/defaults · createInitialState', () => {
  it('生成完整的初始状态', () => {
    const state = createInitialState();
    expect(state.meta.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.apiConfigs).toEqual([]);
    expect(state.activeApiConfigId).toBeNull();
    expect(state.roles).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.uiPrefs).toEqual(DEFAULT_UI_PREFS);
  });

  it('baseDirectiveEnabled 默认开启', () => {
    expect(createInitialState().uiPrefs.baseDirectiveEnabled).toBe(true);
  });

  it('每次调用返回独立对象（不共享引用）', () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
    expect(a.uiPrefs).not.toBe(b.uiPrefs);
    a.uiPrefs.locale = 'en-US';
    expect(b.uiPrefs.locale).toBe('zh-CN');
  });
});

describe('core/defaults · DEFAULT_UI_PREFS', () => {
  it('包含所有必需字段', () => {
    expect(DEFAULT_UI_PREFS.baseDirectiveEnabled).toBe(true);
    expect(DEFAULT_UI_PREFS.defaultContextScope).toBe('selection');
    expect(DEFAULT_UI_PREFS.locale).toBe('zh-CN');
  });
});
