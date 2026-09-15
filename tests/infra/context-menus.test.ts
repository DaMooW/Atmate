/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  initContextMenus,
  CONTEXT_MENU_ID,
  CONTEXT_MENU_TITLE,
} from '../../entrypoints/background/context-menus';
import { _resetPanelStateForTesting } from '../../entrypoints/background/panel-state';
import {
  _resetPendingForTesting,
  getPendingAndClear,
  hasPending,
} from '../../entrypoints/background/pending-material';

/**
 * L2 infra 层测试：右键菜单（M2 T2.3，D14）。
 *
 * fake-browser 的 contextMenus API 可能不完整，需要手动 mock。
 */

// 保存菜单创建参数
let createdMenus: Array<{
  id: string;
  title: string;
  contexts?: string[];
}> = [];

// 保存点击监听器
let clickListeners: Array<(info: any, tab: any) => void> = [];

function mockContextMenus() {
  createdMenus = [];
  clickListeners = [];

  (fakeBrowser.contextMenus as any) = {
    removeAll: (callback: () => void) => callback(),
    create: (properties: any) => {
      createdMenus.push(properties);
      return properties.id;
    },
    onClicked: {
      addListener: (fn: (info: any, tab: any) => void) => clickListeners.push(fn),
      removeListener: vi.fn(),
    },
  };
}

function triggerClick(info: any, tab: any = {}) {
  clickListeners.forEach((fn) => fn(info, tab));
}

beforeEach(() => {
  fakeBrowser.reset();
  mockContextMenus();
  vi.stubGlobal('browser', fakeBrowser);
  _resetPanelStateForTesting();
  _resetPendingForTesting();
  vi.restoreAllMocks();
});

describe('background/context-menus · initContextMenus', () => {
  it('创建右键菜单项，id 和 title 正确', () => {
    initContextMenus();

    expect(createdMenus).toHaveLength(1);
    expect(createdMenus[0]!.id).toBe(CONTEXT_MENU_ID);
    expect(createdMenus[0]!.title).toBe(CONTEXT_MENU_TITLE);
    expect(createdMenus[0]!.contexts).toEqual(['selection']);
  });

  it('注册 onClicked 监听器', () => {
    initContextMenus();
    expect(clickListeners).toHaveLength(1);
  });

  it('点击本菜单且有选中文本时，走分流逻辑（暂存素材）', () => {
    initContextMenus();

    // panelOpen=false（默认），应暂存素材
    triggerClick(
      {
        menuItemId: CONTEXT_MENU_ID,
        selectionText: 'Hello from context menu',
      },
      { title: 'Test Page', url: 'https://example.com' },
    );

    // 验证暂存
    const pending = getPendingAndClear();
    expect(pending).not.toBeNull();
    expect(pending!.text).toBe('Hello from context menu');
    expect(pending!.title).toBe('Test Page');
    expect(pending!.url).toBe('https://example.com');
    expect(pending!.source).toBe('context-menu');
  });

  it('selectionText 为空时不触发分流', () => {
    initContextMenus();

    triggerClick({
      menuItemId: CONTEXT_MENU_ID,
      selectionText: '',
    });

    expect(hasPending()).toBe(false);
  });

  it('selectionText 为纯空白时不触发分流', () => {
    initContextMenus();

    triggerClick({
      menuItemId: CONTEXT_MENU_ID,
      selectionText: '   ',
    });

    expect(hasPending()).toBe(false);
  });

  it('点击其他菜单项不触发', () => {
    initContextMenus();

    triggerClick({
      menuItemId: 'other-menu-item',
      selectionText: 'should not be sent',
    });

    expect(hasPending()).toBe(false);
  });

  it('tab 信息缺失时使用空字符串兜底', () => {
    initContextMenus();

    triggerClick({
      menuItemId: CONTEXT_MENU_ID,
      selectionText: 'test',
    });

    const pending = getPendingAndClear();
    expect(pending).not.toBeNull();
    expect(pending!.title).toBe('');
    expect(pending!.url).toBe('');
  });
});
