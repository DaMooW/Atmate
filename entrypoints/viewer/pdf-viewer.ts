/**
 * PDF Viewer 封装（M3 T3.1）。
 *
 * 基于 pdfjs-dist v6，提供：
 * - 加载 PDF（http/https/file://）
 * - 单页渲染（canvas + textLayer）
 * - 翻页、缩放、适应宽度
 * - getTextContent（用于扫描件检测和附全文）
 *
 * 设计：只负责渲染，不处理 UI 事件（事件绑定在 main.ts）。
 */

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PdfTextItem } from '~/core/pdf/scanned';

// 配置 worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfPageRenderResult {
  /** 页面对应的 canvas 元素 */
  canvas: HTMLCanvasElement;
  /** 文字层 div（可划词） */
  textLayerDiv: HTMLDivElement;
  /** 该页的文字项（用于扫描件检测） */
  textItems: PdfTextItem[];
}

export class PdfViewer {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private container: HTMLElement;
  private currentPage = 1;
  private scale = 1.0;
  private renderTask: pdfjsLib.RenderTask | null = null;
  private pageWrappers = new Map<number, HTMLElement>();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** 加载 PDF 文档 */
  async load(url: string): Promise<pdfjsLib.PDFDocumentProxy> {
    this.destroy();
    const loadingTask = pdfjsLib.getDocument({ url });
    this.pdfDoc = await loadingTask.promise;
    this.currentPage = 1;
    return this.pdfDoc;
  }

  /** 总页数 */
  get totalPages(): number {
    return this.pdfDoc?.numPages ?? 0;
  }

  /** 当前页码（1-based） */
  get pageNumber(): number {
    return this.currentPage;
  }

  /** 当前缩放比例 */
  get currentScale(): number {
    return this.scale;
  }

