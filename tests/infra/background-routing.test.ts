import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  initPanelState,
  isPanelOpen,
  _resetPanelStateForTesting,
} from '../../entrypoints/background/panel-state';
import {
  setPending,
  getPendingAndClear,
  hasPending,
  _resetPendingForTesting,
} from '../../entrypoints/background/pending-material';
import {
  handleSelectionSend,
  handleFloatButtonClick,
  handlePanelReady,
  handleMessage,
} from '../../entrypoints/background/messaging-router';
import type { SelectionSendPayload, ExtensionMessage } from '../../core/messages';
import { SIDEPANEL_PORT_NAME } from '../../core/messages';

/**
 * L2 infra 层测试：background 消息路由与分流（M2 T2.5，D16）。
 *
 * 测试 panelOpen 状态维护、暂存逻辑、消息分流（已打开→直接投递 / 未打开→显示浮动按钮）。
 */

// 构造测试用的 payload
function makePayload(overrides: Partial<SelectionSendPayload> = {}): SelectionSendPayload {
  return {
    text: 'Hello, world!',
    title: 'Test Page',
    url: 'https://example.com',
    source: 'float-button',
    ...overrides,
  };
}

// 从 fake-browser 的 trigger 签名推断类型
type Port = { name: string; onDisconnect: { addListener: (fn: () => void) => void } };
type MessageSender = { tab?: { windowId?: number } };

// fake-browser 的 runtime.onConnect 未实现，需要手动 mock
let connectListeners: Array<(port: Port) => void> = [];

function mockOnConnect() {
  connectListeners = [];
  // fake-browser 未实现 runtime.onConnect，需要手动赋值 mock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fakeBrowser.runtime as any).onConnect = {
    addListener: (fn: (port: Port) => void) => connectListeners.push(fn),
    removeListener: vi.fn(),
  };
}

function triggerConnect(port: Port) {
  connectListeners.forEach((fn) => fn(port));
}

beforeEach(() => {
  fakeBrowser.reset();
  mockOnConnect();
  vi.stubGlobal('browser', fakeBrowser);
  _resetPanelStateForTesting();
  _resetPendingForTesting();
  vi.restoreAllMocks();
});

describe('background/panel-state · initPanelState', () => {
  it('初始 panelOpen 为 false', () => {
    expect(isPanelOpen()).toBe(false);
  });

  it('sidepanel connect 后 panelOpen 为 true', () => {
    initPanelState();
    const port = {
      name: 'at-sidepanel',
      onDisconnect: { addListener: vi.fn() },
    } as unknown as Port;
    triggerConnect(port);
    expect(isPanelOpen()).toBe(true);
  });

  it('sidepanel disconnect 后 panelOpen 为 false', () => {
    initPanelState();
    const disconnectListeners: Array<() => void> = [];
    const port = {
      name: 'at-sidepanel',
      onDisconnect: { addListener: (fn: () => void) => disconnectListeners.push(fn) },
    } as unknown as Port;
    triggerConnect(port);
    expect(isPanelOpen()).toBe(true);
    // 触发 disconnect
    disconnectListeners.forEach((fn) => fn());
    expect(isPanelOpen()).toBe(false);
  });

  it('非 at-sidepanel 的 port 不影响 panelOpen', () => {
    initPanelState();
    const port = { name: 'other-port', onDisconnect: { addListener: vi.fn() } } as unknown as Port;
    triggerConnect(port);
    expect(isPanelOpen()).toBe(false);
  });
});

describe('background/pending-material', () => {
  it('初始无暂存', () => {
    expect(hasPending()).toBe(false);
    expect(getPendingAndClear()).toBeNull();
  });

  it('setPending 后 hasPending 为 true', () => {
    setPending(makePayload());
    expect(hasPending()).toBe(true);
  });

  it('getPendingAndClear 返回暂存并清空', () => {
    const payload = makePayload({ text: 'test text' });
    setPending(payload);
    const result = getPendingAndClear();
    expect(result).toEqual(payload);
    expect(hasPending()).toBe(false);
    expect(getPendingAndClear()).toBeNull();
  });

  it('连续 setPending 覆盖旧暂存', () => {
    setPending(makePayload({ text: 'first' }));
    setPending(makePayload({ text: 'second' }));
    const result = getPendingAndClear();
    expect(result?.text).toBe('second');
  });
});

