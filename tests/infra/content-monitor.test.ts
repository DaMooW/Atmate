// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSelectionMonitor,
  SELECTION_DEBOUNCE_MS,
} from '../../entrypoints/content/selection/monitor';

/**
 * 辅助函数：在指定元素内创建选区并触发 selectionchange 事件。
 */
function selectAndTrigger(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

/**
 * 辅助函数：清空选区并触发 selectionchange 事件。
 */
function clearSelectionAndTrigger() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  document.dispatchEvent(new Event('selectionchange'));
}

describe('entrypoints/content/selection/monitor · createSelectionMonitor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('有效选区后等待去抖时间，触发 onValidSelection', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    selectAndTrigger(p);

    // 去抖时间内不触发
    expect(onValidSelection).not.toHaveBeenCalled();

    // 快进到去抖时间后
    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS);
    expect(onValidSelection).toHaveBeenCalledTimes(1);
    expect(onValidSelection).toHaveBeenCalledWith(expect.any(Selection));

    monitor.destroy();
  });

  it('无效选区（空选区）后等待去抖时间，触发 onInvalidSelection', () => {
    const onValidSelection = vi.fn();
    const onInvalidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection, onInvalidSelection });

    clearSelectionAndTrigger();

    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS);
    expect(onValidSelection).not.toHaveBeenCalled();
    expect(onInvalidSelection).toHaveBeenCalledTimes(1);

    monitor.destroy();
  });

  it('输入框内选区 → 触发 onInvalidSelection（不触发 onValidSelection）', () => {
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
    document.dispatchEvent(new Event('selectionchange'));

    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS);
    expect(onValidSelection).not.toHaveBeenCalled();
    expect(onInvalidSelection).toHaveBeenCalledTimes(1);

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

    // 第一次选择
    selectAndTrigger(p1);
    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS / 2);

    // 去抖期间第二次选择（覆盖第一次）
    selectAndTrigger(p2);

    // 第一次的定时器应该被清除
    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS / 2);
    expect(onValidSelection).not.toHaveBeenCalled();

    // 第二次的去抖时间到了才触发
    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS / 2);
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

    selectAndTrigger(p);
    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS * 2);

    expect(onValidSelection).not.toHaveBeenCalled();
  });

  it('destroy() 清除待执行的定时器', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);

    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    selectAndTrigger(p);

    // 在去抖期间 destroy
    monitor.destroy();

    // 快进，不应该触发
    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS * 2);
    expect(onValidSelection).not.toHaveBeenCalled();
  });

  it('onInvalidSelection 可选（不提供时不报错）', () => {
    const onValidSelection = vi.fn();
    const monitor = createSelectionMonitor({ onValidSelection });

    clearSelectionAndTrigger();
    vi.advanceTimersByTime(SELECTION_DEBOUNCE_MS);

    expect(onValidSelection).not.toHaveBeenCalled();
    // 不报错即通过

    monitor.destroy();
  });
});