  /**
   * 渲染指定页（1-based）。
   * 懒加载：只渲染当前页，滚动时由调用方触发。
   */
  async renderPage(pageNum: number): Promise<PdfPageRenderResult> {
    if (!this.pdfDoc) throw new Error('PDF 未加载');
    if (pageNum < 1 || pageNum > this.totalPages) {
      throw new Error(`页码超出范围: ${pageNum}/${this.totalPages}`);
    }

    // 取消上一次渲染
    if (this.renderTask) {
      this.renderTask.cancel();
      this.renderTask = null;
    }

    this.currentPage = pageNum;
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });

    // 清理旧内容
    this.container.innerHTML = '';
    this.pageWrappers.clear();

    // 创建页面容器
    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.style.width = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;
    wrapper.dataset.pageNumber = String(pageNum);

    // canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // textLayer
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    wrapper.appendChild(canvas);
    wrapper.appendChild(textLayerDiv);
    this.container.appendChild(wrapper);
    this.pageWrappers.set(pageNum, wrapper);

    // 渲染 canvas
    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
    this.renderTask = page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      transform,
    });
    await this.renderTask.promise;
    this.renderTask = null;

    // 渲染 textLayer + 获取文字内容
    const textContent = await page.getTextContent();
    const textItems = textContent.items as PdfTextItem[];

    try {
      // pdf.js v6 TextLayer 类
      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      });
      await textLayer.render();
    } catch {
      // TextLayer 渲染失败时静默降级（canvas 仍可显示，只是不可划词）
      console.warn('[Atmate] textLayer 渲染失败，该页可能无法划词');
    }

    return { canvas, textLayerDiv, textItems };
  }

  /** 翻到上一页 */
  async prevPage(): Promise<PdfPageRenderResult | null> {
    if (this.currentPage <= 1) return null;
    return this.renderPage(this.currentPage - 1);
  }

  /** 翻到下一页 */
  async nextPage(): Promise<PdfPageRenderResult | null> {
    if (this.currentPage >= this.totalPages) return null;
    return this.renderPage(this.currentPage + 1);
  }

  /** 缩放（factor: 1.1 放大, 0.9 缩小） */
  async zoom(factor: number): Promise<PdfPageRenderResult> {
    this.scale = Math.max(0.25, Math.min(5, this.scale * factor));
    return this.renderPage(this.currentPage);
  }

  /** 适应宽度 */
  async fitWidth(): Promise<PdfPageRenderResult> {
    if (!this.pdfDoc) throw new Error('PDF 未加载');
    const page = await this.pdfDoc.getPage(this.currentPage);
    const baseViewport = page.getViewport({ scale: 1 });
    const containerWidth = this.container.clientWidth - 40; // 留 margin
    this.scale = containerWidth / baseViewport.width;
    return this.renderPage(this.currentPage);
  }

  /** 获取当前页文字项（用于扫描件检测） */
  async getCurrentPageTextItems(): Promise<PdfTextItem[]> {
    if (!this.pdfDoc) return [];
    const page = await this.pdfDoc.getPage(this.currentPage);
    const textContent = await page.getTextContent();
    return textContent.items as PdfTextItem[];
  }

  /**
   * 提取指定页范围的全文（T3.6 附 PDF 全文档）。
   * @param startPage 起始页（1-based）
   * @param endPage 结束页（1-based，含）
   */
  async extractText(startPage: number, endPage: number): Promise<string> {
    if (!this.pdfDoc) return '';
    const parts: string[] = [];
    for (let i = startPage; i <= endPage; i++) {
      const page = await this.pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as PdfTextItem[];
      const pageText = items.map((item) => item.str).join('');
      if (pageText.trim()) {
        parts.push(`--- 第 ${i} 页 ---\n${pageText}`);
      }
    }
    return parts.join('\n\n');
  }

  /**
   * 获取当前页按行分组的文本（用于段落上下文采集）。
   *
   * pdf.js textContent 的 item 含 transform [a,b,c,d,x,y]，y 是 PDF 坐标（从底部起）。
   * 按 y 坐标接近度分组为行，每行内按 x 坐标排序拼接。
   *
   * @returns 行数组，每行是 { y, text }，y 为 PDF 坐标（越大越靠上）
   */
  async getCurrentPageTextLines(): Promise<Array<{ y: number; text: string }>> {
    if (!this.pdfDoc) return [];
    const page = await this.pdfDoc.getPage(this.currentPage);
    const textContent = await page.getTextContent();
    const items = textContent.items as PdfTextItem[];

    // 按 y 坐标分组为行（阈值：行高估算）
    const lines: Array<{ y: number; items: PdfTextItem[] }> = [];
    const Y_THRESHOLD = 3; // y 坐标差小于此值视为同一行

    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const transform = item.transform as
        [number, number, number, number, number, number] | undefined;
      if (!transform) continue;
      const y = transform[5];
      const x = transform[4];

      const existing = lines.find((l) => Math.abs(l.y - y) < Y_THRESHOLD);
      if (existing) {
        existing.items.push({ ...item, _x: x } as PdfTextItem & { _x: number });
      } else {
        lines.push({ y, items: [{ ...item, _x: x } as PdfTextItem & { _x: number }] });
      }
    }

    // 每行内按 x 排序，拼接文本
    return lines
      .map((line) => {
        const sorted = [...line.items].sort(
          (a, b) => (a as unknown as { _x: number })._x - (b as unknown as { _x: number })._x,
        );
        const text = sorted
          .map((item) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return { y: line.y, text };
      })
      .filter((line) => line.text)
      .sort((a, b) => b.y - a.y); // PDF 坐标 y 越大越靠上，排序后从上到下
  }

  /** 销毁，释放资源 */
  destroy(): void {
    if (this.renderTask) {
      this.renderTask.cancel();
      this.renderTask = null;
    }
    if (this.pdfDoc) {
      (this.pdfDoc as unknown as { destroy: () => void }).destroy();
      this.pdfDoc = null;
    }
    this.container.innerHTML = '';
    this.pageWrappers.clear();
  }
}
