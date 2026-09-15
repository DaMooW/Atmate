/**
 * 扫描件（无文字层）检测纯函数（M3 T3.1 D16，L1 可单测）。
 *
 * pdf.js 的 page.getTextContent() 返回 { items: TextItem[] }。
 * 文字项极少或为空 → 该页可能是扫描件（纯图片页）。
 */

/** pdf.js TextItem 的最小结构（只用到 str 字段） */
export interface PdfTextItem {
  str: string;
  [key: string]: unknown;
}

/**
 * 判断某页是否为扫描件（无文字层）。
 *
 * 规则：文字项数量 < threshold 视为无文字层。
 * 默认阈值 5：正常文字页通常有数十到数百个文字项，
 * 纯图片/扫描页 items 为空或只有零星空白项。
 *
 * @param items - pdf.js getTextContent() 返回的 items 数组
 * @param threshold - 文字项数量阈值，默认 5
 * @returns true 如果该页无文字层（扫描件）
 */
export function isScannedPage(items: PdfTextItem[], threshold = 5): boolean {
  if (!items || items.length === 0) return true;
  // 过滤掉纯空白项后再判断（有些扫描件可能有 1-2 个空字符串项）
  const nonEmpty = items.filter((item) => item.str && item.str.trim().length > 0);
  return nonEmpty.length < threshold;
}

/**
 * 判断连续多页是否均为扫描件（用于"全文为扫描件"标记）。
 *
 * @param pageResults - 每页的 isScannedPage 结果数组
 * @param requiredConsecutive - 需要连续多少页均为扫描件，默认 5
 * @returns true 如果存在连续 requiredConsecutive 页均为扫描件
 */
export function isAllScanned(pageResults: boolean[], requiredConsecutive = 5): boolean {
  if (pageResults.length < requiredConsecutive) return false;
  let consecutive = 0;
  for (const isScanned of pageResults) {
    if (isScanned) {
      consecutive++;
      if (consecutive >= requiredConsecutive) return true;
    } else {
      consecutive = 0;
    }
  }
  return false;
}
