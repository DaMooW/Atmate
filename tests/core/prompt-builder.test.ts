import { describe, it, expect } from 'vitest';
import { buildUserPrompt, estimateTextTokens } from '../../components/chat/promptBuilder';

/**
 * L1 单测：Prompt 组装纯函数（M2 T2.4，D5）。
 *
 * 覆盖：仅选区、±相邻段落、整页正文、用户补充说明、组合场景。
 */

describe('chat/promptBuilder · buildUserPrompt', () => {
  it('仅选区：只包含【用户选中的内容】', () => {
    const result = buildUserPrompt({
      selectedText: 'Hello world',
      contextScope: 'selection',
    });
    expect(result).toBe('【用户选中的内容】\nHello world');
    expect(result).not.toContain('【附带的上下文');
    expect(result).not.toContain('【用户补充说明】');
  });

  it('±相邻段落：包含前/后段落标记', () => {
    const result = buildUserPrompt({
      selectedText: '选中的文本',
      contextScope: 'nearby',
      previousParagraph: '前一段落',
      nextParagraph: '后一段落',
    });
    expect(result).toContain('【用户选中的内容】\n选中的文本');
    expect(result).toContain('【附带的上下文·前一段落】\n前一段落');
    expect(result).toContain('【附带的上下文·后一段落】\n后一段落');
  });

  it('±相邻段落：只有前段落时只包含前段落', () => {
    const result = buildUserPrompt({
      selectedText: '选中的文本',
      contextScope: 'nearby',
      previousParagraph: '前一段落',
    });
    expect(result).toContain('【附带的上下文·前一段落】');
    expect(result).not.toContain('【附带的上下文·后一段落】');
  });

  it('整页正文：包含整页正文标记', () => {
    const result = buildUserPrompt({
      selectedText: '选中的文本',
      contextScope: 'page',
      pageContent: '整页正文内容',
    });
    expect(result).toContain('【用户选中的内容】\n选中的文本');
    expect(result).toContain('【附带的上下文·整页正文】\n整页正文内容');
  });

  it('用户补充说明：包含【用户补充说明】标记', () => {
    const result = buildUserPrompt({
      selectedText: '选中的文本',
      contextScope: 'selection',
      userNote: '请翻译成英文',
    });
    expect(result).toContain('【用户补充说明】\n请翻译成英文');
  });

  it('用户补充说明为空或纯空白时不包含标记', () => {
    const result1 = buildUserPrompt({
      selectedText: 'test',
      contextScope: 'selection',
      userNote: '',
    });
    expect(result1).not.toContain('【用户补充说明】');

    const result2 = buildUserPrompt({
      selectedText: 'test',
      contextScope: 'selection',
      userNote: '   ',
    });
    expect(result2).not.toContain('【用户补充说明】');
  });

  it('组合场景：选区 + 相邻段落 + 补充说明，各部分用空行分隔', () => {
    const result = buildUserPrompt({
      selectedText: '选中的文本',
      contextScope: 'nearby',
      previousParagraph: '前一段落',
      nextParagraph: '后一段落',
      userNote: '请总结',
    });
    const parts = result.split('\n\n');
    expect(parts).toHaveLength(4); // 选区 + 前段落 + 后段落 + 补充说明
    expect(parts[0]).toBe('【用户选中的内容】\n选中的文本');
    expect(parts[1]).toBe('【附带的上下文·前一段落】\n前一段落');
    expect(parts[2]).toBe('【附带的上下文·后一段落】\n后一段落');
    expect(parts[3]).toBe('【用户补充说明】\n请总结');
  });

  it('nearby 档位但无上下文数据时，只包含选区', () => {
    const result = buildUserPrompt({
      selectedText: 'test',
      contextScope: 'nearby',
    });
    expect(result).toBe('【用户选中的内容】\ntest');
    expect(result).not.toContain('【附带的上下文');
  });
});

describe('chat/promptBuilder · estimateTextTokens', () => {
  it('空文本返回 0', () => {
    expect(estimateTextTokens('')).toBe(0);
  });

  it('英文文本按 4 字符/token 估算', () => {
    // 40 个英文字符 ≈ 10 tokens
    expect(estimateTextTokens('a'.repeat(40))).toBe(10);
  });

  it('中文文本按 1.5 字符/token 估算', () => {
    // 15 个中文字符 ≈ 10 tokens
    expect(estimateTextTokens('中'.repeat(15))).toBe(10);
  });

  it('中英文混合分别估算', () => {
    // 15 中文 + 40 英文 = 10 + 10 = 20 tokens
    expect(estimateTextTokens('中'.repeat(15) + 'a'.repeat(40))).toBe(20);
  });
});
