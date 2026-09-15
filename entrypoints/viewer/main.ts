/**
 * Viewer 入口（M3 T3.1/T3.3/T3.4）。
 *
 * 职责：
 * - 解析 URL 参数，加载 PDF
 * - file:// 权限检测与引导
 * - 初始化 PdfViewer（渲染、翻页、缩放）
 * - 绑定工具栏事件
 * - 扫描件自动检测与警告条
 * - 加载失败处理（密码/损坏/网络错误）
 * - 复用 M2 划词链路（选区监听 + 浮动按钮 + 消息发送）
 */

import * as pdfjsLib from 'pdfjs-dist';
import { PdfViewer } from './pdf-viewer';
import { ScannedWarning } from './scanned-warning';
import { parseViewerUrl, isFileUrl, extractFileName } from '~/core/pdf/url';
import { isScannedPage, isAllScanned } from '~/core/pdf/scanned';
import { createSelectionMonitor } from '../content/selection/monitor';
import { createFloatButton } from '../content/float-button';
import { calcButtonPosition } from '../content/float-button/position';
import { sendSelection, sendFloatButtonClick } from '../content/messaging/send';
import { extractSelectionText } from '~/core/selection/extract';
import type { SelectionSendPayload, PdfMeta } from '~/core/messages';

// ── DOM 引用 ──────────────────────────────────────────────
const container = document.getElementById('viewer-container')!;
const overlay = document.getElementById('overlay')!;
const overlaySpinner = document.getElementById('overlay-spinner')!;
const overlayText = document.getElementById('overlay-text')!;
const pageNumEl = document.getElementById('page-num')!;
const pageTotalEl = document.getElementById('page-total')!;
const zoomLevelEl = document.getElementById('zoom-level')!;
const docTitleEl = document.getElementById('doc-title')!;

const viewer = new PdfViewer(container);
const scannedWarning = new ScannedWarning();

// 记录最近 N 页的扫描件检测结果（用于全文扫描件判断）
const scanHistory: boolean[] = [];
const SCAN_HISTORY_SIZE = 5;

// ── 覆盖层工具 ────────────────────────────────────────────

function showOverlay(html: string, showSpinner = false): void {
  overlay.classList.remove('hidden');
  overlaySpinner.style.display = showSpinner ? 'block' : 'none';
  overlayText.innerHTML = html;
}

function hideOverlay(): void {
  overlay.classList.add('hidden');
}

function showError(title: string, desc: string, originalUrl: string): void {
  showOverlay(`
    <div class="error-title">${title}</div>
    <div class="error-desc">${desc}</div>
    <div style="display:flex;gap:12px;margin-top:8px;">
      <button id="btn-retry">重试</button>
      <button id="btn-open-native" class="btn-secondary">在 Chrome 原生查看器打开</button>
    </div>
  `);
  document.getElementById('btn-retry')?.addEventListener('click', () => loadPdf(originalUrl));
  document.getElementById('btn-open-native')?.addEventListener('click', () => {
    window.open(originalUrl, '_blank');
  });
}

function showPasswordPrompt(originalUrl: string): void {
  showOverlay(`
    <div class="error-title">此 PDF 需要密码</div>
    <input type="password" id="pdf-password" placeholder="请输入密码" />
    <div style="display:flex;gap:12px;">
      <button id="btn-submit-password">确定</button>
      <button id="btn-open-native" class="btn-secondary">在原生查看器打开</button>
    </div>
  `);
  const input = document.getElementById('pdf-password') as HTMLInputElement;
  input?.focus();
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitPassword();
  });
  document.getElementById('btn-submit-password')?.addEventListener('click', submitPassword);
  document.getElementById('btn-open-native')?.addEventListener('click', () => {
    window.open(originalUrl, '_blank');
  });

  async function submitPassword(): Promise<void> {
    const password = input?.value ?? '';
    if (!password) return;
    try {
      await loadPdf(originalUrl, password);
    } catch {
      // 密码错误会再次触发密码提示
    }
  }
}

function showFileAccessGuide(): void {
  showOverlay(`
    <div class="error-title">需要文件访问权限</div>
    <div class="error-desc">
      此扩展需要「允许访问文件网址」权限才能打开本地 PDF 文件。<br><br>
      请按以下步骤开启：<br>
      1. 打开 <code>chrome://extensions</code><br>
      2. 找到「在伴 Atmate」，点击「详细信息」<br>
      3. 开启「允许访问文件网址」
    </div>
    <button id="btn-open-extensions">打开扩展管理页</button>
  `);
  document.getElementById('btn-open-extensions')?.addEventListener('click', () => {
    window.open('chrome://extensions', '_blank');
  });
}

