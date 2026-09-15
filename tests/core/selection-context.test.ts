// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  findNearestBlockAncestor,
  getNearbyParagraphs,
  getContainingParagraph,
} from '../../core/selection/context';

/**
 * L1 单测：上下文采集纯函数（M2 T2.6，D13/D20）。
 *
 * 覆盖：findNearestBlockAncestor、getNearbyParagraphs（前后段落）、
 * getContainingParagraph（包含选中词的整段，D20 默认档位）。
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

describe('core/selection/context · getContainingParagraph（D20）', () => {
  it('采集包含选中文本的整段文本', () => {
    document.body.innerHTML = `
      <div>
        <p>前一段落</p>
        <p><span>This domain is for use in documentation examples.</span></p>
        <p>后一段落</p>
      </div>
    `;
    const span = document.querySelector('span')!;
    const range = document.createRange();
    // 只选中 "documentation" 这个词
    // "This domain is for use in " 长度 = 5+7+3+4+4+3 = 26
    // "documentation" 长度 = 13，结束位置 = 26+13 = 39
    const textNode = span.firstChild!;
    range.setStart(textNode, 26);
    range.setEnd(textNode, 39);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getContainingParagraph(selection);
    expect(result).toBe('This domain is for use in documentation examples.');
    expect(selection.toString()).toBe('documentation');
  });

  it('选区在 div 中时返回 div 的完整文本', () => {
    document.body.innerHTML = `
      <div>
        <span>选中的文本</span>
        <span>其他内容</span>
      </div>
    `;
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getContainingParagraph(selection);
    expect(result).toBe('选中的文本 其他内容');
  });

  it('没有块级祖先时返回选区文本本身', () => {
    document.body.innerHTML = '<span><b>选中的文本</b></span>';
    const b = document.querySelector('b')!;
    const range = document.createRange();
    range.selectNodeContents(b);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getContainingParagraph(selection);
    expect(result).toBe('选中的文本');
  });

  it('空选区返回空字符串', () => {
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    const result = getContainingParagraph(selection);
    expect(result).toBe('');
  });

  it('返回的文本会被 trim', () => {
    document.body.innerHTML = '<p>  包含空格的段落  </p>';
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getContainingParagraph(selection);
    expect(result).toBe('包含空格的段落');
  });

  it('选区跨越多个元素时返回 commonAncestor 的块级祖先文本', () => {
    document.body.innerHTML = `
      <p>
        <span>第一部分</span>
        <span>第二部分</span>
      </p>
    `;
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getContainingParagraph(selection);
    expect(result).toBe('第一部分 第二部分');
  });
});
