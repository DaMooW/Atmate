import { describe, it, expect } from 'vitest';
import {
  buildMaterialPrompt,
  buildFinalUserPrompt,
  estimateTextTokens,
} from '../../components/chat/promptBuilder';
import type { MaterialCard } from '../../components/chat/materialTypes';

/**
 * L1 单测：Prompt 组装纯函数（M2 T2.4，D5/D21）。
 *
 * 覆盖：buildMaterialPrompt（单张素材片段）、buildFinalUserPrompt（用户需求+素材组装）、
 * containing-paragraph 档位、各上下文档位、来源信息、补充说明、空字段省略。
 */

describe('chat/promptBuilder · buildMaterialPrompt', () => {
  it('仅选区：只包含【用户选中的原文】', () => {
    const result = buildMaterialPrompt({
      selectedText: 'Hello world',
      contextScope: 'selection',
    });
    expect(result).toBe('【用户选中的原文】\nHello world');
    expect(result).not.toContain('【相关上下文');
    expect(result).not.toContain('【补充说明】');
  });

  it('containing-paragraph 档位：包含所在段落标记（D20）', () => {
    const result = buildMaterialPrompt({
      selectedText: 'documentation',
      contextScope: 'containing-paragraph',
      containingParagraph:
        'This domain is for use in documentation examples without needing permission.',
    });
    expect(result).toContain('【用户选中的原文】\ndocumentation');
    expect(result).toContain('【相关上下文（包含选中词的段落）】');
    expect(result).toContain('This domain is for use in documentation examples');
  });

  it('±相邻段落：包含相邻段落标记', () => {
    const result = buildMaterialPrompt({
      selectedText: '选中的文本',
      contextScope: 'nearby',
      previousParagraph: '前一段落',
      nextParagraph: '后一段落',
    });
    expect(result).toContain('【用户选中的原文】\n选中的文本');
    expect(result).toContain('【相关上下文（相邻段落）】');
    expect(result).toContain('前一段落');
    expect(result).toContain('后一段落');
  });

  it('±相邻段落：只有前段落时只包含前段落', () => {
    const result = buildMaterialPrompt({
      selectedText: '选中的文本',
      contextScope: 'nearby',
      previousParagraph: '前一段落',
    });
    expect(result).toContain('前一段落');
    expect(result).not.toContain('后一段落');
  });

  it('整页正文：包含整页正文标记', () => {
    const result = buildMaterialPrompt({
      selectedText: '选中的文本',
      contextScope: 'page',
      pageContent: '整页正文内容',
    });
    expect(result).toContain('【用户选中的原文】\n选中的文本');
    expect(result).toContain('【相关上下文（整页正文）】\n整页正文内容');
  });

  it('整页正文提取失败时标注提示', () => {
    const result = buildMaterialPrompt({
      selectedText: '选中的文本',
      contextScope: 'page',
      pageContent: '部分正文',
      readabilityFailed: true,
    });
    expect(result).toContain('整页正文提取可能不完整');
  });

  it('来源信息：包含页面标题和 URL', () => {
    const result = buildMaterialPrompt({
      selectedText: 'test',
      contextScope: 'selection',
      pageTitle: 'Example Domain',
      pageUrl: 'https://example.com/',
    });
    expect(result).toContain('【来源】');
    expect(result).toContain('Example Domain');
    expect(result).toContain('https://example.com/');
  });

  it('用户补充说明：包含【补充说明】标记', () => {
    const result = buildMaterialPrompt({
      selectedText: '选中的文本',
      contextScope: 'selection',
      userNote: '请翻译成英文',
    });
    expect(result).toContain('【补充说明】\n请翻译成英文');
  });

  it('用户补充说明为空或纯空白时不包含标记', () => {
    const result1 = buildMaterialPrompt({
      selectedText: 'test',
      contextScope: 'selection',
      userNote: '',
    });
    expect(result1).not.toContain('【补充说明】');

    const result2 = buildMaterialPrompt({
      selectedText: 'test',
      contextScope: 'selection',
      userNote: '   ',
    });
    expect(result2).not.toContain('【补充说明】');
  });

  it('组合场景：选区 + 所在段落 + 来源 + 补充说明，各部分用空行分隔', () => {
    const result = buildMaterialPrompt({
      selectedText: 'documentation',
      contextScope: 'containing-paragraph',
      containingParagraph: 'This domain is for use in documentation examples.',
      pageTitle: 'Example Domain',
      pageUrl: 'https://example.com/',
      userNote: '请翻译这个词',
    });
    const parts = result.split('\n\n');
    expect(parts).toHaveLength(4); // 选区 + 上下文 + 来源 + 补充说明
    expect(parts[0]).toBe('【用户选中的原文】\ndocumentation');
    expect(parts[1]).toContain('【相关上下文（包含选中词的段落）】');
    expect(parts[2]).toBe('【来源】\nExample Domain\nhttps://example.com/');
    expect(parts[3]).toBe('【补充说明】\n请翻译这个词');
  });

  it('nearby 档位但无上下文数据时，只包含选区', () => {
    const result = buildMaterialPrompt({
      selectedText: 'test',
      contextScope: 'nearby',
    });
    expect(result).toBe('【用户选中的原文】\ntest');
    expect(result).not.toContain('【相关上下文');
  });

  it('选中文本为空时不输出【用户选中的原文】', () => {
    const result = buildMaterialPrompt({
      selectedText: '',
      contextScope: 'selection',
      pageTitle: 'Test',
    });
    expect(result).not.toContain('【用户选中的原文】');
    expect(result).toContain('【来源】');
  });
});

