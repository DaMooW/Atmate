/**
 * 选区监听器（M2 T2.1，D22）。
 *
 * 职责：
 * - 监听 mouseup 事件：用户完成划词后立即触发 onValidSelection（主要路径）
 * - 监听 selectionchange 事件：仅用于隐藏浮动按钮（选区消失/无效时），
 *   以及键盘选择的兜底（去抖 500ms，且 mouseup 后 1 秒内不重复触发）
 * - 调用 isValidSelection 判定选区有效性
 * - 有效选区 → onValidSelection 回调；无效 → onInvalidSelection 回调（隐藏浮动按钮）
 * - 提供 destroy() 清理
 *
 * D22（2026-09-15）：原方案 selectionchange + 200ms 去抖会导致缓慢划词时
 * 创建多张卡片。改为 mouseup 优先 + selectionchange 兜底去重，确保一次划词
 * 只触发一次有效选区回调。
 */

import { isValidSelection } from '~/core/selection/validator';

/** selectionchange 兜底去抖时间（ms）：键盘选择时使用 */
export const SELECTION_CHANGE_DEBOUNCE_MS = 500;

/** mouseup 后抑制 selectionchange 触发的时间窗口（ms） */
export const MOUSEUP_SUPPRESS_WINDOW_MS = 1000;

export interface SelectionMonitorCallbacks {
  /** 选区有效时触发，传入当前 Selection 对象 */
  onValidSelection: (selection: Selection) => void;
  /** 选区无效时触发（如取消选区、选区在输入框内），可用于隐藏浮动按钮 */
  onInvalidSelection?: () => void;
}

export interface SelectionMonitor {
  /** 移除事件监听和定时器 */
  destroy: () => void;
}

/**
 * 创建选区监听器。
 *
 * @param callbacks - 有效/无效选区的回调
 * @returns 监听器实例，含 destroy() 方法
 */
export function createSelectionMonitor(callbacks: SelectionMonitorCallbacks): SelectionMonitor {
  let changeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMouseupTime = 0;

  /** 检查当前选区并触发对应回调 */
  const checkAndTrigger = () => {
    const selection = window.getSelection();
    if (isValidSelection(selection) && selection) {
      callbacks.onValidSelection(selection);
    } else {
      callbacks.onInvalidSelection?.();
    }
  };

  /** mouseup 事件处理：用户完成划词后立即触发 */
  const handleMouseUp = () => {
    lastMouseupTime = Date.now();
    // 清除 selectionchange 的兜底定时器（mouseup 优先）
    if (changeDebounceTimer) {
      clearTimeout(changeDebounceTimer);
      changeDebounceTimer = null;
    }
    // 延迟一小段时间确保 selection 已更新
    setTimeout(checkAndTrigger, 10);
  };

  /** selectionchange 事件处理：仅用于隐藏浮动按钮 + 键盘选择兜底 */
  const handleSelectionChange = () => {
    // 清除上一次的定时器
    if (changeDebounceTimer) {
      clearTimeout(changeDebounceTimer);
      changeDebounceTimer = null;
    }

    changeDebounceTimer = setTimeout(() => {
      changeDebounceTimer = null;

      // 如果在 mouseup 抑制窗口内，跳过（mouseup 已处理）
      if (Date.now() - lastMouseupTime < MOUSEUP_SUPPRESS_WINDOW_MS) {
        return;
      }

      // 检查选区：无效则隐藏浮动按钮，有效（键盘选择）则触发
      const selection = window.getSelection();
      if (isValidSelection(selection) && selection) {
        callbacks.onValidSelection(selection);
      } else {
        callbacks.onInvalidSelection?.();
      }
    }, SELECTION_CHANGE_DEBOUNCE_MS);
  };

  // 监听 mouseup（在 document 上，捕获阶段确保先于其他处理）
  document.addEventListener('mouseup', handleMouseUp, true);
  // 监听 selectionchange（在 document 上）
  document.addEventListener('selectionchange', handleSelectionChange);

  return {
    destroy() {
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (changeDebounceTimer) {
        clearTimeout(changeDebounceTimer);
        changeDebounceTimer = null;
      }
    },
  };
}
