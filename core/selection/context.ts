/**
 * 上下文采集纯函数（M2 T2.6，D4/D13）。
 *
 * ±相邻段落算法（D13）：
 * 1. 从选区的 commonAncestorContainer 向上找到最近的块级元素
 * 2. 取前一个和后一个同级块级元素的文本内容
 * 3. 如果没有同级块级元素，则向上找父级块级元素的兄弟
 *
 * 纯函数（接收 DOM 节点，返回文本），可在 L1 单测中用 jsdom 覆盖。
 */

/** 块级元素标签名（用于向上查找最近的块级祖先） */
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'LI',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'ARTICLE',
  'SECTION',
  'HEADER',
  'FOOTER',
  'NAV',
  'ASIDE',
  'FIGURE',
  'FIGCAPTION',
  'MAIN',
  'TD',
  'TH',
  'TR',
]);

/** 相邻段落采集结果 */
export interface NearbyParagraphs {
  /** 前一段落文本（可能为空字符串） */
  beforeParagraph: string;
  /** 后一段落文本（可能为空字符串） */
  afterParagraph: string;
}

/**
 * 找到节点最近的块级祖先元素。
 *
 * @param node - 起始节点
 * @returns 最近的块级祖先元素，如果没有则返回 null
 */
export function findNearestBlockAncestor(node: Node | null): Element | null {
  let current: Node | null = node;
  while (current && current.nodeType !== Node.DOCUMENT_NODE) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      if (BLOCK_TAGS.has(el.tagName)) {
        return el;
      }
    }
    current = current.parentNode;
  }
  return null;
}

/**
 * 获取元素的前一个同级块级元素。
 *
 * @param element - 当前元素
 * @returns 前一个同级块级元素，如果没有则返回 null
 */
function getPreviousBlockSibling(element: Element): Element | null {
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (BLOCK_TAGS.has(sibling.tagName)) {
      return sibling;
    }
    sibling = sibling.previousElementSibling;
  }
  return null;
}

/**
 * 获取元素的后一个同级块级元素。
 *
 * @param element - 当前元素
 * @returns 后一个同级块级元素，如果没有则返回 null
 */
function getNextBlockSibling(element: Element): Element | null {
  let sibling = element.nextElementSibling;
  while (sibling) {
    if (BLOCK_TAGS.has(sibling.tagName)) {
      return sibling;
    }
    sibling = sibling.nextElementSibling;
  }
  return null;
}

/**
 * 采集选区的 ±相邻段落（D13 算法）。
 *
 * @param selection - 当前 Selection 对象
 * @returns 前后段落文本
 */
export function getNearbyParagraphs(selection: Selection): NearbyParagraphs {
  if (selection.rangeCount === 0) {
    return { beforeParagraph: '', afterParagraph: '' };
  }

  const range = selection.getRangeAt(0);
  const blockAncestor = findNearestBlockAncestor(range.commonAncestorContainer);

  if (!blockAncestor) {
    return { beforeParagraph: '', afterParagraph: '' };
  }

  const prevBlock = getPreviousBlockSibling(blockAncestor);
  const nextBlock = getNextBlockSibling(blockAncestor);

  return {
    beforeParagraph: prevBlock?.textContent?.trim() ?? '',
    afterParagraph: nextBlock?.textContent?.trim() ?? '',
  };
}
