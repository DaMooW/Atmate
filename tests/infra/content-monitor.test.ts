// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSelectionMonitor,
  SELECTION_CHANGE_DEBOUNCE_MS,
  MOUSEUP_SUPPRESS_WINDOW_MS,
} from '../../entrypoints/content/selection/monitor';

/**
 * 辅助函数：在指定元素内创建选区。
 */
function selectElement(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * 辅助函数：清空选区。
 */
function clearSelection() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
}

/**
 * 辅助函数：触发 mouseup 事件（捕获阶段）。
 */
function triggerMouseUp() {
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
}

/**
 * 辅助函数：触发 selectionchange 事件。
 */
function triggerSelectionChange() {
  document.dispatchEvent(new Event('selectionchange'));
}

describe('entrypoints/content/selection/monitor · createSelectionMonitor (D22 mouseup-first)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mouseup 后立即触发 onValidSelection（主要路径，延迟 10ms）', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    // 先创建选区，再触发 mouseup
    selectElement(p);
    triggerMouseUp();

    // mouseup 后 10ms 内不触发（有 setTimeout 10ms 延迟）
    expect(onValidSelection).not.toHaveBeenCalled();

    // 快进到 10ms 后
    vi.advanceTimersByTime(10);
    expect(onValidSelection).toHaveBeenCalledTimes(1);
    expect(onValidSelection).toHaveBeenCalledWith(expect.any(Selection));

    monitor.destroy();
  });

  it('mouseup 后无效选区 → 触发 onInvalidSelection', () => {
    const onValidSelection = vi.fn();
    const onInvalidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection, onInvalidSelection });

    // 空选区 + mouseup
    clearSelection();
    triggerMouseUp();

    vi.advanceTimersByTime(10);
    expect(onValidSelection).not.toHaveBeenCalled();
    expect(onInvalidSelection).toHaveBeenCalledTimes(1);

    monitor.destroy();
  });

  it('输入框内选区 + mouseup → 触发 onInvalidSelection', () => {
    const input = document.createElement('input');
    input.value = 'text in input';
    document.body.appendChild(input);

    const onValidSelection = vi.fn();
    const onInvalidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection, onInvalidSelection });

    const range = document.createRange();
    range.selectNodeContents(input);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    triggerMouseUp();

    vi.advanceTimersByTime(10);
    expect(onValidSelection).not.toHaveBeenCalled();
    expect(onInvalidSelection).toHaveBeenCalledTimes(1);

    monitor.destroy();
  });

  it('selectionchange 去抖后触发 onValidSelection（键盘选择兜底）', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    // 只触发 selectionchange（不触发 mouseup），模拟键盘选择
    selectElement(p);
    triggerSelectionChange();

    // 去抖时间内不触发
    expect(onValidSelection).not.toHaveBeenCalled();

    // 快进到去抖时间后
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS);
    expect(onValidSelection).toHaveBeenCalledTimes(1);

    monitor.destroy();
  });

  it('mouseup 后抑制窗口内 selectionchange 不重复触发', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    // mouseup 触发一次
    selectElement(p);
    triggerMouseUp();
    vi.advanceTimersByTime(10);
    expect(onValidSelection).toHaveBeenCalledTimes(1);

    // mouseup 后立即触发 selectionchange（在抑制窗口内）
    triggerSelectionChange();
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS);

    // 不应重复触发
    expect(onValidSelection).toHaveBeenCalledTimes(1);

    monitor.destroy();
  });

  it('mouseup 抑制窗口过后 selectionchange 可再次触发', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    // mouseup 触发一次
    selectElement(p);
    triggerMouseUp();
    vi.advanceTimersByTime(10);
    expect(onValidSelection).toHaveBeenCalledTimes(1);

    // 快进超过抑制窗口
    vi.advanceTimersByTime(MOUSEUP_SUPPRESS_WINDOW_MS);

    // 再次触发 selectionchange（模拟键盘修改选区）
    triggerSelectionChange();
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS);

    // 应再次触发
    expect(onValidSelection).toHaveBeenCalledTimes(2);

    monitor.destroy();
  });

  it('去抖期间连续触发 selectionchange，只执行最后一次', () => {
    const p1 = document.createElement('p');
    p1.textContent = 'First selection';
    const p2 = document.createElement('p');
    p2.textContent = 'Second selection';
    document.body.appendChild(p1);
    document.body.appendChild(p2);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    // 第一次 selectionchange
    selectElement(p1);
    triggerSelectionChange();
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS / 2);

    // 去抖期间第二次 selectionchange（覆盖第一次）
    selectElement(p2);
    triggerSelectionChange();

    // 第一次的定时器应该被清除
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS / 2);
    expect(onValidSelection).not.toHaveBeenCalled();

    // 第二次的去抖时间到了才触发
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS / 2);
    expect(onValidSelection).toHaveBeenCalledTimes(1);

    monitor.destroy();
  });

  it('destroy() 后不再触发回调', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    monitor.destroy();

    selectElement(p);
    triggerMouseUp();
    triggerSelectionChange();
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS * 2);

    expect(onValidSelection).not.toHaveBeenCalled();
  });

  it('destroy() 清除待执行的定时器', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    selectElement(p);
    triggerSelectionChange();

    // 在去抖期间 destroy
    monitor.destroy();

    // 快进，不应该触发
    vi.advanceTimersByTime(SELECTION_CHANGE_DEBOUNCE_MS * 2);
    expect(onValidSelection).not.toHaveBeenCalled();
  });

  it('onInvalidSelection 可选（不提供时不报错）', () => {
    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    clearSelection();
    triggerMouseUp();
    vi.advanceTimersByTime(10);

    expect(onValidSelection).not.toHaveBeenCalled();
    // 不报错即通过

    monitor.destroy();
  });

  it('连续 mouseup 只触发最后一次选区（缓慢划词场景）', () => {
    const p1 = document.createElement('p');
    p1.textContent = 'First';
    const p2 = document.createElement('p');
    p2.textContent = 'Second longer selection';
    document.body.appendChild(p1);
    document.body.appendChild(p2);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    // 第一次 mouseup（选了短文本）
    selectElement(p1);
    triggerMouseUp();
    vi.advanceTimersByTime(10);
    expect(onValidSelection).toHaveBeenCalledTimes(1);

    // 第二次 mouseup（选了更长的文本，模拟缓慢划词过程中多次 mouseup）
    selectElement(p2);
    triggerMouseUp();
    vi.advanceTimersByTime(10);
    expect(onValidSelection).toHaveBeenCalledTimes(2);
    // 第二次传入的选区应该是 p2 的内容
    const secondCall = onValidSelection.mock.calls[1]![0] as Selection;
    expect(secondCall.toString()).toBe('Second longer selection');

    monitor.destroy();
  });
});
