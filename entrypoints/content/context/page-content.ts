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
 * 构建完整的 ContextData（采集所有档位的上下文数据，D23）。
 *
 * D23（2026-09-15）：原方案只采集当前档位的上下文，切换档位时数据缺失。
 * 改为创建卡片时一次性采集所有档位（containing-paragraph / nearby / page），
 * 切换档位时直接使用已有数据，无需异步请求。
 *
 * @param selection - 当前 Selection
 * @returns ContextData（含所有档位的数据）
 */
export async function buildContextData(selection: Selection): Promise<ContextData> {
  const base: ContextData = {
    selection: selection.toString(),
  };

  // 并行采集所有档位的上下文数据
  const [containingResult, nearbyResult, pageResult] = await Promise.all([
    // containing-paragraph 档（D20，默认）
    import('~/core/selection/context').then(({ getContainingParagraph }) =>
      getContainingParagraph(selection),
    ),
    // nearby 档（±相邻段落）
    import('~/core/selection/context').then(({ getNearbyParagraphs }) =>
      getNearbyParagraphs(selection),
    ),
    // page 档（整页正文，@mozilla/readability）
    extractPageContent(),
  ]);

  // containing-paragraph
  if (containingResult) {
    base.containingParagraph = containingResult;
  }

  // nearby
  if (nearbyResult.beforeParagraph) {
    base.beforeParagraph = nearbyResult.beforeParagraph;
  }
  if (nearbyResult.afterParagraph) {
    base.afterParagraph = nearbyResult.afterParagraph;
  }

  // page
  if (pageResult.text) {
    base.fullPage = pageResult.text;
  }
  base.readabilityFailed = pageResult.readabilityFailed;

  return base;
}
