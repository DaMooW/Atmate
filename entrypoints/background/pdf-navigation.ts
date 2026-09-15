/**
 * PDF 导航接管（M3 T3.2 D2/D7/D8）。
 *
 * 监听 chrome.webNavigation.onBeforeNavigate，检测 PDF URL 后按 pdfOpenMode 分流：
 * - viewer：直接重定向到扩展 viewer.html
 * - native：不干预
 * - ask：重定向到 viewer.html?file=...&ask=1，由 viewer 页显示选择弹窗
 *
 * 打破循环：用户在选择页选"原生"时，URL 附带 #atmate-skip，本模块检测到即跳过。
 */

import { isPdfUrl } from '~/core/pdf/url';
import { decidePdfAction } from '~/core/pdf/navigation';
import type { PdfOpenMode } from '~/core/types';

const SKIP_FRAGMENT = 'atmate-skip';

/**
 * 从 storage 读取 pdfOpenMode。
 * storage 结构：at:state → uiPrefs.pdfOpenMode
 */
async function getPdfOpenMode(): Promise<PdfOpenMode> {
  try {
    const result = await browser.storage.local.get('at:state');
    const state = (result['at:state'] ?? {}) as Record<string, unknown>;
    const uiPrefs = (state.uiPrefs ?? {}) as Record<string, unknown>;
    return (uiPrefs.pdfOpenMode as PdfOpenMode) ?? 'ask';
  } catch {
    return 'ask';
  }
}

/**
 * 初始化 PDF 导航接管监听。
 * 在 background.ts 的 defineBackground 中调用。
 */
export function initPdfNavigation(): void {
  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // 只处理主框架导航
    if (details.frameId !== 0) return;

    const url = details.url;

    // 跳过扩展自身页面
    if (url.startsWith('chrome-extension://')) return;

    // 跳过带 skip 标记的导航（用户选择原生后打破循环）
    if (url.includes(`#${SKIP_FRAGMENT}`) || url.includes(`&${SKIP_FRAGMENT}`)) return;

    // 判断是否为 PDF
    if (!isPdfUrl(url)) return;

    const mode = await getPdfOpenMode();
    const action = decidePdfAction(mode, url);

    switch (action.type) {
      case 'redirect': {
        // viewer 模式：直接重定向（不带 ask 参数）
        const viewerUrl = action.viewerUrl;
        try {
          await browser.tabs.update(details.tabId, { url: viewerUrl });
        } catch (error) {
          console.error('[Atmate] PDF 重定向失败', error);
        }
        break;
      }
      case 'ask': {
        // ask 模式：重定向到 viewer 页并带 ask=1，由 viewer 显示选择弹窗
        const askUrl = `viewer.html?file=${encodeURIComponent(url)}&ask=1`;
        try {
          await browser.tabs.update(details.tabId, { url: askUrl });
        } catch (error) {
          console.error('[Atmate] PDF 询问重定向失败', error);
        }
        break;
      }
      case 'ignore':
      default:
        // native 模式：不干预
        break;
    }
  });
}
