/**
 * Prompt 组装纯函数（M2 T2.4，D5/D21）。
 *
 * 按 D21 决策的格式组装用户输入与素材卡片：
 * 【用户需求】/【用户选中的原文】/【相关上下文】/【来源】/【补充说明】
 *
 * 设计原则（D21）：
 * - 结构化分段，LLM 易于解析各部分边界
 * - 选中原文与上下文明确区分，避免混淆
 * - 来源信息完整（标题+URL），便于溯源
 * - 空字段省略，不输出无意义的空标签
 * - 多卡片时按创建时间排序，依次输出
 *
 * 纯函数，无副作用，可在 L1 单测中覆盖。
 */

import type { ContextScope } from '~/core/types';
import type { MaterialCard } from './materialTypes';

export interface PromptBuildInput {
  /** 用户选中的文本 */
  selectedText: string;
  /** 上下文档位 */
  contextScope: ContextScope;
  /** 包含选中词的整段（contextScope='containing-paragraph' 时使用，D20） */
  containingParagraph?: string;
  /** 前一段落（contextScope='nearby' 时使用） */
  previousParagraph?: string;
  /** 后一段落（contextScope='nearby' 时使用） */
  nextParagraph?: string;
  /** 整页正文（contextScope='page' 时使用） */
  pageContent?: string;
  /** readability 提取失败标记（page 档） */
  readabilityFailed?: boolean;
  /** 页面标题（来源信息） */
  pageTitle?: string;
  /** 页面 URL（来源信息） */
  pageUrl?: string;
  /** 用户补充说明 */
  userNote?: string;
}

/**
 * 组装单张素材卡片的 prompt 片段（不含【用户需求】）。
 *
 * @param input - 组装输入
 * @returns 组装后的素材片段文本
 */
export function buildMaterialPrompt(input: PromptBuildInput): string {
  const parts: string[] = [];

  // 1. 用户选中的原文（始终包含）
  if (input.selectedText && input.selectedText.trim()) {
    parts.push(`【用户选中的原文】\n${input.selectedText.trim()}`);
  }

  // 2. 相关上下文（根据档位）
  const contextParts: string[] = [];

  if (input.contextScope === 'containing-paragraph') {
    if (input.containingParagraph && input.containingParagraph.trim()) {
      contextParts.push(input.containingParagraph.trim());
    }
  } else if (input.contextScope === 'nearby') {
    if (input.previousParagraph && input.previousParagraph.trim()) {
      contextParts.push(input.previousParagraph.trim());
    }
    if (input.nextParagraph && input.nextParagraph.trim()) {
      contextParts.push(input.nextParagraph.trim());
    }
  } else if (input.contextScope === 'page') {
    if (input.pageContent && input.pageContent.trim()) {
      contextParts.push(input.pageContent.trim());
      if (input.readabilityFailed) {
        contextParts.push('（注：整页正文提取可能不完整）');
      }
    }
  }
  // contextScope='selection' 时不附带上下文

  if (contextParts.length > 0) {
    const contextLabel =
      input.contextScope === 'containing-paragraph'
        ? '相关上下文（包含选中词的段落）'
        : input.contextScope === 'nearby'
          ? '相关上下文（相邻段落）'
          : input.contextScope === 'page'
            ? '相关上下文（整页正文）'
            : '相关上下文';
    parts.push(`【${contextLabel}】\n${contextParts.join('\n\n')}`);
  }

  // 3. 来源信息
  if (input.pageTitle || input.pageUrl) {
    const sourceParts: string[] = [];
    if (input.pageTitle) sourceParts.push(input.pageTitle);
    if (input.pageUrl) sourceParts.push(input.pageUrl);
    parts.push(`【来源】\n${sourceParts.join('\n')}`);
  }

  // 4. 用户补充说明
  if (input.userNote && input.userNote.trim()) {
    parts.push(`【补充说明】\n${input.userNote.trim()}`);
  }

  return parts.join('\n\n');
}

/**
 * 组装最终发送给 AI 的完整用户消息（用户需求 + 已采用的素材卡片）。
 *
 * D19：采用≠填入输入框，发送时自动组装。
 * 格式：
 *   【用户需求】
 *   {用户输入的内容}
 *
 *   【素材 1】
 *   {素材1的 prompt 片段}
 *
 *   【素材 2】
 *   {素材2的 prompt 片段}
 *
 * @param userInput - 用户在输入框中输入的内容
 * @param adoptedCards - 已采用的素材卡片列表（按创建时间排序）
 * @returns 组装后的完整用户消息文本
 */
export function buildFinalUserPrompt(userInput: string, adoptedCards: MaterialCard[]): string {
  const parts: string[] = [];

  // 1. 用户需求（始终包含，即使为空也输出标签让 LLM 知道用户没有额外需求）
  const trimmedInput = userInput.trim();
  if (trimmedInput) {
    parts.push(`【用户需求】\n${trimmedInput}`);
  } else {
    parts.push('【用户需求】\n（无额外说明，请基于以下素材进行处理）');
  }

  // 2. 已采用的素材卡片
  adoptedCards.forEach((card, index) => {
    const materialPrompt = buildMaterialPrompt({
      selectedText: card.text,
      contextScope: card.contextScope,
      containingParagraph: card.contextData?.containingParagraph,
      previousParagraph: card.contextData?.beforeParagraph,
      nextParagraph: card.contextData?.afterParagraph,
      pageContent: card.contextData?.fullPage,
      readabilityFailed: card.contextData?.readabilityFailed,
      pageTitle: card.title,
      pageUrl: card.url,
      userNote: card.userNote,
    });

    if (materialPrompt) {
      const label = adoptedCards.length > 1 ? `素材 ${index + 1}` : '素材';
      parts.push(`【${label}】\n${materialPrompt}`);
    }
  });

  return parts.join('\n\n');
}

/**
 * 估算素材卡片的 token 数（粗略估算，用于 token 预览）。
 * 按 1 个 token ≈ 4 个英文字符 或 1.5 个中文字符 估算。
 *
 * @param text - 文本
 * @returns 估算的 token 数
 */
export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  // 简单估算：中文字符按 1 token/1.5 字符，英文按 1 token/4 字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}