describe('background/messaging-router · handleSelectionSend（分流核心）', () => {
  it('panelOpen=true 时直接转发 AT_SELECTION_DELIVER 并回复 delivered:true', () => {
    // 模拟 panelOpen=true
    initPanelState();
    const port = {
      name: 'at-sidepanel',
      onDisconnect: { addListener: vi.fn() },
    } as unknown as Port;
    triggerConnect(port);

    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    const payload = makePayload();

    const response = handleSelectionSend(payload);

    expect(response.delivered).toBe(true);
    expect(response.showFloatButton).toBeUndefined();
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'AT_SELECTION_DELIVER', payload });
    expect(hasPending()).toBe(false); // 不暂存
  });

  it('panelOpen=false 时暂存并回复 showFloatButton:true', () => {
    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    const payload = makePayload();

    const response = handleSelectionSend(payload);

    expect(response.delivered).toBe(false);
    expect(response.showFloatButton).toBe(true);
    expect(sendMessageSpy).not.toHaveBeenCalled(); // 不直接转发
    expect(hasPending()).toBe(true); // 已暂存
  });
});

describe('background/messaging-router · handleFloatButtonClick', () => {
  it('调用 sidePanel.open({ windowId })', () => {
    const openSpy = vi.spyOn(fakeBrowser.sidePanel, 'open').mockResolvedValue(undefined);
    handleFloatButtonClick(42);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith({ windowId: 42 });
  });
});

describe('background/messaging-router · handlePanelReady', () => {
  it('有暂存时转发 AT_SELECTION_DELIVER 并清空', () => {
    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    const payload = makePayload({ text: 'pending text' });
    setPending(payload);

    handlePanelReady();

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'AT_SELECTION_DELIVER', payload });
    expect(hasPending()).toBe(false);
  });

  it('无暂存时不转发', () => {
    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    handlePanelReady();
    expect(sendMessageSpy).not.toHaveBeenCalled();
  });
});