describe('chat/promptBuilder · buildFinalUserPrompt', () => {
  const createCard = (overrides: Partial<MaterialCard> = {}): MaterialCard => ({
    id: 'card-1',
    text: 'documentation',
    title: 'Example Domain',
    url: 'https://example.com/',
    source: 'float-button',
    contextScope: 'containing-paragraph',
    contextData: {
      selection: 'documentation',
      containingParagraph:
        'This domain is for use in documentation examples without needing permission.',
    },
    userNote: '',
    adopted: true,
    createdAt: Date.now(),
    ...overrides,
  });

  it('用户输入 + 单张素材卡片：组装为【用户需求】+【素材】', () => {
    const card = createCard();
    const result = buildFinalUserPrompt('请翻译这个词', [card]);
    expect(result).toContain('【用户需求】\n请翻译这个词');
    expect(result).toContain('【素材】');
    expect(result).toContain('【用户选中的原文】\ndocumentation');
    expect(result).toContain('This domain is for use in documentation examples');
  });

  it('用户输入为空时：输出默认提示', () => {
    const card = createCard();
    const result = buildFinalUserPrompt('', [card]);
    expect(result).toContain('【用户需求】');
    expect(result).toContain('无额外说明，请基于以下素材进行处理');
  });

  it('多张素材卡片：依次输出【素材 1】【素材 2】', () => {
    const card1 = createCard({ id: 'card-1', text: 'word1' });
    const card2 = createCard({ id: 'card-2', text: 'word2' });
    const result = buildFinalUserPrompt('请总结', [card1, card2]);
    expect(result).toContain('【素材 1】');
    expect(result).toContain('【素材 2】');
    expect(result).toContain('word1');
    expect(result).toContain('word2');
  });

  it('无素材卡片时：只输出用户需求', () => {
    const result = buildFinalUserPrompt('你好', []);
    expect(result).toBe('【用户需求】\n你好');
    expect(result).not.toContain('【素材');
  });

  it('素材卡片包含补充说明时：补充说明出现在素材片段中', () => {
    const card = createCard({ userNote: '这是一个技术术语' });
    const result = buildFinalUserPrompt('请解释', [card]);
    expect(result).toContain('【补充说明】\n这是一个技术术语');
  });

  it('用户示例场景：划中 documentation + 输入"请翻译这个词"', () => {
    const card = createCard({
      text: 'documentation',
      contextScope: 'containing-paragraph',
      contextData: {
        selection: 'documentation',
        containingParagraph:
          'Example Domain\nThis domain is for use in documentation examples without needing permission. Avoid use in operations.\nhttps://iana.org/domains/example',
      },
      title: 'Example Domain',
      url: 'https://example.com/',
    });
    const result = buildFinalUserPrompt('请翻译这个词', [card]);
    // 验证核心结构
    expect(result).toContain('【用户需求】\n请翻译这个词');
    expect(result).toContain('【用户选中的原文】\ndocumentation');
    expect(result).toContain('【相关上下文（包含选中词的段落）】');
    expect(result).toContain('Example Domain');
    expect(result).toContain('This domain is for use in documentation examples');
    expect(result).toContain('【来源】');
    expect(result).toContain('https://example.com/');
  });
});

describe('chat/promptBuilder · estimateTextTokens', () => {
  it('空文本返回 0', () => {
    expect(estimateTextTokens('')).toBe(0);
  });

  it('英文文本按 4 字符/token 估算', () => {
    expect(estimateTextTokens('a'.repeat(40))).toBe(10);
  });

  it('中文文本按 1.5 字符/token 估算', () => {
    expect(estimateTextTokens('中'.repeat(15))).toBe(10);
  });

  it('中英文混合分别估算', () => {
    expect(estimateTextTokens('中'.repeat(15) + 'a'.repeat(40))).toBe(20);
  });
});
