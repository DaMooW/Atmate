// @vitest-environment jsdom
/**
 * core/selection/extract.ts L1 单测（M3 修复）。
 *
 * 覆盖：
 * - extractTextFromRange：单节点/多节点/起止偏移
 * - extractSelectionText：空选区/有效选区
 * - cleanText：零宽字符过滤
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { extractTextFromRange, extractSelectionText, cleanText } from '~/core/selection/extract';

describe('cleanText', () => {
  it('移除零宽空格', () => {
    expect(cleanText('hello\u200Bworld')).toBe('helloworld');
  });

  it('移除零宽连接符', () => {
    expect(cleanText('a\u200Db\u200Cc')).toBe('abc');
  });

  it('移除 BOM', () => {
    expect(cleanText('\uFEFFhello')).toBe('hello');
  });

  it('正常文本不受影响', () => {
    expect(cleanText('hello world')).toBe('hello world');
  });

  it('空字符串返回空', () => {
    expect(cleanText('')).toBe('');
  });
});

describe('extractTextFromRange', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('collapsed range 返回空', () => {
    const range = document.createRange();
    expect(extractTextFromRange(range)).toBe('');
  });

  it('单个文本节点完整选中', () => {
    container.textContent = 'hello world';
    const range = document.createRange();
    range.selectNodeContents(container);
    expect(extractTextFromRange(range)).toBe('hello world');
  });

  it('单个文本节点部分选中（startOffset/endOffset）', () => {
    container.textContent = 'hello world';
    const textNode = container.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    expect(extractTextFromRange(range)).toBe('hello');
  });

  it('跨多个文本节点', () => {
    const span1 = document.createElement('span');
    span1.textContent = 'hello ';
    const span2 = document.createElement('span');
    span2.textContent = 'world';
    container.appendChild(span1);
    container.appendChild(span2);

    const range = document.createRange();
    range.setStart(span1.firstChild!, 0);
    range.setEnd(span2.firstChild!, 5);
    expect(extractTextFromRange(range)).toBe('hello world');
  });

  it('过滤零宽字符', () => {
    container.textContent = 'hello\u200Bworld';
    const range = document.createRange();
    range.selectNodeContents(container);
    expect(extractTextFromRange(range)).toBe('helloworld');
  });
});

describe('extractSelectionText', () => {
  it('null selection 返回空', () => {
    expect(extractSelectionText(null)).toBe('');
  });

  it('rangeCount 为 0 返回空', () => {
    const selection = { rangeCount: 0 } as unknown as Selection;
    expect(extractSelectionText(selection)).toBe('');
  });

  it('有效选区返回文本', () => {
    const container = document.createElement('div');
    container.textContent = 'test text';
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = {
      rangeCount: 1,
      getRangeAt: () => range,
    } as unknown as Selection;

    expect(extractSelectionText(selection)).toBe('test text');
    document.body.removeChild(container);
  });
});
