import { describe, it, expect } from 'vitest';
import { migrateSchema, SCHEMA_VERSION } from '../../core/schema';
import type { AppStorageState } from '../../core/types';

describe('core/schema · migrateSchema', () => {
  it('当前版本为 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('空状态（全新安装）补全所有默认字段', () => {
    const result = migrateSchema({}, undefined);
    expect(result.meta.schemaVersion).toBe(1);
    expect(result.apiConfigs).toEqual([]);
    expect(result.activeApiConfigId).toBeNull();
    expect(result.roles).toEqual([]);
    expect(result.sessions).toEqual([]);
    expect(result.uiPrefs.baseDirectiveEnabled).toBe(true);
    expect(result.uiPrefs.defaultContextScope).toBe('selection');
    expect(result.uiPrefs.locale).toBe('zh-CN');
  });

  it('v1 完整状态直通不变', () => {
    const state: AppStorageState = {
      meta: { schemaVersion: 1 },
      apiConfigs: [{ id: 'x' } as never],
      activeApiConfigId: 'x',
      roles: [],
      sessions: [],
      uiPrefs: { baseDirectiveEnabled: false, defaultContextScope: 'page', locale: 'en-US' },
    };
    const result = migrateSchema(state, 1);
    expect(result).toEqual(state);
  });

  it('部分字段缺失时补全默认值', () => {
    const result = migrateSchema({ meta: { schemaVersion: 1 }, roles: [] }, 1);
    expect(result.apiConfigs).toEqual([]);
    expect(result.activeApiConfigId).toBeNull();
    expect(result.sessions).toEqual([]);
    expect(result.uiPrefs.baseDirectiveEnabled).toBe(true);
  });

  it('uiPrefs 部分字段缺失时合并默认值', () => {
    const result = migrateSchema(
      { meta: { schemaVersion: 1 }, uiPrefs: { baseDirectiveEnabled: false } },
      1,
    );
    expect(result.uiPrefs.baseDirectiveEnabled).toBe(false);
    expect(result.uiPrefs.defaultContextScope).toBe('selection');
    expect(result.uiPrefs.locale).toBe('zh-CN');
  });

  it('数据版本高于当前版本时抛错', () => {
    expect(() => migrateSchema({ meta: { schemaVersion: 99 } }, 99)).toThrow(/高于当前支持的/);
  });

  it('fromVersion 为 undefined 时按全新安装处理', () => {
    const result = migrateSchema({ meta: { schemaVersion: 1 } }, undefined);
    expect(result.meta.schemaVersion).toBe(1);
    expect(result.apiConfigs).toEqual([]);
  });
});