// ── PDF 加载 ──────────────────────────────────────────────

async function loadPdf(url: string, password?: string): Promise<void> {
  scannedWarning.reset();
  scanHistory.length = 0;
  showOverlay('正在加载 PDF…', true);

  try {
    const loadingTask = pdfjsLib.getDocument({ url, password });
    const pdfDoc = await loadingTask.promise;

    // 用 PdfViewer 封装加载（复用渲染逻辑）
    viewer.destroy();
    // 直接调用内部加载（PdfViewer.load 不支持 password 参数，这里手动设置）
    (viewer as unknown as { pdfDoc: pdfjsLib.PDFDocumentProxy }).pdfDoc = pdfDoc;
    pageTotalEl.textContent = String(pdfDoc.numPages);
    docTitleEl.textContent = extractFileName(url);

    const result = await viewer.renderPage(1);
    hideOverlay();
    updateToolbar();

    // 扫描件检测
    await detectScanned(result.textItems);

    // 初始化划词链路（PDF 渲染完成后）
    initSelection(url);
  } catch (error) {
    hideOverlay();
    handleLoadError(error, url);
  }
}

function handleLoadError(error: unknown, url: string): void {
  const name = (error as { name?: string })?.name;
  if (name === 'PasswordException') {
    showPasswordPrompt(url);
  } else if (name === 'InvalidPDFException') {
    showError('文件损坏', '此 PDF 文件可能已损坏或格式无效，无法在扩展查看器中打开。', url);
  } else if (name === 'MissingPDFException') {
    showError('文件未找到', '无法找到指定的 PDF 文件，请检查链接是否正确。', url);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    showError('加载失败', `PDF 加载时出错：${message}`, url);
  }
}

// ── 扫描件检测 ────────────────────────────────────────────

async function detectScanned(
  textItems: Awaited<ReturnType<PdfViewer['getCurrentPageTextItems']>>,
): Promise<void> {
  const scanned = isScannedPage(textItems);
  scanHistory.push(scanned);
  if (scanHistory.length > SCAN_HISTORY_SIZE) scanHistory.shift();
  const allScanned = isAllScanned(scanHistory, SCAN_HISTORY_SIZE);
  scannedWarning.update(scanned, allScanned);
}

// ── 工具栏 ────────────────────────────────────────────────

function updateToolbar(): void {
  pageNumEl.textContent = String(viewer.pageNumber);
  pageTotalEl.textContent = String(viewer.totalPages);
  zoomLevelEl.textContent = `${Math.round(viewer.currentScale * 100)}%`;
  (document.getElementById('btn-prev') as HTMLButtonElement).disabled = viewer.pageNumber <= 1;
  (document.getElementById('btn-next') as HTMLButtonElement).disabled =
    viewer.pageNumber >= viewer.totalPages;
}

async function withLoading<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

document.getElementById('btn-prev')!.addEventListener('click', async () => {
  const result = await withLoading(() => viewer.prevPage());
  if (result) {
    updateToolbar();
    await detectScanned(result.textItems);
  }
});

document.getElementById('btn-next')!.addEventListener('click', async () => {
  const result = await withLoading(() => viewer.nextPage());
  if (result) {
    updateToolbar();
    await detectScanned(result.textItems);
  }
});

document.getElementById('btn-zoom-in')!.addEventListener('click', async () => {
  const result = await withLoading(() => viewer.zoom(1.2));
  if (result) updateToolbar();
});

document.getElementById('btn-zoom-out')!.addEventListener('click', async () => {
  const result = await withLoading(() => viewer.zoom(0.8));
  if (result) updateToolbar();
});

document.getElementById('btn-fit-width')!.addEventListener('click', async () => {
  const result = await withLoading(() => viewer.fitWidth());
  if (result) updateToolbar();
});

document.getElementById('btn-download')!.addEventListener('click', () => {
  const url = parseViewerUrl(window.location.search);
  if (url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = extractFileName(url);
    a.click();
  }
});

document.getElementById('btn-native')!.addEventListener('click', () => {
  const url = parseViewerUrl(window.location.search);
  if (url) window.open(url, '_blank');
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    document.getElementById('btn-prev')!.click();
  } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault();
    document.getElementById('btn-next')!.click();
  }
});

