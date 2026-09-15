/**
 * selectionchange 监听器（M2 T2.1）。
 *
 * 职责：
 * - 监听 document 的 selectionchange 事件
 * - 200ms 去抖（用户停止选择后才触发，避免拖动过程中频繁回调）
 * - 调用 isValidSelection 判定选区有效性
 * - 有效选区 → onValidSelection 回调；无效 → onInvalidSelection 回调（隐藏浮动按钮）
 * - 提供 destroy() 清理（页面卸载时调用，避免内存泄漏）
 *
 * 不直接操作 DOM（浮动按钮的显示/隐藏由调用方在回调中处理），
 * 保持本模块可测试、可复用。
 */

import { isValidSelection } from '~/core/selection/validator';

/** 去抖时间（ms）：用户停止选择后多久触发回调 */
export const SELECTION_DEBOUNCE_MS = 200;

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
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const handleSelectionChange = () => {
    // 清除上一次的定时器（去抖核心）
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const selection = window.getSelection();
      if (isValidSelection(selection) && selection) {
        callbacks.onValidSelection(selection);
      } else {
        callbacks.onInvalidSelection?.();
      }
    }, SELECTION_DEBOUNCE_MS);
  };

  // 监听 selectionchange（在 document 上，冒泡阶段即可）
  document.addEventListener('selectionchange', handleSelectionChange);

  return {
    destroy() {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    },
  };
}