describe('background/messaging-router · handleMessage（统一入口）', () => {
  it('AT_SELECTION_SEND → 同步回复分流结果', () => {
    const sendResponse = vi.fn();
    const message: ExtensionMessage = { type: 'AT_SELECTION_SEND', payload: makePayload() };
    const sender = {} as MessageSender;

    const result = handleMessage(message, sender, sendResponse);

    expect(result).toBe(false); // 同步回复
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ delivered: false, showFloatButton: true });
  });

  it('AT_FLOAT_BUTTON_CLICK → 调用 sidePanel.open，不回复', () => {
    const openSpy = vi.spyOn(fakeBrowser.sidePanel, 'open').mockResolvedValue(undefined);
    const sendResponse = vi.fn();
    const message: ExtensionMessage = { type: 'AT_FLOAT_BUTTON_CLICK' };
    const sender = { tab: { windowId: 99 } } as unknown as MessageSender;

    const result = handleMessage(message, sender, sendResponse);

    expect(result).toBe(false);
    expect(openSpy).toHaveBeenCalledWith({ windowId: 99 });
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('AT_FLOAT_BUTTON_CLICK 无 tab 时不调用 sidePanel.open', () => {
    const openSpy = vi.spyOn(fakeBrowser.sidePanel, 'open').mockResolvedValue(undefined);
    const sendResponse = vi.fn();
    const message: ExtensionMessage = { type: 'AT_FLOAT_BUTTON_CLICK' };
    const sender = {} as MessageSender;

    handleMessage(message, sender, sendResponse);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('AT_PANEL_READY → 有暂存则转发', () => {
    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);
    setPending(makePayload({ text: 'ready test' }));
    const sendResponse = vi.fn();
    const message: ExtensionMessage = { type: 'AT_PANEL_READY' };
    const sender = {} as MessageSender;

    handleMessage(message, sender, sendResponse);

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('未知消息类型 → 不处理', () => {
    const sendResponse = vi.fn();
    const message = { type: 'UNKNOWN_MESSAGE' } as unknown as ExtensionMessage;
    const sender = {} as MessageSender;

    const result = handleMessage(message, sender, sendResponse);
    expect(result).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});

describe('background/messaging-router · 容错场景（M2 T2.5 补全）', () => {
  it('同 Tab 重复发送（panelOpen=false）：只保留最新暂存，旧暂存被覆盖', () => {
    const payload1 = makePayload({ text: 'first selection' });
    const payload2 = makePayload({ text: 'second selection' });

    // 第一次发送
    handleSelectionSend(payload1);
    expect(hasPending()).toBe(true);
    expect(getPendingAndClear()?.text).toBe('first selection');

    // 重新暂存第一次（因为 getPendingAndClear 清空了）
    handleSelectionSend(payload1);
    // 第二次发送，覆盖第一次
    handleSelectionSend(payload2);

    const pending = getPendingAndClear();
    expect(pending?.text).toBe('second selection');
    expect(hasPending()).toBe(false);
  });

  it('同 Tab 重复发送（panelOpen=true）：每次都直接转发，创建多张卡片', () => {
    initPanelState(); // 注册 onConnect 监听器
    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);

    // 模拟 panelOpen=true
    const port = { name: SIDEPANEL_PORT_NAME, onDisconnect: { addListener: vi.fn() } };
    triggerConnect(port);

    const payload1 = makePayload({ text: 'first' });
    const payload2 = makePayload({ text: 'second' });

    handleSelectionSend(payload1);
    handleSelectionSend(payload2);

    expect(sendMessageSpy).toHaveBeenCalledTimes(2);
    expect(sendMessageSpy).toHaveBeenNthCalledWith(1, {
      type: 'AT_SELECTION_DELIVER',
      payload: payload1,
    });
    expect(sendMessageSpy).toHaveBeenNthCalledWith(2, {
      type: 'AT_SELECTION_DELIVER',
      payload: payload2,
    });
    expect(hasPending()).toBe(false);
  });

  it('超长选区：不截断，payload.text 保持完整（D6）', () => {
    const longText = 'a'.repeat(100000); // 10 万字符
    const payload = makePayload({ text: longText });

    const response = handleSelectionSend(payload);
    expect(response.delivered).toBe(false);
    expect(response.showFloatButton).toBe(true);

    const pending = getPendingAndClear();
    expect(pending?.text).toBe(longText); // 不截断
    expect(pending?.text.length).toBe(100000);
  });

  it('冷启动竞态：sidepanel 先 connect 再发 AT_PANEL_READY，暂存能正确转发', () => {
    initPanelState(); // 注册 onConnect 监听器
    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);

    // 1. 侧边栏未打开时，用户划词发送（暂存）
    const payload = makePayload({ text: 'cold start test' });
    handleSelectionSend(payload);
    expect(hasPending()).toBe(true);

    // 2. 用户点击浮动按钮，sidePanel.open()
    const openSpy = vi.spyOn(fakeBrowser.sidePanel, 'open').mockResolvedValue(undefined);
    handleFloatButtonClick(1);
    expect(openSpy).toHaveBeenCalledWith({ windowId: 1 });

    // 3. sidepanel 冷启动，先 connect（panelOpen=true）
    const port = { name: SIDEPANEL_PORT_NAME, onDisconnect: { addListener: vi.fn() } };
    triggerConnect(port);
    expect(isPanelOpen()).toBe(true);

    // 4. sidepanel 发送 AT_PANEL_READY，触发暂存转发
    handlePanelReady();

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'AT_SELECTION_DELIVER', payload });
    expect(hasPending()).toBe(false);
  });

  it('sidepanel 断开后 panelOpen=false，后续发送走暂存流程', () => {
    initPanelState(); // 注册 onConnect 监听器
    // 1. sidepanel 连接
    let disconnectCallback: (() => void) | null = null;
    const port = {
      name: SIDEPANEL_PORT_NAME,
      onDisconnect: {
        addListener: (fn: () => void) => {
          disconnectCallback = fn;
        },
      },
    };
    triggerConnect(port);
    expect(isPanelOpen()).toBe(true);

    // 2. sidepanel 断开
    expect(disconnectCallback).not.toBeNull();
    disconnectCallback!();
    expect(isPanelOpen()).toBe(false);

    // 3. 后续发送走暂存流程
    const payload = makePayload({ text: 'after disconnect' });
    const response = handleSelectionSend(payload);
    expect(response.delivered).toBe(false);
    expect(response.showFloatButton).toBe(true);
    expect(hasPending()).toBe(true);
  });

  it('AT_PANEL_READY 重复发送：只转发一次（暂存已清空）', () => {
    const sendMessageSpy = vi
      .spyOn(fakeBrowser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);

    setPending(makePayload({ text: 'test' }));

    // 第一次 PANEL_READY：转发并清空
    handlePanelReady();
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(hasPending()).toBe(false);

    // 第二次 PANEL_READY：无暂存，不转发
    handlePanelReady();
    expect(sendMessageSpy).toHaveBeenCalledTimes(1); // 仍然是 1 次
  });
});
