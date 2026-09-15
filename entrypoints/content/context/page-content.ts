/**
 * 整页正文提取（M2 T2.6，D4）。
 *
 * 使用 @mozilla/readability 提取网页正文。
 * 动态 import（避免 content script 体积过大），失败时降级标注 readabilityFailed。
 *
 * Readability 需要在 document 上下文中运行，所以在 content script 中调用。
 */

import type { ContextData } from '~/core/messages';

/** 整页正文提取结果 */
export interface PageContentResult {
  /** 提取的正文文本（失败时为空字符串） */
  text: string;
  /** 提取是否失败 */
  readabilityFailed: boolean;
  /** 页面标题（Readability 提取的标题，可能与 document.title 不同） */
  title?: string;
}

/**
 * 提取整页正文。
 *
 * 使用 @mozilla/readability 的 Readability 类解析 document。
 * 动态 import，失败时返回空文本 + readabilityFailed 标记。
 *
 * @param doc - 文档对象（默认使用当前 document）
 * @returns 正文提取结果
 */
export async function extractPageContent(doc: Document = document): Promise<PageContentResult> {
  try {
    // 动态 import @mozilla/readability
    const { Readability } = await import('@mozilla/readability');

    // Readability 需要克隆 document 以避免修改原页面
    const clonedDoc = doc.cloneNode(true) as Document;
    const reader = new Readability(clonedDoc);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return { text: '', readabilityFailed: true };
    }

    return {
      text: article.textContent.trim(),
      readabilityFailed: false,
      title: article.title || undefined,
    };
  } catch (err) {
    // 动态 import 失败或 Readability 解析失败
    console.warn('[Atmate] 整页正文提取失败:', err);
    return { text: '', readabilityFailed: true };
  }
}

/**
 * 构建完整的 ContextData（根据上下文档位采集）。
 *
 * @param selection - 当前 Selection
 * @param contextScope - 上下文档位（selection / nearby / page）
 * @returns ContextData
 */
export async function buildContextData(
  selection: Selection,
  contextScope: 'selection' | 'nearby' | 'page',
): Promise<ContextData> {
  const base: ContextData = {
    selection: selection.toString(),
  };

  if (contextScope === 'nearby') {
    // 动态 import 避免循环依赖
    const { getNearbyParagraphs } = await import('~/core/selection/context');
    const nearby = getNearbyParagraphs(selection);
    base.beforeParagraph = nearby.beforeParagraph;
    base.afterParagraph = nearby.afterParagraph;
  } else if (contextScope === 'page') {
    const pageResult = await extractPageContent();
    base.fullPage = pageResult.text;
    base.readabilityFailed = pageResult.readabilityFailed;
  }

  return base;
}