// ── 划词链路（复用 M2） ───────────────────────────────────

/**
 * 采集 PDF 全文数据（T3.6，D9 截断策略）。
 * ≤50 页取全文；>50 页取当前页 ±5 页（共 11 页，边界 clamp）。
 */
async function collectPdfFullData(): Promise<{
  pdfFull?: string;
  pdfFullTruncated?: boolean;
  pdfFullStartPage?: number;
  pdfFullEndPage?: number;
  pdfNoTextLayer?: boolean;
}> {
  const total = viewer.totalPages;
  const current = viewer.pageNumber;

  if (total <= 50) {
    const text = await viewer.extractText(1, total);
    if (!text.trim()) {
      return { pdfNoTextLayer: true };
    }
    return { pdfFull: text };
  }

  // >50 页：当前页 ±5
  const start = Math.max(1, current - 5);
  const end = Math.min(total, current + 5);
  const text = await viewer.extractText(start, end);
  if (!text.trim()) {
    return { pdfNoTextLayer: true };
  }
  return {
    pdfFull: text,
    pdfFullTruncated: true,
    pdfFullStartPage: start,
    pdfFullEndPage: end,
  };
}

/**
 * 采集 PDF 段落上下文（containing-paragraph / nearby 档位）。
 *
 * PDF 没有 HTML 段落结构，基于文本行的 y 坐标间距模拟段落：
 * 1. 获取当前页按行分组的文本
 * 2. 行间距大于平均行高 1.5 倍 → 段落分隔
 * 3. 根据选中文本定位所在段落
 * 4. 相邻段落取前一个/后一个非空段落
 *
 * @param selectedText - 用户选中的文本
 * @returns 段落上下文数据
 */
async function collectPdfParagraphData(selectedText: string): Promise<{
  containingParagraph?: string;
  beforeParagraph?: string;
  afterParagraph?: string;
}> {
  const lines = await viewer.getCurrentPageTextLines();
  if (lines.length === 0) return {};

  // 计算平均行高（用于段落分隔阈值）
  const yDiffs: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    if (prev && curr) {
      yDiffs.push(Math.abs(prev.y - curr.y));
    }
  }
  const avgLineHeight = yDiffs.length > 0 ? yDiffs.reduce((a, b) => a + b, 0) / yDiffs.length : 12;
  const paragraphGap = avgLineHeight * 1.5;

  // 将行组合成段落
  const paragraphs: string[] = [];
  const firstLine = lines[0];
  if (!firstLine) return {};
  let currentParaLines: string[] = [firstLine.text];

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1];
    const currLine = lines[i];
    if (!prevLine || !currLine) continue;
    const gap = Math.abs(prevLine.y - currLine.y);
    if (gap > paragraphGap) {
      // 新段落
      paragraphs.push(currentParaLines.join(' '));
      currentParaLines = [currLine.text];
    } else {
      currentParaLines.push(currLine.text);
    }
  }
  paragraphs.push(currentParaLines.join(' '));

  // 找到包含选中文本的段落
  const normalizedSelected = selectedText.trim().replace(/\s+/g, ' ');
  let paraIndex = -1;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (!para) continue;
    const normalizedPara = para.replace(/\s+/g, ' ');
    if (normalizedPara.includes(normalizedSelected)) {
      paraIndex = i;
      break;
    }
  }

  // 如果没找到精确匹配，尝试部分匹配（选中文本可能跨段落）
  if (paraIndex === -1 && normalizedSelected.length > 0) {
    const firstWord = normalizedSelected.split(' ')[0] ?? '';
    if (firstWord) {
      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];
        if (para && para.includes(firstWord)) {
          paraIndex = i;
          break;
        }
      }
    }
  }

  if (paraIndex === -1) return {};

  const containing = paragraphs[paraIndex];
  const before = paraIndex > 0 ? paragraphs[paraIndex - 1] : undefined;
  const after = paraIndex < paragraphs.length - 1 ? paragraphs[paraIndex + 1] : undefined;

  return {
    containingParagraph: containing,
    beforeParagraph: before,
    afterParagraph: after,
  };
}

