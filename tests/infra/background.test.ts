import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

/**
 * L2 infra 层测试：background.ts 行为（tech §8 / spec 修订 D8）。
 *
 * WXT 的 defineBackground 和 browser 是构建时自动注入的全局，
 * 测试时用 vi.stubGlobal 注入，defineBackground 直接执行回调。
 * fake-browser 的事件用 .trigger() 触发，方法用 vi.spyOn 追踪。
 */

// 从 fake-browser 的 trigger 签名推断 Tab 类型，避免显式 any
type Tab = Parameters<typeof fakeBrowser.action.onClicked.trigger>[0];

beforeEach(() => {
  vi.resetModules(); // 清除动态 import 缓存，确保每次测试重新执行 background.ts 顶层代码
  fakeBrowser.reset();
  vi.stubGlobal('browser', fakeBrowser);
  vi.stubGlobal('defineBackground', (fn: () => void) => fn());
  vi.restoreAllMocks();
});

async function loadBackground() {
  // 动态 import 确保每次测试都重新执行模块顶层代码
  return import('../../entrypoints/background');
}

describe('background.ts · 侧边栏入口（D8）', () => {
  it('注册 action.onClicked 监听器', async () => {
    await loadBackground();
    expect(fakeBrowser.action.onClicked.hasListeners()).toBe(true);
  });

  it('点击工具栏图标时调用 sidePanel.open({ windowId })', async () => {
    const openSpy = vi.spyOn(fakeBrowser.sidePanel, 'open').mockResolvedValue(undefined);
    await loadBackground();
    const tab = { windowId: 42 } as unknown as Tab;
    await fakeBrowser.action.onClicked.trigger(tab);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith({ windowId: 42 });
  });

  it('sidePanel.open 失败时调用 console.error 且不抛出', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(fakeBrowser.sidePanel, 'open').mockRejectedValue(new Error('sidePanel not available'));

    await loadBackground();
    const tab = { windowId: 1 } as unknown as Tab;
    // trigger 返回 Promise<void[]>，监听器内部 catch 了错误，不应 reject
    await expect(fakeBrowser.action.onClicked.trigger(tab)).resolves.toBeDefined();
    expect(errorSpy).toHaveBeenCalledWith('[Atmate] 打开侧边栏失败', expect.any(Error));
  });
});
