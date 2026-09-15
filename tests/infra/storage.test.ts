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
  it('空 storage 时装载默认初始状态并 seed 默认角色', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const state = useStore.getState();
    expect(state.initialized).toBe(true);
    expect(state.apiConfigs).toEqual([]);
    // T1.3 D2：首次启动自动 seed 五个默认角色（含「在伴 Atmate」）
    expect(state.roles).toHaveLength(5);
    expect(state.roles[0]!.name).toBe('在伴 Atmate');
    expect(state.roles.map((r) => r.name)).toContain('翻译官');
    expect(state.sessions).toEqual([]);
    expect(state.uiPrefs.baseDirectiveEnabled).toBe(true);
  });

  it('已有角色时不重复 seed', async () => {
    const existingRole = { id: 'custom-1', name: '自定义', systemPrompt: 'test', builtin: false };
    vi.spyOn(fakeBrowser.storage.local, 'get').mockImplementation(async () => ({
      'at:roles': [existingRole],
      'at:meta': { schemaVersion: 1 },
    }));
    const setSpy = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockImplementation(async () => undefined);
    const useStore = await loadStore();
    await useStore.getState().init();
    // 不应该写入 roles（因为已有角色，不需要 seed）
    const roleWrites = setSpy.mock.calls.filter(
      (call) => call[0] && Object.prototype.hasOwnProperty.call(call[0], 'at:roles'),
    );
    expect(roleWrites).toHaveLength(0);
    expect(useStore.getState().roles).toHaveLength(1);
    expect(useStore.getState().roles[0]!.name).toBe('自定义');
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
        pdfOpenMode: 'ask',
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

/**
 * 验收期缺陷回归（specs/20260914-m1-fix-storage-echo / ADR-010）：
 * storage.local.set 异步，自身写入的回声常滞后于后续写入；若把回声当外部变更套用，
 * 内存状态会被拉回旧快照，流式输出因此丢字。以下用例锁定"回声不回退状态"。
 */
describe('infra/storage · 自身写入回声抑制', () => {
  /** 造一个含单条消息的会话，content 不同 → 指纹不同 */
  function sessionsWith(content: string) {
    return [
      {
        id: 's1',
        roleId: 'r1',
        title: '新对话',
        messages: [{ id: 'm1', role: 'assistant', content, createdAt: 1 }],
        cumulativeTokens: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ] as never;
  }

  it('滞后的自身回声不会把 sessions 拉回旧值', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const v1 = sessionsWith('A');
    const v2 = sessionsWith('AB');
    await useStore.getState().setSessions(v1);
    await useStore.getState().setSessions(v2);
    // 回声迟到，携带的是上一轮写入的内容
    await fakeBrowser.storage.onChanged.trigger({ 'at:sessions': { newValue: v1 } }, 'local');
    expect(useStore.getState().sessions).toBe(v2);
  });

  it('流式式连续写入 + 滞后积压的回声：状态不倒退', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const snapshots: unknown[] = [];
    for (let i = 0; i < 50; i += 1) {
      const snapshot = sessionsWith('x'.repeat(i + 1));
      snapshots.push(snapshot);
      await useStore.getState().setSessions(snapshot);
    }
    const latest = snapshots[snapshots.length - 1];
    // 真实场景：写入早已跑完，回声才追上来，且到达时携带的是更旧的内容
    for (const snapshot of snapshots.slice(0, -1)) {
      await fakeBrowser.storage.onChanged.trigger(
        { 'at:sessions': { newValue: snapshot } },
        'local',
      );
    }
    expect(useStore.getState().sessions).toBe(latest);
  });

  it('回声乱序到达也不回退', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const v1 = sessionsWith('A');
    const v2 = sessionsWith('AB');
    const v3 = sessionsWith('ABC');
    await useStore.getState().setSessions(v1);
    await useStore.getState().setSessions(v2);
    await useStore.getState().setSessions(v3);
    for (const snapshot of [v3, v1, v2]) {
      await fakeBrowser.storage.onChanged.trigger(
        { 'at:sessions': { newValue: snapshot } },
        'local',
      );
    }
    expect(useStore.getState().sessions).toBe(v3);
  });

  it('外部上下文的写入（指纹未登记）仍正常回流', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    await useStore.getState().setSessions(sessionsWith('本地写入'));
    const external = sessionsWith('其他上下文写入');
    await fakeBrowser.storage.onChanged.trigger({ 'at:sessions': { newValue: external } }, 'local');
    expect(useStore.getState().sessions).toBe(external);
  });

  it('回声对象键序被重排（真实 storage 行为）时仍识别为自身回声', async () => {
    /** 模拟 Chrome storage 的行为：值重新序列化后对象键变为字母序 */
    const reorderKeys = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(reorderKeys);
      if (value && typeof value === 'object') {
        const source = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(source).sort()) out[key] = reorderKeys(source[key]);
        return out;
      }
      return value;
    };

    const useStore = await loadStore();
    await useStore.getState().init();
    const stale = sessionsWith('A');
    const latest = sessionsWith('AB');
    await useStore.getState().setSessions(stale);
    await useStore.getState().setSessions(latest);
    await fakeBrowser.storage.onChanged.trigger(
      { 'at:sessions': { newValue: reorderKeys(stale) } },
      'local',
    );
    expect(useStore.getState().sessions).toBe(latest);
  });

  it('同一批回流里：本地键被忽略、外部键生效', async () => {
    const useStore = await loadStore();
    await useStore.getState().init();
    const stale = sessionsWith('旧快照');
    const latest = sessionsWith('最新快照');
    await useStore.getState().setSessions(stale);
    await useStore.getState().setSessions(latest);
    const externalRoles = [{ id: 'r9', name: '外部角色', builtin: false }] as never;
    await fakeBrowser.storage.onChanged.trigger(
      {
        'at:sessions': { newValue: stale },
        'at:roles': { newValue: externalRoles },
      },
      'local',
    );
    expect(useStore.getState().sessions).toBe(latest);
    expect(useStore.getState().roles).toBe(externalRoles);
  });
});
