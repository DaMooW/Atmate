import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

/**
 * L2 infra 层测试：storage 同步层（techniqueStack §5 / ADR-006）
 *
 * infra 模块显式 import { browser } from 'wxt/browser'，用 vi.mock 替换为 fakeBrowser。
 * fake-browser 方法不是 vi.fn()，需用 vi.spyOn + mockImplementation 追踪。
 * 事件（onChanged）用 .trigger() 触发。
 */

vi.mock('wxt/browser', () => ({ browser: fakeBrowser }));

// 动态 import 确保 vi.mock 生效后再加载被测模块
async function loadStore() {
  const mod = await import('../../infra/storage/store');
  return mod.useStorageStore;
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.resetModules();
});

describe('infra/storage · init', () => {
  it('空 storage 时装载默认初始状态', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const state = useStore.getState();
    expect(state.initialized).toBe(true);
    expect(state.apiConfigs).toEqual([]);
    expect(state.roles).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.uiPrefs.baseDirectiveEnabled).toBe(true);
  });

  it('从 storage 读取已有数据', async () => {
    vi.spyOn(fakeBrowser.storage.local, 'get').mockImplementation(async () => ({
      'at:apiConfigs': [{ id: 'cfg1', name: 'Test' }],
      'at:roles': [{ id: 'role1', name: '翻译官', builtin: true }],
      'at:meta': { schemaVersion: 1 },
    }));
    const useStore = await loadStore();
    await useStore.getState().init();
    expect(useStore.getState().apiConfigs).toHaveLength(1);
    expect(useStore.getState().apiConfigs[0]!.name).toBe('Test');
    expect(useStore.getState().roles).toHaveLength(1);
  });

  it('init 只执行一次（重复调用不重复装载）', async () => {
    const getSpy = vi.spyOn(fakeBrowser.storage.local, 'get').mockImplementation(async () => ({}));
    const useStore = await loadStore();
    await useStore.getState().init();
    await useStore.getState().init();
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('meta.schemaVersion 不是当前版本时写入修正', async () => {
    const setSpy = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockImplementation(async () => undefined);
    vi.spyOn(fakeBrowser.storage.local, 'get').mockImplementation(async () => ({
      'at:meta': { schemaVersion: 0 },
    }));
    const useStore = await loadStore();
    await useStore.getState().init();
    expect(setSpy).toHaveBeenCalledWith({ 'at:meta': { schemaVersion: 1 } });
  });
});

describe('infra/storage · 写操作', () => {
  it('setApiConfigs 更新 store 并写 storage', async () => {
    const setSpy = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockImplementation(async () => undefined);
    const useStore = await loadStore();
    await useStore.getState().init();
    const configs = [{ id: 'c1', name: 'DeepSeek' }] as never;
    await useStore.getState().setApiConfigs(configs);
    expect(useStore.getState().apiConfigs).toBe(configs);
    expect(setSpy).toHaveBeenCalledWith({ 'at:apiConfigs': configs });
  });

  it('setActiveApiConfigId 更新 store 并写 storage', async () => {
    const setSpy = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockImplementation(async () => undefined);
    const useStore = await loadStore();
    await useStore.getState().init();
    await useStore.getState().setActiveApiConfigId('cfg-123');
    expect(useStore.getState().activeApiConfigId).toBe('cfg-123');
    expect(setSpy).toHaveBeenCalledWith({ 'at:activeApiConfigId': 'cfg-123' });
  });

  it('setRoles 更新 store 并写 storage', async () => {
    const setSpy = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockImplementation(async () => undefined);
    const useStore = await loadStore();
    await useStore.getState().init();
    const roles = [{ id: 'r1', name: '翻译官', builtin: true }] as never;
    await useStore.getState().setRoles(roles);
    expect(useStore.getState().roles).toBe(roles);
    expect(setSpy).toHaveBeenCalledWith({ 'at:roles': roles });
  });

  it('setSessions 更新 store 并写 storage', async () => {
    const setSpy = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockImplementation(async () => undefined);
    const useStore = await loadStore();
    await useStore.getState().init();
    const sessions = [{ id: 's1', title: '新会话' }] as never;
    await useStore.getState().setSessions(sessions);
    expect(useStore.getState().sessions).toBe(sessions);
    expect(setSpy).toHaveBeenCalledWith({ 'at:sessions': sessions });
  });

  it('setUiPrefs 合并而非替换', async () => {
    const setSpy = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockImplementation(async () => undefined);
    const useStore = await loadStore();
    await useStore.getState().init();
    await useStore.getState().setUiPrefs({ baseDirectiveEnabled: false });
    expect(useStore.getState().uiPrefs.baseDirectiveEnabled).toBe(false);
    expect(useStore.getState().uiPrefs.defaultContextScope).toBe('selection');
    expect(useStore.getState().uiPrefs.locale).toBe('zh-CN');
    expect(setSpy).toHaveBeenCalledWith({
      'at:uiPrefs': {
        baseDirectiveEnabled: false,
        defaultContextScope: 'selection',
        locale: 'zh-CN',
      },
    });
  });
});

describe('infra/storage · onChanged 回流', () => {
  it('其他上下文修改 roles 时回流到当前 store', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const newRoles = [{ id: 'r2', name: '新角色', builtin: false }] as never;
    await fakeBrowser.storage.onChanged.trigger({ 'at:roles': { newValue: newRoles } }, 'local');
    expect(useStore.getState().roles).toBe(newRoles);
  });

  it('非 local 区域的变更不回流', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const originalRoles = useStore.getState().roles;
    await fakeBrowser.storage.onChanged.trigger(
      { 'at:roles': { newValue: [{ id: 'x' }] } },
      'sync',
    );
    expect(useStore.getState().roles).toBe(originalRoles);
  });

  it('newValue 为 undefined（键被删除）时不更新', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const originalRoles = useStore.getState().roles;
    await fakeBrowser.storage.onChanged.trigger({ 'at:roles': { newValue: undefined } }, 'local');
    expect(useStore.getState().roles).toBe(originalRoles);
  });

  it('回流多个键时批量更新', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const newConfigs = [{ id: 'c2' }] as never;
    const newPrefs = {
      baseDirectiveEnabled: false,
      defaultContextScope: 'page' as const,
      locale: 'en-US' as const,
    };
    await fakeBrowser.storage.onChanged.trigger(
      {
        'at:apiConfigs': { newValue: newConfigs },
        'at:uiPrefs': { newValue: newPrefs },
      },
      'local',
    );
    expect(useStore.getState().apiConfigs).toBe(newConfigs);
    expect(useStore.getState().uiPrefs).toEqual(newPrefs);
  });
});
