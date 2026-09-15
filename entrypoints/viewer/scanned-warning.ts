/**
 * 扫描件警告条（M3 T3.1 D16）。
 *
 * viewer 页检测到无文字层页面时，顶部显示黄色警告条。
 * 支持：单页警告 / 全文扫描件常驻 / 手动关闭（本次会话不再提示）。
 */

export class ScannedWarning {
  private warningEl: HTMLElement;
  private textEl: HTMLElement;
  private closeEl: HTMLElement;
  private containerEl: HTMLElement;
  private dismissedForDoc = false;
  private isAllScanned = false;

  constructor() {
    this.warningEl = document.getElementById('scanned-warning')!;
    this.textEl = document.getElementById('scanned-text')!;
    this.closeEl = document.getElementById('scanned-close')!;
    this.containerEl = document.getElementById('viewer-container')!;

    this.closeEl.addEventListener('click', () => this.dismiss());
  }

  /**
   * 更新警告状态。
   * @param isScanned 当前页是否为扫描件
   * @param isAllScanned 是否全文为扫描件（连续多页无文字层）
   */
  update(isScanned: boolean, isAllScanned = false): void {
    this.isAllScanned = isAllScanned;

    if (this.dismissedForDoc) return;

    if (isScanned || isAllScanned) {
      this.textEl.textContent = isAllScanned
        ? '⚠️ 此文档为扫描件（无文字层），划词可能无法选中文字。M4 上线后可使用「附当前页为图片」发送给 AI。'
        : '⚠️ 此页可能是扫描件（无文字层），划词可能无法选中文字。M4 上线后可使用「附当前页为图片」发送给 AI。';
      this.show();
    } else {
      this.hide();
    }
  }

  /** 手动关闭（本次会话不再提示该文档） */
  dismiss(): void {
    this.dismissedForDoc = true;
    this.hide();
  }

  private show(): void {
    this.warningEl.classList.add('visible');
    this.containerEl.classList.add('warning-visible');
  }

  private hide(): void {
    this.warningEl.classList.remove('visible');
    this.containerEl.classList.remove('warning-visible');
  }

  /** 重置（加载新文档时调用） */
  reset(): void {
    this.dismissedForDoc = false;
    this.isAllScanned = false;
    this.hide();
  }
}
