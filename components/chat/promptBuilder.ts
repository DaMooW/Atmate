/**
 * Prompt 组装纯函数（M2 T2.4，D5）。
 *
 * 按 D5 决策的格式组装用户输入，明确标示选区与附带上下文的分界：
 * 【用户选中的内容】/【附带的上下文·前一段落】/【附带的上下文·后一段落】/【用户补充说明】
 *
 * 纯函数，无副作用，可在 L1 单测中覆盖。
 */

import type { ContextScope } from '~/core/types';

export interface PromptBuildInput {
  /** 用户选中的文本 */
  selectedText: string;
  /** 上下文档位 */
  contextScope: ContextScope;
  /** 前一段落（contextScope='nearby' 时使用） */
  previousParagraph?: string;
  /** 后一段落（contextScope='nearby' 时使用） */
  nextParagraph?: string;
  /** 整页正文（contextScope='page' 时使用） */
  pageContent?: string;
  /** 用户补充说明 */
  userNote?: string;
}

/**
 * 组装最终发送给 AI 的用户消息文本。
 *
 * @param input - 组装输入
 * @returns 组装后的完整文本
 */
export function buildUserPrompt(input: PromptBuildInput): string {
  const parts: string[] = [];

  // 1. 用户选中的内容（始终包含）
  parts.push(`【用户选中的内容】\n${input.selectedText}`);

  // 2. 附带的上下文（根据档位）
  if (input.contextScope === 'nearby') {
    if (input.previousParagraph) {
      parts.push(`【附带的上下文·前一段落】\n${input.previousParagraph}`);
    }
    if (input.nextParagraph) {
      parts.push(`【附带的上下文·后一段落】\n${input.nextParagraph}`);
    }
  } else if (input.contextScope === 'page') {
    if (input.pageContent) {
      parts.push(`【附带的上下文·整页正文】\n${input.pageContent}`);
    }
  }
  // contextScope='selection' 时不附带上下文

  // 3. 用户补充说明
  if (input.userNote && input.userNote.trim()) {
    parts.push(`【用户补充说明】\n${input.userNote.trim()}`);
  }

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
