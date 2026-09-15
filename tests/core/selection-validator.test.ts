// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { isValidSelection } from '../../core/selection/validator';

/**
 * 辅助函数：在指定元素内创建选区。
 * 模拟用户用鼠标选中元素的全部文本内容。
 */
function selectElementText(element: HTMLElement): Selection {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

/**
 * 辅助函数：创建一个空选区（rangeCount = 0）。
 */
function createEmptySelection(): Selection {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  return selection;
}

describe('core/selection/validator · isValidSelection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('null 选区 → 无效', () => {
    expect(isValidSelection(null)).toBe(false);
  });

  it('空选区（rangeCount=0）→ 无效', () => {
    const selection = createEmptySelection();
    expect(isValidSelection(selection)).toBe(false);
  });

  it('普通段落中的非空选区 → 有效', () => {
    const p = document.createElement('p');
    p.textContent = 'Hello, world!';
    document.body.appendChild(p);
    const selection = selectElementText(p);
    expect(isValidSelection(selection)).toBe(true);
  });

  it('div 中的非空选区 → 有效', () => {
    const div = document.createElement('div');
    div.textContent = 'Some text in a div';
    document.body.appendChild(div);
    const selection = selectElementText(div);
    expect(isValidSelection(selection)).toBe(true);
  });

  it('<input> 内的选区 → 无效', () => {
    const input = document.createElement('input');
    input.value = 'text in input';
    document.body.appendChild(input);
    // input 内的选区 anchorNode 是 input 元素本身
    const range = document.createRange();
    range.selectNodeContents(input);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('<textarea> 内的选区 → 无效', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'text in textarea';
    document.body.appendChild(textarea);
    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('<select> 内的选区 → 无效', () => {
    const select = document.createElement('select');
    const option = document.createElement('option');
    option.textContent = 'Option 1';
    select.appendChild(option);
    document.body.appendChild(select);
    const range = document.createRange();
    range.selectNodeContents(select);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('contenteditable="true" 元素内的选区 → 无效', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'editable content';
    document.body.appendChild(div);
    const selection = selectElementText(div);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('contenteditable=""（空字符串表示 true）元素内的选区 → 无效', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', '');
    div.textContent = 'editable content empty';
    document.body.appendChild(div);
    const selection = selectElementText(div);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('嵌套在 contenteditable 内的子元素选区 → 无效', () => {
    const outer = document.createElement('div');
    outer.setAttribute('contenteditable', 'true');
    const inner = document.createElement('span');
    inner.textContent = 'nested editable text';
    outer.appendChild(inner);
    document.body.appendChild(outer);
    const selection = selectElementText(inner);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('纯空白选区（只有空格）→ 无效', () => {
    const p = document.createElement('p');
    p.textContent = '   ';
    document.body.appendChild(p);
    const selection = selectElementText(p);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('纯空白选区（只有换行）→ 无效', () => {
    const p = document.createElement('p');
    p.textContent = '\n\n';
    document.body.appendChild(p);
    const selection = selectElementText(p);
    expect(isValidSelection(selection)).toBe(false);
  });

  it('列表项 <li> 中的选区 → 有效', () => {
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.textContent = 'list item text';
    ul.appendChild(li);
    document.body.appendChild(ul);
    const selection = selectElementText(li);
    expect(isValidSelection(selection)).toBe(true);
  });

  it('标题 <h1> 中的选区 → 有效', () => {
    const h1 = document.createElement('h1');
    h1.textContent = 'Heading text';
    document.body.appendChild(h1);
    const selection = selectElementText(h1);
    expect(isValidSelection(selection)).toBe(true);
  });
});