function initSelection(pdfUrl: string): void {
  const floatButton = createFloatButton(async () => {
    floatButton.hide();
    await sendFloatButtonClick();
  });

  const handleScroll = () => {
    if (!floatButton.isVisible()) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const pos = calcButtonPosition(rect, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    floatButton.show(pos.x, pos.y);
  };
  window.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', handleScroll);

  createSelectionMonitor({
    onValidSelection: async (selection) => {
      // 用精确提取替代 selection.toString()，避免 pdf.js TextLayer 的零宽字符/偏移问题
      const text = extractSelectionText(selection);
      const pdfMeta: PdfMeta = {
        fileName: extractFileName(pdfUrl),
        pageNumber: viewer.pageNumber,
        totalPages: viewer.totalPages,
        isScanned: scanHistory[scanHistory.length - 1] ?? false,
      };

      // 并行采集：段落上下文 + pdf-full 数据
      const [paragraphData, pdfFullData] = await Promise.all([
        collectPdfParagraphData(text),
        collectPdfFullData(),
      ]);

      const payload: SelectionSendPayload = {
        text,
        title: extractFileName(pdfUrl),
        url: pdfUrl,
        source: 'pdf-viewer',
        contextData: {
          selection: text,
          containingParagraph: paragraphData.containingParagraph,
          beforeParagraph: paragraphData.beforeParagraph,
          afterParagraph: paragraphData.afterParagraph,
          ...pdfFullData,
        },
        pdfMeta,
      };

      const response = await sendSelection(payload);

      if (response.delivered) {
        floatButton.hide();
      } else if (response.showFloatButton) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const pos = calcButtonPosition(rect, {
          width: window.innerWidth,
          height: window.innerHeight,
        });
        floatButton.show(pos.x, pos.y);
      }
    },
    onInvalidSelection: () => {
      floatButton.hide();
    },
  });
}

// ── 启动 ──────────────────────────────────────────────────

function showAskDialog(pdfUrl: string): void {
  showOverlay(`
    <div class="error-title">打开 PDF</div>
    <div class="error-desc">选择如何打开此 PDF 文件</div>
    <div style="display:flex;flex-direction:column;gap:10px;width:280px;">
      <button id="btn-ask-viewer" style="padding:12px;">在扩展查看页打开</button>
      <button id="btn-ask-native" class="btn-secondary" style="padding:12px;">继续用 Chrome 原生查看器</button>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#aaa;cursor:pointer;">
        <input type="checkbox" id="ask-remember" /> 记住选择，不再询问
      </label>
    </div>
  `);

  document.getElementById('btn-ask-viewer')?.addEventListener('click', async () => {
    const remember = (document.getElementById('ask-remember') as HTMLInputElement)?.checked;
    if (remember) {
      await savePdfOpenMode('viewer');
    }
    // 去掉 ask 参数，正常加载
    const cleanUrl = `viewer.html?file=${encodeURIComponent(pdfUrl)}`;
    window.location.replace(cleanUrl);
  });

  document.getElementById('btn-ask-native')?.addEventListener('click', async () => {
    const remember = (document.getElementById('ask-remember') as HTMLInputElement)?.checked;
    if (remember) {
      await savePdfOpenMode('native');
    }
    // 跳回原生查看器，带 skip 标记打破循环
    window.location.replace(`${pdfUrl}#atmate-skip`);
  });
}

async function savePdfOpenMode(mode: 'viewer' | 'native'): Promise<void> {
  try {
    const result = await browser.storage.local.get('at:state');
    const state = (result['at:state'] ?? {}) as Record<string, unknown>;
    const uiPrefs = (state.uiPrefs ?? {}) as Record<string, unknown>;
    state.uiPrefs = { ...uiPrefs, pdfOpenMode: mode };
    await browser.storage.local.set({ 'at:state': state });
  } catch (error) {
    console.error('[Atmate] 保存 pdfOpenMode 失败', error);
  }
}

async function bootstrap(): Promise<void> {
  const pdfUrl = parseViewerUrl(window.location.search);
  const isAsk = new URLSearchParams(window.location.search).get('ask') === '1';

  if (!pdfUrl) {
    showError('缺少 PDF 地址', '请通过 viewer.html?file=<pdf_url> 打开 PDF 查看器。', '');
    return;
  }

  // ask 模式：先显示选择弹窗
  if (isAsk) {
    showAskDialog(pdfUrl);
    return;
  }

  // file:// 权限检测
  if (isFileUrl(pdfUrl)) {
    try {
      const allowed = await browser.extension.isAllowedFileSchemeAccess();
      if (!allowed) {
        showFileAccessGuide();
        return;
      }
    } catch {
      // 非扩展环境（如直接打开 HTML）跳过检测
    }
  }

  await loadPdf(pdfUrl);
}

void bootstrap();
