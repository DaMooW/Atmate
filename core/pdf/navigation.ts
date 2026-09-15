/**
 * PDF 导航分流纯函数（M3 T3.2 D2/D8，L1 可单测）。
 *
 * 根据用户设置的 pdfOpenMode 决定对 PDF URL 的处理方式。
 */

import type { PdfOpenMode } from '../types';

/** 分流动作 */
export type PdfAction =
  | { type: 'ask' } // 弹出选择窗
  | { type: 'redirect'; viewerUrl: string } // 重定向到扩展 viewer 页
  | { type: 'ignore' }; // 不干预，原生加载

/**
 * 根据 pdfOpenMode 决定对 PDF URL 的处理动作。
 *
 * @param mode - 用户设置的 PDF 打开方式
 * @param pdfUrl - 原始 PDF URL
 * @param viewerPagePath - viewer.html 的相对路径（如 'viewer.html'）
 * @returns 分流动作
 */
export function decidePdfAction(
  mode: PdfOpenMode,
  pdfUrl: string,
  viewerPagePath = 'viewer.html',
): PdfAction {
  switch (mode) {
    case 'viewer':
      return {
        type: 'redirect',
        viewerUrl: `${viewerPagePath}?file=${encodeURIComponent(pdfUrl)}`,
      };
    case 'native':
      return { type: 'ignore' };
    case 'ask':
    default:
      return { type: 'ask' };
  }
}
