/**
 * 选区有效性判定纯函数（M2 T2.1）。
 *
 * 判定规则：
 * - 空选区 / null → 无效
 * - 纯空白选区（trim 后为空）→ 无效
 * - 选区在 <input> / <textarea> / <select> 内 → 无效（FR-7.3 加分项：输入框不误触发）
 * - 选区在 [contenteditable] 元素内 → 无效（富文本编辑器不误触发）
 * - 其余 → 有效
 *
 * 纯函数，无 DOM 副作用，可在 L1 单测中用 jsdom 覆盖。
 */

/**
 * 判断选区是否在可编辑元素或表单控件内。
 * 沿 DOM 树向上遍历，检查表单控件标签和 contenteditable 属性。
 *
 * 使用 closest() 而非 HTMLElement.isContentEditable：
 * - closest 在 jsdom 和真实浏览器中行为一致
 * - :not([contenteditable="false"]) 正确处理显式关闭可编辑的子元素
 * - 自动处理继承情况（父元素 contenteditable，子元素继承）
 */
function isInEditableContext(element: Element | null): boolean {
  if (!element) return false;
  // 表单控件
  if (element.closest('input, textarea, select')) return true;
  // contenteditable（排除显式设置为 false 的情况）
  if (element.closest('[contenteditable]:not([contenteditable="false"])')) return true;
  return false;
}

/**
 * 判断选区是否有效（可触发浮动按钮 / 发送到侧边栏）。
 *
 * @param selection - window.getSelection() 的返回值，可能为 null
 * @returns true 表示有效选区，false 表示应忽略
 */
export function isValidSelection(selection: Selection | null): boolean {
  // 空选区
  if (!selection || selection.rangeCount === 0) return false;

  // 纯文本为空
  const text = selection.toString();
  if (!text || text.trim() === '') return false;

  // 锚点节点不存在（极端情况）
  const anchorNode = selection.anchorNode;
  if (!anchorNode) return false;

  // 取锚点元素：文本节点取 parentElement，元素节点直接用
  const anchorElement: Element | null =
    anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : anchorNode.parentElement;

  if (!anchorElement) return false;

  // 输入框 / 可编辑元素内不触发
  if (isInEditableContext(anchorElement)) return false;

  return true;
}
