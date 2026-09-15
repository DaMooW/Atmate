/**
 * 选区文本精确提取（M3 修复，针对 pdf.js TextLayer）。
 *
 * 问题背景：
 * - pdf.js TextLayer 的 span 是绝对定位的，`selection.toString()` 在某些情况下
 *   会包含零宽字符、endOfContent 元素文本，或因跨 span 拼接导致偏移
 * - 本模块遍历 Range 中的文本节点，按 startOffset/endOffset 精确截取，
 *   过滤零宽字符和 pdf.js 特殊标记
 *
 * 纯函数（接收 Selection/Range，返回文本），可在 L1 单测中用 jsdom 覆盖。
 */

/** 零宽字符和不可见字符（pdf.js endOfContent 可能包含） */
const ZERO_WIDTH_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

/**
 * 从 Range 中精确提取文本。
 *
 * 遍历 Range 内的所有文本节点：
 * - 起始节点：从 startOffset 开始截取
 * - 结束节点：截取到 endOffset
 * - 中间节点：完整截取
 * - 过滤零宽字符
 *
 * @param range - 选区 Range
 * @returns 精确提取的文本
 */
export function extractTextFromRange(range: Range): string {
  if (!range || range.collapsed) return '';

  const { startContainer, startOffset, endContainer, endOffset } = range;

  // 起止在同一个文本节点
  if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent ?? '';
    return cleanText(text.slice(startOffset, endOffset));
  }

  // 遍历 Range 内的所有节点
  const parts: string[] = [];
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text) {
      // 只接受在 Range 内的文本节点
      if (range.intersectsNode(node)) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_REJECT;
    },
  });

  let node: Node | null = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    let text = textNode.textContent ?? '';

    if (node === startContainer) {
      text = text.slice(startOffset);
    }
    if (node === endContainer) {
      text = text.slice(0, endOffset);
    }

    if (text) {
      parts.push(cleanText(text));
    }
    node = walker.nextNode();
  }

  return parts.join('');
}

/**
 * 从 Selection 中精确提取文本（取第一个 Range）。
 *
 * @param selection - 选区对象
 * @returns 精确提取的文本
 */
export function extractSelectionText(selection: Selection | null): string {
  if (!selection || selection.rangeCount === 0) return '';
  return extractTextFromRange(selection.getRangeAt(0));
}

/**
 * 清理文本：移除零宽字符，规范化空白。
 *
 * @param text - 原始文本
 * @returns 清理后的文本
 */
export function cleanText(text: string): string {
  return text.replace(ZERO_WIDTH_CHARS, '');
}
