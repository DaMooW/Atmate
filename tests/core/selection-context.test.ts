// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { findNearestBlockAncestor, getNearbyParagraphs } from '../../core/selection/context';

/**
 * L1 单测：上下文采集纯函数（M2 T2.6，D13）。
 *
 * 覆盖：findNearestBlockAncestor、getNearbyParagraphs（前后段落）。
 */

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('core/selection/context · findNearestBlockAncestor', () => {
  it('找到最近的块级祖先（p 元素）', () => {
    document.body.innerHTML = '<div><p><span>text</span></p></div>';
    const span = document.querySelector('span')!;
    const result = findNearestBlockAncestor(span);
    expect(result?.tagName).toBe('P');
  });

  it('找到最近的块级祖先（div 元素）', () => {
    document.body.innerHTML = '<div><span>text</span></div>';
    const span = document.querySelector('span')!;
    const result = findNearestBlockAncestor(span);
    expect(result?.tagName).toBe('DIV');
  });

  it('元素本身就是块级元素时返回自身', () => {
    document.body.innerHTML = '<p>text</p>';
    const p = document.querySelector('p')!;
    const result = findNearestBlockAncestor(p);
    expect(result).toBe(p);
  });

  it('没有块级祖先时返回 null', () => {
    document.body.innerHTML = '<span><b>text</b></span>';
    const b = document.querySelector('b')!;
    const result = findNearestBlockAncestor(b);
    expect(result).toBeNull();
  });

  it('文本节点也能找到块级祖先', () => {
    document.body.innerHTML = '<p>text</p>';
    const p = document.querySelector('p')!;
    const textNode = p.firstChild!;
    const result = findNearestBlockAncestor(textNode);
    expect(result?.tagName).toBe('P');
  });
});

describe('core/selection/context · getNearbyParagraphs', () => {
  it('采集前后段落文本', () => {
    document.body.innerHTML = `
      <div>
        <p>前一段落</p>
        <p><span>选中的文本</span></p>
        <p>后一段落</p>
      </div>
    `;
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getNearbyParagraphs(selection);
    expect(result.beforeParagraph).toBe('前一段落');
    expect(result.afterParagraph).toBe('后一段落');
  });

  it('没有前一段落时 beforeParagraph 为空', () => {
    document.body.innerHTML = `
      <div>
        <p><span>选中的文本</span></p>
        <p>后一段落</p>
      </div>
    `;
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getNearbyParagraphs(selection);
    expect(result.beforeParagraph).toBe('');
    expect(result.afterParagraph).toBe('后一段落');
  });

  it('没有后一段落时 afterParagraph 为空', () => {
    document.body.innerHTML = `
      <div>
        <p>前一段落</p>
        <p><span>选中的文本</span></p>
      </div>
    `;
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getNearbyParagraphs(selection);
    expect(result.beforeParagraph).toBe('前一段落');
    expect(result.afterParagraph).toBe('');
  });

  it('跳过非块级同级元素（如 span）', () => {
    document.body.innerHTML = `
      <div>
        <p>前一段落</p>
        <span>非块级</span>
        <p><span>选中的文本</span></p>
        <span>非块级</span>
        <p>后一段落</p>
      </div>
    `;
    const span = document.querySelectorAll('span')[1]!; // 选中的文本 span
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getNearbyParagraphs(selection);
    expect(result.beforeParagraph).toBe('前一段落');
    expect(result.afterParagraph).toBe('后一段落');
  });

  it('空选区返回空字符串', () => {
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    const result = getNearbyParagraphs(selection);
    expect(result.beforeParagraph).toBe('');
    expect(result.afterParagraph).toBe('');
  });

  it('前后段落文本会被 trim', () => {
    document.body.innerHTML = `
      <div>
        <p>  前一段落  </p>
        <p><span>选中的文本</span></p>
        <p>  后一段落  </p>
      </div>
    `;
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getNearbyParagraphs(selection);
    expect(result.beforeParagraph).toBe('前一段落');
    expect(result.afterParagraph).toBe('后一段落');
  });
});
